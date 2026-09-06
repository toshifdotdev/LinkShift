import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import razorpay from "../../config/razorpay";
import crypto from 'crypto';
import { config } from "../../config/env";
import { ChangePlanInput, SubscriptionInput, SubscriptionVerificationInput } from "./billing.validation";
import { Prisma } from "../../generated/prisma/client";


export const getPlansService = async(currency : "INR" | "USD") => {
    const result = await prisma.plan.findMany({
        where : {
            name : {
                in : [
                    "STARTER",
                    "CREATOR",
                    "PRO"
                ]
            }
        },
        orderBy: {
            monthlyPrice: "asc"
        }
    })

    return result.map(plan => ({
        name : plan.name,
        monthlyPrice : 
            currency === "INR"
                ? plan.monthlyPrice 
                : plan.usdMonthlyPrice,
        yearlyPrice : currency === "INR"
                ? plan.yearlyPrice
                : plan.usdYearlyPrice,

        currency,
        maxLinks: plan.maxLinks,
        maxQrPerMonth: plan.maxQrPerMonth,
        maxDomains: plan.maxDomains,
        maxRedirectsPerMonth: plan.maxRedirectsPerMonth,
        analyticsDays: plan.analyticsDays,
        maxCustomSlugsPerMonth : plan.maxCustomSlugsPerMonth,
        maxDestinationChangesPerMonth: plan.maxDestinationChangesPerMonth
    }));

}



export const razorpayWebhookService = async(signature : string, data : Buffer, eventId: string) => {
    
    
    
    if (!config.razorpayWebhookSecret) {
        throw new AppError("Razorpay webhook secret is not configured", 500);
    }

    const expectedSignature = crypto.createHmac("sha256", config.razorpayWebhookSecret)
                              .update(data).digest("hex");

    
    
    if (signature.length !== expectedSignature.length) {
        throw new AppError("Invalid webhook signature", 400);
    }

    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!isValid) {
        throw new AppError("Invalid webhook signature", 400);
    }

    const payload = JSON.parse(data.toString("utf8"));

    
    try {
        await prisma.webhookEvent.create({
            data: { eventId, eventType: payload.event, status: "PENDING" }
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            // Row exists, continue to claim
        } else {
            throw e;
        }
    }

    
    const STALE_MINUTES = 5;
    const claimed = await prisma.$executeRaw`
        UPDATE "WebhookEvent" 
        SET status = 'PROCESSING', "claimedAt" = NOW()
        WHERE "eventId" = ${eventId} 
          AND (
            status IN ('PENDING', 'FAILED') 
            OR (status = 'PROCESSING' AND "claimedAt" < NOW() - (${STALE_MINUTES} * INTERVAL '1 minute'))
          )
    `;

    if (claimed === 0) {
        const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
        if (existing?.status === "PROCESSED") {
            return { event: payload.event, processed: true, alreadyProcessed: true };
        }
        
        throw new AppError("Webhook event already being processed", 409);
    }

    
    try {
        const webhookResult = await processWebhookEvent(payload);
        
        
        await prisma.webhookEvent.update({
            where: { eventId },
            data: { status: "PROCESSED", processedAt: new Date(), claimedAt: null }
        });
        return { event: payload.event, processed: true, ...(webhookResult ?? {}) };
    } catch (err) {
        
        await prisma.webhookEvent.update({
            where: { eventId },
            data: { status: "FAILED", claimedAt: null }
        });
        throw err;
    }
};

type WebhookProcessResult = {
    matched: boolean;
    ignored?: "terminal" | "stale" | "unknown" | "duplicate";
    warning?: string;
};



export const TERMINAL_SUBSCRIPTION_STATUSES = ["CANCELLED", "COMPLETED", "EXPIRED"] as const;

export const isTerminalSubscriptionStatus = (status: string) =>
    (TERMINAL_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);



export const mapProviderPlan = async (planId: string | undefined | null) => {
    if (!planId) {
        return null;
    }

    return prisma.plan.findFirst({
        where: {
            OR: [
                { razorpayMonthlyPlanId: planId },
                { razorpayYearlyPlanId: planId },
                { razorpayUsdMonthlyPlanId: planId },
                { razorpayUsdYearlyPlanId: planId },
            ],
        },
    });
};



export const cycleFromPlanMatch = (
    plan: NonNullable<Awaited<ReturnType<typeof mapProviderPlan>>>,
    planId: string
): "MONTHLY" | "YEARLY" =>
    plan.razorpayMonthlyPlanId === planId || plan.razorpayUsdMonthlyPlanId === planId
        ? "MONTHLY"
        : "YEARLY";

export const findLocalSubscription = async (providerSubscriptionId: string) =>
    prisma.subscription.findUnique({
        where: {
            provider_providerSubscriptionId: {
                provider: "RAZORPAY",
                providerSubscriptionId,
            },
        },
    });

export const epochToDate = (seconds: number | undefined | null) =>
    seconds ? new Date(seconds * 1000) : undefined;

const processWebhookEvent = async (payload: any): Promise<WebhookProcessResult | void> => {
    switch (payload.event) {
        case "payment.captured": {
            
            
            const payment = payload.payload.payment.entity;

            
            
            const localSubscription = await findLocalSubscription(payment.subscription_id ?? "");

            if (!localSubscription) {
                console.warn(`[webhook] payment.captured: unresolvable subscription for payment ${payment.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            const existingPayment = await prisma.payment.findUnique({
                where: {
                    provider_providerOrderId: {
                        provider: "RAZORPAY",
                        providerOrderId: payment.order_id,
                    },
                },
            });

            if (existingPayment?.status === "SUCCESS") {
                break;
            }

            if (!existingPayment) {
                await prisma.payment.create({
                    data: {
                        planId: localSubscription.planId,
                        userId: localSubscription.userId,
                        subscriptionId: localSubscription.id,

                        provider: "RAZORPAY",

                        providerOrderId: payment.order_id,
                        providerPaymentId: payment.id,

                        billingCycle: localSubscription.billingCycle,

                        amount: payment.amount,
                        currency: payment.currency,

                        status: "SUCCESS",

                        
                        category: "SUBSCRIPTION",
                    },
                });
            } else {
                await prisma.payment.update({
                    where: { id: existingPayment.id },
                    data: {
                        providerPaymentId: payment.id,
                        status: "SUCCESS",
                        
                        
                        category: "SUBSCRIPTION",
                    },
                });
            }

            break;
        }

        case "payment.failed": {
            
            
            
            const payment = payload.payload.payment.entity;

            const existingPayment = await prisma.payment.findUnique({
                where: {
                    provider_providerOrderId: {
                        provider: "RAZORPAY",
                        providerOrderId: payment.order_id,
                    },
                },
            });

            if (!existingPayment) {
                console.warn(`[webhook] payment.failed: no local payment for order ${payment.order_id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            if (existingPayment.status === "SUCCESS") {
                break;
            }

            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: {
                    providerPaymentId: payment.id,
                    status: "FAILED",
                },
            });

            break;
        }

        case "invoice.paid": {
            
            
            
            
            
            
            const invoice = payload.payload.invoice.entity;

            if (!invoice.subscription_id) {
                console.warn(`[webhook] invoice.paid: invoice ${invoice.id} has no subscription link; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            const localSubscription = await findLocalSubscription(invoice.subscription_id);

            if (!localSubscription) {
                console.warn(`[webhook] invoice.paid: unknown subscription ${invoice.subscription_id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            
            if (invoice.payment_id) {
                const byPaymentId = await prisma.payment.findUnique({
                    where: {
                        provider_providerPaymentId: {
                            provider: "RAZORPAY",
                            providerPaymentId: invoice.payment_id,
                        },
                    },
                });

                if (byPaymentId) {
                    return { matched: true, ignored: "duplicate" };
                }
            }

            
            if (invoice.order_id) {
                const byOrderId = await prisma.payment.findUnique({
                    where: {
                        provider_providerOrderId: {
                            provider: "RAZORPAY",
                            providerOrderId: invoice.order_id,
                        },
                    },
                });

                if (byOrderId) {
                    return { matched: true, ignored: "duplicate" };
                }
            }

            const invoiceAmount =
                typeof invoice.amount === "number"
                    ? invoice.amount
                    : Number.parseInt(String(invoice.amount ?? ""), 10);

            if (!invoice.order_id || !Number.isFinite(invoiceAmount)) {
                console.warn(`[webhook] invoice.paid: unusable payload on invoice ${invoice.id} (order_id/amount); acknowledged without ledger entry`);
                return { matched: true, warning: "unusable_invoice_payload" };
            }

            await prisma.payment.create({
                data: {
                    planId: localSubscription.planId,
                    userId: localSubscription.userId,
                    subscriptionId: localSubscription.id,

                    provider: "RAZORPAY",

                    providerOrderId: invoice.order_id,
                    providerPaymentId: invoice.payment_id ?? null,

                    billingCycle: localSubscription.billingCycle,

                    amount: invoiceAmount,
                    currency: invoice.currency,

                    status: "SUCCESS",

                    
                    category: "PRORATION",
                },
            });

            break;
        }

        case "refund.processed": {
            
            
            
            
            
            const refund = payload.payload.refund.entity;

            const existingPayment = refund.payment_id
                ? await prisma.payment.findUnique({
                      where: {
                          provider_providerPaymentId: {
                              provider: "RAZORPAY",
                              providerPaymentId: refund.payment_id,
                          },
                      },
                  })
                : null;

            if (!existingPayment) {
                console.error(`[webhook] refund.processed: no local payment for '${refund.payment_id ?? "unknown"}'; acknowledged without mutation`);
                return { matched: false, ignored: "unknown" };
            }

            const refundAmount =
                typeof refund.amount === "number"
                    ? refund.amount
                    : Number.parseInt(String(refund.amount ?? ""), 10);

            if (!Number.isFinite(refundAmount) || !refund.id) {
                console.warn(`[webhook] refund.processed: unusable payload on refund ${refund.id}; acknowledged`);
                return { matched: true, warning: "unusable_refund_payload" };
            }

            if (refund.currency && refund.currency !== existingPayment.currency) {
                
                console.warn(`[webhook] refund.processed: refund currency ${refund.currency} differs from payment currency ${existingPayment.currency} on ${existingPayment.id}`);
            }

            let duplicate = false;

            await prisma.$transaction(async (tx) => {
                try {
                    await tx.refund.create({
                        data: {
                            paymentId: existingPayment.id,
                            provider: "RAZORPAY",
                            providerRefundId: refund.id,
                            amount: refundAmount,
                            currency: refund.currency,
                        },
                    });
                } catch (err) {
                    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
                        throw err;
                    }
                    
                    
                    duplicate = true;
                }

                
                
                
                const totals = await tx.refund.aggregate({
                    _sum: { amount: true },
                    where: { paymentId: existingPayment.id },
                });
                const cumulativeRefundedAmount = totals._sum.amount ?? 0;

                if (cumulativeRefundedAmount >= existingPayment.amount) {
                    if (cumulativeRefundedAmount > existingPayment.amount) {
                        console.warn(`[webhook] refund.processed: OVER-REFUND anomaly on payment ${existingPayment.id} (refunded ${cumulativeRefundedAmount}/${existingPayment.amount}); marking REFUNDED`);
                    }

                    if (!duplicate) {
                        await tx.payment.update({
                            where: { id: existingPayment.id },
                            data: {
                                status: "REFUNDED",
                                providerRefundId: refund.id,
                            },
                        });
                    }
                }
                // else: cumulative < amount => Payment intentionally stays SUCCESS.
            });

            if (duplicate) {
                console.warn(`[webhook] refund.processed: refund ${refund.id} already ledgered; acknowledged without double-count`);
                return { matched: true, ignored: "duplicate" };
            }

            break;
        }

        case "subscription.authenticated": { // 1st
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.authenticated: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    providerCustomerId: subscription.customer_id ?? existingSubscription.providerCustomerId,
                },
            });

            break;
        }

        case "subscription.activated": { 
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.activated: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }
            if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                console.warn(`[webhook] subscription.activated: ignoring terminal subscription (${existingSubscription.status})`);
                return { matched: true, ignored: "terminal" };
            }

            
            
            try {
                await prisma.subscription.update({
                    where: { id: existingSubscription.id },
                    data: {
                        status: "ACTIVE",
                        providerCustomerId: subscription.customer_id ?? existingSubscription.providerCustomerId,
                        startedAt: epochToDate(subscription.start_at) ?? existingSubscription.startedAt,
                        currentPeriodStart: epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,
                        currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
                    },
                });
            } catch (err) {
                
                
                console.error(`[webhook] subscription.activated: UNIQUE violation while activating ${existingSubscription.id}`, err);
                throw err;
            }

            break;
        }

            case "subscription.charged": {
                
                const subscription = payload.payload.subscription.entity;

                const payment = payload.payload.payment.entity;

                const existingSubscription = await findLocalSubscription(subscription.id);

                if (!existingSubscription) {
                    console.warn(`[webhook] subscription.charged: unknown subscription ${subscription.id}; acknowledged`);
                    return { matched: false, ignored: "unknown" };
                }
                if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                    return { matched: true, ignored: "terminal" };
                }

                let warning: string | undefined;
                const mappedPlan = await mapProviderPlan(subscription.plan_id);

                if (!mappedPlan) {
                    warning = "unmapped_plan";
                    console.error(`[webhook] subscription.charged: unmapped Razorpay plan '${subscription.plan_id}' on ${existingSubscription.id}; lifecycle applied without plan change`);
                }

                
                
                
                
                
                
                type PlanCommit = { planId: string; billingCycle: "MONTHLY" | "YEARLY"; alert: boolean };
                let planCommit: PlanCommit | null = null;

                if (
                    mappedPlan &&
                    mappedPlan.id !== existingSubscription.planId &&
                    subscription.has_scheduled_changes !== true
                ) {
                    const incomingStartMs = subscription.current_start ? subscription.current_start * 1000 : 0;
                    const newerCycle =
                        existingSubscription.currentPeriodEnd === null ||
                        incomingStartMs > existingSubscription.currentPeriodEnd.getTime();

                    if (existingSubscription.pendingPlanId === mappedPlan.id) {
                        planCommit = {
                            planId: mappedPlan.id,
                            billingCycle: cycleFromPlanMatch(mappedPlan, subscription.plan_id),
                            alert: false,
                        };
                    } else if (newerCycle) {
                        planCommit = {
                            planId: mappedPlan.id,
                            billingCycle: cycleFromPlanMatch(mappedPlan, subscription.plan_id),
                            alert: true,
                        };
                    } else {
                        console.info(`[webhook] subscription.charged: stale charge for ${existingSubscription.id} (plan '${subscription.plan_id}' older than local state); lifecycle only`);
                    }
                }

                if (planCommit?.alert) {
                    console.error(`[webhook] subscription.charged: PROVIDER-SIDE PLAN CHANGE without local schedule on ${existingSubscription.id}: '${existingSubscription.planId}' -> '${planCommit.planId}'. Mirrored so entitlement stays consistent with the charged amount.`);
                }

                await prisma.$transaction(async (tx) => {

                    
                    let existingPayment =
                        await tx.payment.findUnique({
                            where: {
                                provider_providerPaymentId: {
                                    provider: "RAZORPAY",
                                    providerPaymentId: payment.id,
                                },
                            },
                        });

                    if (!existingPayment) {
                        existingPayment =
                            await tx.payment.findUnique({
                                where: {
                                    provider_providerOrderId: {
                                        provider: "RAZORPAY",
                                        providerOrderId: payment.order_id,
                                    },
                                },
                            });
                    }

                    const paymentRecord = {
                        planId: planCommit ? planCommit.planId : existingSubscription.planId,
                        userId: existingSubscription.userId,
                        subscriptionId: existingSubscription.id,

                        provider: "RAZORPAY" as const,

                        providerOrderId: payment.order_id,
                        providerPaymentId: payment.id,

                        billingCycle: existingSubscription.billingCycle,

                        amount: payment.amount,
                        currency: payment.currency,

                        status: "SUCCESS" as const,

                        
                        category: "SUBSCRIPTION" as const,
                    };

                    if (!existingPayment) {
                        await tx.payment.create({ data: paymentRecord });
                    } else {
                        if (
                            existingPayment.amount !== payment.amount ||
                            existingPayment.currency !== payment.currency
                        ) {
                            console.warn(`[webhook] subscription.charged: amount/currency drift on payment ${existingPayment.id}`);
                        }
                        await tx.payment.update({
                            where: { id: existingPayment.id },
                            data: {
                                providerPaymentId: payment.id,
                                status: "SUCCESS",
                                
                                
                                category: "SUBSCRIPTION",
                            },
                        });
                    }

                    await tx.subscription.update({
                        where: {
                            id: existingSubscription.id,
                        },

                        data: {
                            status: "ACTIVE",

                            currentPeriodStart: epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,

                            currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,

                            ...(planCommit
                                ? {
                                      planId: planCommit.planId,
                                      billingCycle: planCommit.billingCycle,
                                      pendingPlanId: null,
                                      changeScheduledAt: null,
                                  }
                                : {}),
                        },
                    });
                });

                if (payment.currency !== existingSubscription.currency) {
                    console.warn(`[webhook] subscription.charged: charged currency ${payment.currency} differs from subscription currency ${existingSubscription.currency} on ${existingSubscription.id}`);
                }

                break;
            }

        case "subscription.pending": {
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.pending: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }
            if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                return { matched: true, ignored: "terminal" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    status: "PAYMENT_RETRY",
                    currentPeriodStart: epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,
                    currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
                },
            });

            break;
        }

        case "subscription.halted": {
            
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.halted: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }
            if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                return { matched: true, ignored: "terminal" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: { status: "HALTED" },
            });

            break;
        }

        case "subscription.cancelled": {
            
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.cancelled: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    status: "CANCELLED",
                    cancelAtPeriodEnd: false,
                    cancelledAt: epochToDate(subscription.ended_at) ?? new Date(),
                    currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
                    pendingPlanId: null,
                    changeScheduledAt: null,
                },
            });

            break;
        }

        case "subscription.paused": {
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.paused: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }
            if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                return { matched: true, ignored: "terminal" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: { status: "PAUSED" },
            });

            break;
        }

        case "subscription.resumed": {
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.resumed: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }
            if (isTerminalSubscriptionStatus(existingSubscription.status)) {
                return { matched: true, ignored: "terminal" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    status: "ACTIVE",
                    currentPeriodStart: epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,
                    currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
                },
            });

            break;
        }

        case "subscription.completed": {
            
            
            const subscription = payload.payload.subscription.entity;
            const existingSubscription = await findLocalSubscription(subscription.id);

            if (!existingSubscription) {
                console.warn(`[webhook] subscription.completed: unknown subscription ${subscription.id}; acknowledged`);
                return { matched: false, ignored: "unknown" };
            }

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    status: "COMPLETED",
                    currentPeriodStart: epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,
                    currentPeriodEnd: epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
                    pendingPlanId: null,
                    changeScheduledAt: null,
                },
            });

            break;
        }

    case "subscription.updated": {
        
        
        const subscription = payload.payload.subscription.entity;

        const existingSubscription = await findLocalSubscription(subscription.id);

        if (!existingSubscription) {
            console.warn(`[webhook] subscription.updated: unknown subscription ${subscription.id}; acknowledged`);
            return { matched: false, ignored: "unknown" };
        }
        if (isTerminalSubscriptionStatus(existingSubscription.status)) {
            return { matched: true, ignored: "terminal" };
        }

        const mappedPlan = await mapProviderPlan(subscription.plan_id);

        if (!mappedPlan) {
            console.error(`[webhook] subscription.updated: unmapped Razorpay plan '${subscription.plan_id}' on ${existingSubscription.id}; no mutation applied`);
            return { matched: true, warning: "unmapped_plan" };
        }

        const billingCycle = cycleFromPlanMatch(mappedPlan, subscription.plan_id);
        const scheduledWindowOpen = subscription.has_scheduled_changes === true;
        const scheduledAt =
            typeof subscription.change_scheduled_at === "number"
                ? new Date(subscription.change_scheduled_at * 1000)
                : (existingSubscription.changeScheduledAt ?? existingSubscription.currentPeriodEnd ?? new Date());

        const periodFields = {
            currentPeriodStart:
                epochToDate(subscription.current_start) ?? existingSubscription.currentPeriodStart,

            currentPeriodEnd:
                epochToDate(subscription.current_end) ?? existingSubscription.currentPeriodEnd,
        };

        if (!scheduledWindowOpen) {
            
            
            
            
            const planChanged = mappedPlan.id !== existingSubscription.planId;

            await prisma.subscription.update({
                where: { id: existingSubscription.id },
                data: {
                    ...(planChanged ? { planId: mappedPlan.id } : {}),
                    billingCycle,
                    pendingPlanId: null,
                    changeScheduledAt: null,
                    ...periodFields,
                },
            });

            break;
        }

        
        
        
        
        
        const conflictingPending =
            existingSubscription.pendingPlanId !== null &&
            existingSubscription.pendingPlanId !== mappedPlan.id &&
            mappedPlan.id !== existingSubscription.planId;

        if (conflictingPending) {
            console.warn(`[webhook] subscription.updated: provider schedule '${subscription.plan_id}' overrides locally pending plan on ${existingSubscription.id}`);
        }

        const desiredPendingPlanId =
            mappedPlan.id === existingSubscription.planId
                ? existingSubscription.pendingPlanId
                : mappedPlan.id;

        await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
                pendingPlanId: desiredPendingPlanId,
                changeScheduledAt: scheduledAt,
                ...periodFields,
            },
        });

        break;
    }

        default: 
            console.log("Unhandled Razorpay webhook event:", payload.event);
    }
}

export const subscriptionService = async(userId : string, plan : SubscriptionInput["plan"], billingCycle : SubscriptionInput["billingCycle"], currency : "INR" | "USD") => {
    const existingSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                in: [...LIVE_SUBSCRIPTION_STATUSES],
            },
        },
    });


    if (existingSubscription) {
        if (existingSubscription.status === "HALTED") {
            throw new AppError(
                "Your existing subscription has a payment issue. Please cancel your current subscription before purchasing another plan.",
                409
            );
        }
        throw new AppError("You already have an active subscription. Please manage your current subscription before purchasing another plan.", 409);
    }


    const selectedPlan = await prisma.plan.findUnique({
        where : {
            name : plan,
        },
    })

    if(!selectedPlan) {
        throw new AppError("Plan not found", 404);
    }

    let razorpayPlanId : string | null = null;
    if(currency === "INR") {
        razorpayPlanId = billingCycle === "MONTHLY" 
                        ? selectedPlan.razorpayMonthlyPlanId 
                        : selectedPlan.razorpayYearlyPlanId
    } else if(currency == "USD") {
        razorpayPlanId = billingCycle === "MONTHLY"
                         ? selectedPlan.razorpayUsdMonthlyPlanId 
                         : selectedPlan.razorpayUsdYearlyPlanId
    }


    if (!razorpayPlanId) {
        throw new AppError(`${currency}Razorpay plan is not configured`, 500);
    }

    const totalCount =
        billingCycle === "MONTHLY"
            ? TOTAL_COUNT_MONTHLY
            : TOTAL_COUNT_YEARLY;

    const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: totalCount,
        quantity : 1,
        customer_notify : true,

        
        expire_by: Math.floor(Date.now() / 1000) + AUTHORIZATION_EXPIRY_HOURS * 3600,
    })

    try {
        const dbSubscription = await prisma.subscription.create({
            data: {
                userId,
                planId: selectedPlan.id,

                status: "AUTHORIZATION_PENDING",

                provider: "RAZORPAY",
                providerSubscriptionId: razorpaySubscription.id,
                billingCycle,
                currency
            },
        });

        return {
            subscriptionId: dbSubscription.id,

            
            providerSubscriptionId: razorpaySubscription.id,

            planId: selectedPlan.id,
            billingCycle,
            currency,
            shortUrl: razorpaySubscription.short_url,
            keyId: config.razorpayKeyId
        };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            console.error("Concurrent subscription insert rejected:", e.meta?.target);
            await razorpay.subscriptions.cancel(razorpaySubscription.id).catch(() => {
                console.error("Failed to cancel orphaned Razorpay subscription:", razorpaySubscription.id);
            });
            throw new AppError("A subscription was created concurrently. Please try again.", 409);
        }
        throw e;
    }
}


export const verifySubscriptionService = async(userId : string, data : SubscriptionVerificationInput) => {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = data;

    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            providerSubscriptionId: razorpay_subscription_id,
        },
    });

    if (!subscription) {
        throw new AppError("Subscription not found", 404);
    }

    const generatedSignature = crypto.createHmac("sha256", config.razorpayKeySecret!)
                               .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
                               .digest("hex");

    if (razorpay_signature.length !== generatedSignature.length) {
        throw new AppError("Invalid subscription signature", 400);
    }

    const isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "hex"),
        Buffer.from(razorpay_signature, "hex")
    )

    if (!isValid) {
        throw new AppError("Invalid subscription signature", 400);
    }

    let providerStatus: string | null = null;
    try {
        const remote = await razorpay.subscriptions.fetch(razorpay_subscription_id);
        providerStatus = remote.status;
    } catch {
        providerStatus = null;
    }

    return {
        subscriptionId: subscription.id,
        providerSubscriptionId : subscription.providerSubscriptionId,
        verified : true,
        status: subscription.status,
        providerStatus,
    };
}

export const cancelSubscriptionService = async (userId: string, cancelAtPeriodEnd: boolean) => {
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
    });

    if (!subscription) {
        throw new AppError("No cancellable subscription found", 404);
    }
    if (!subscription.providerSubscriptionId) {
        throw new AppError("Provider subscription ID is missing", 500);
    }
    if (subscription.cancelAtPeriodEnd) {
        throw new AppError("This subscription is already scheduled for cancellation.", 400);
    }
    if (cancelAtPeriodEnd && subscription.status !== "ACTIVE") {
        throw new AppError("cancelAtPeriodEnd is only supported for ACTIVE subscriptions.", 400);
    }

    let razorpaySubscription: { id: string; status: string };
    try {
         
        
        razorpaySubscription = await razorpay.subscriptions.cancel(
            subscription.providerSubscriptionId,
            cancelAtPeriodEnd
        );
    } catch (err) {
        console.error("Razorpay cancel failed:", err);
        throw new AppError("Payment provider failed to cancel the subscription. Please try again.", 502);
    }

    if (cancelAtPeriodEnd) {
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { cancelAtPeriodEnd: true },
        });
    } else {
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelAtPeriodEnd: false,
            },
        });
    }

    return {
        subscriptionId: subscription.id,
        providerSubscriptionId: razorpaySubscription.id,
        providerStatus: razorpaySubscription.status,
        localStatus: cancelAtPeriodEnd ? subscription.status : "CANCELLED",
        cancelAtPeriodEnd,
    };
}

export const changePlanService = async(userId : string, plan : ChangePlanInput["plan"], billingCycle : ChangePlanInput["billingCycle"], currency : "INR" | "USD") => {
    const subscription = await prisma.subscription.findFirst({
        where : {
            userId,
            status : "ACTIVE"
        },
        include : {
            plan : true,
            pendingPlan : true
        }
    })

    if(!subscription) {
        throw new AppError("No active subscription found", 404);
    }

    if(!subscription.providerSubscriptionId) {
        throw new AppError("Provider subscription ID is missing", 500);
    }

    const selectedPlan = await prisma.plan.findUnique({
        where : {
            name : plan
        }
    })

    if(!selectedPlan) {
        throw new AppError("Plan not found", 404);
    }

    
    
    if (selectedPlan.id === subscription.planId && billingCycle === subscription.billingCycle) {
        
        return {
            subscriptionId: subscription.id,
            providerSubscriptionId: subscription.providerSubscriptionId,
            currentPlan: selectedPlan.name,
            requestedPlan: selectedPlan.name,
            billingCycle: subscription.billingCycle,
            changeType: "NO_CHANGE" as const,
            scheduleChangeAt: null,
            appliedImmediately: true,
        };
    }

    
    
    
    const crossFrequency = subscription.billingCycle !== billingCycle;

    if(subscription.currency !== currency) {
        throw new AppError("Changing subscription currency is currently not supported", 400);
    }

    if (subscription.pendingPlanId) {
        throw new AppError("A plan change is already scheduled for this subscription", 400);
    }

    if (subscription.cancelAtPeriodEnd) {
        throw new AppError("This subscription is scheduled for cancellation. Please cancel the scheduled cancellation before changing your plan.", 400);
    }

    let currentPrice: number;
    let newPrice: number;

    if (currency === "INR") {
        if (billingCycle === "MONTHLY") {
            currentPrice = subscription.plan.monthlyPrice;
            newPrice = selectedPlan.monthlyPrice;
        } else {
            if (subscription.plan.yearlyPrice === null || selectedPlan.yearlyPrice === null) {
                throw new AppError("Yearly billing is not configured for this plan", 400);
            }

            currentPrice = subscription.plan.yearlyPrice;
            newPrice = selectedPlan.yearlyPrice;
        }
    } else {
        if (billingCycle === "MONTHLY") {
            if (subscription.plan.usdMonthlyPrice === null || selectedPlan.usdMonthlyPrice === null) {
                throw new AppError("USD monthly billing is not configured for this plan", 400);
            }

            currentPrice = subscription.plan.usdMonthlyPrice;
            newPrice = selectedPlan.usdMonthlyPrice;
        } else {
            if (subscription.plan.usdYearlyPrice === null || selectedPlan.usdYearlyPrice === null) {
                throw new AppError("USD yearly billing is not configured for this plan", 400);
            }

            currentPrice = subscription.plan.usdYearlyPrice;
            newPrice = selectedPlan.usdYearlyPrice;
        }
    }   

    
    
    
    const isUpgrade = !crossFrequency && newPrice > currentPrice;

    const scheduleChangeAt = crossFrequency
        ? "cycle_end"
        : (isUpgrade ? "now" : "cycle_end");
    
    let razorpayPlanId : string | null = null;

    if(currency === "INR") {
        razorpayPlanId = billingCycle === "MONTHLY" 
                        ? selectedPlan.razorpayMonthlyPlanId 
                        : selectedPlan.razorpayYearlyPlanId
    } else if(currency == "USD") {
        razorpayPlanId = billingCycle === "MONTHLY"
                         ? selectedPlan.razorpayUsdMonthlyPlanId 
                         : selectedPlan.razorpayUsdYearlyPlanId
    }
    

    if (!razorpayPlanId) {
        throw new AppError("Razorpay plan is not configured", 500);
    }

    let razorpaySubscription: {
        id: string;
        status: string;
        has_scheduled_changes?: boolean;
        change_scheduled_at?: number | null;
    };
    try {
        razorpaySubscription = await razorpay.subscriptions.update(
            subscription.providerSubscriptionId,
            {
                plan_id: razorpayPlanId,
                schedule_change_at: scheduleChangeAt,
                customer_notify: true,
            }
        );
    } catch (err) {
        console.error("Razorpay plan update failed:", err);
        throw new AppError(
            "Payment provider failed to apply the plan change. Please try again.",
            502
        );
    }

    
    
    
    const providerHasSchedule = razorpaySubscription.has_scheduled_changes === true;
    const scheduledAt =
        typeof razorpaySubscription.change_scheduled_at === "number"
            ? new Date(razorpaySubscription.change_scheduled_at * 1000)
            : (subscription.currentPeriodEnd ?? new Date());

    if (providerHasSchedule) {
        
        
        
        
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                pendingPlanId: selectedPlan.id,
                changeScheduledAt: scheduledAt,
            },
        });
    } else {
        
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                planId: selectedPlan.id,
                pendingPlanId: null,
                changeScheduledAt: null,
            },
        });
    }


    return {
        subscriptionId: subscription.id,
        providerSubscriptionId: razorpaySubscription.id,
        currentPlan: subscription.plan.name,
        requestedPlan: selectedPlan.name,
        billingCycle,
        changeType: crossFrequency
            ? (billingCycle === "YEARLY" ? "SWITCH_TO_YEARLY" : "SWITCH_TO_MONTHLY")
            : (isUpgrade ? "UPGRADE" : "DOWNGRADE"),
        scheduleChangeAt,
        appliedImmediately: !providerHasSchedule,
        status: razorpaySubscription.status,
    };
}


export const getSubscriptionService = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                in: [...LIVE_SUBSCRIPTION_STATUSES],
            },
        },
        include: {
            plan: true,
            pendingPlan: true,
        },
    });

    if (!subscription) {
        return null;
    }

    return subscription;
};

export const LIVE_SUBSCRIPTION_STATUSES = [
    "AUTHORIZATION_PENDING",
    "PAYMENT_RETRY",
    "ACTIVE",
    "HALTED",
    "PAUSED",
] as const;



const TOTAL_COUNT_MONTHLY = 1200;
const TOTAL_COUNT_YEARLY = 100;





export const AUTHORIZATION_EXPIRY_HOURS = 24;


const ENTITLEMENT_GRACE_MS = 24 * 60 * 60 * 1000;

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
    include: { plan: true; pendingPlan: true };
}>;

export const isEntitled = (subscription: SubscriptionWithPlan | null): boolean => {
    if (!subscription) {
        return false;
    }

    if (subscription.status === "ACTIVE") {
        return true;
    }

    if (
        subscription.status === "PAYMENT_RETRY" ||
        subscription.status === "HALTED" ||
        subscription.status === "PAUSED"
    ) {
        return (
            subscription.currentPeriodEnd !== null &&
            Date.now() <= subscription.currentPeriodEnd.getTime() + ENTITLEMENT_GRACE_MS
        );
    }

    
    return false;
};


export const getEntitledSubscription = async (
    userId: string
): Promise<SubscriptionWithPlan | null> => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: { in: [...LIVE_SUBSCRIPTION_STATUSES] },
        },
        include: {
            plan: true,
            pendingPlan: true,
        },
    });

    return isEntitled(subscription) ? subscription : null;
};

export const getActiveSubscription = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: "ACTIVE",
        },
        include: {
            plan: true,
            pendingPlan: true,
        },
    });

    return subscription;
};

export const getUserPlan = async (userId: string) => {
    const subscription = await getEntitledSubscription(userId);

    if (subscription) {
        return subscription.plan;
    }

    const freePlan = await prisma.plan.findUnique({
        where: {
            name: "FREE",
        },
    });

    if (!freePlan) {
        throw new AppError("Free plan is not configured", 500);
    }

    return freePlan;
};

const getBillingPeriod = (subscription: Awaited<ReturnType<typeof getActiveSubscription>>) => {
    if (subscription) {
        
        
        
        
        
        if (subscription.billingCycle === "YEARLY") {
            const now = new Date();
            return {
                periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
                periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
            };
        }

        if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
            
            
            const now = new Date();
            return {
                periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
                periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
            };
        }

        return {
            periodStart: subscription.currentPeriodStart,
            periodEnd: subscription.currentPeriodEnd,
        };
    }

    const now = new Date();

    return {
        periodStart: new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        ),
        periodEnd: new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        ),
    };
};

type PlanLimitType =
    | "LINKS"
    | "QR_CODES"
    | "DOMAINS"
    | "REDIRECTS"
    | "DESTINATION_CHANGES"
    | "CUSTOM_SLUGS";


export const checkPlanLimit = async (userId: string,type: PlanLimitType) => {
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    switch (type) {

        case "LINKS":
            return {
                allowed: true,
                limit: plan.maxLinks,
            };

        case "QR_CODES":
            return {
                allowed: true,
                limit: plan.maxQrPerMonth,
            };

        case "DOMAINS":
            return {
                allowed: true,
                limit: plan.maxDomains,
            };

        case "REDIRECTS":
            return {
                allowed: true,
                limit: plan.maxRedirectsPerMonth,
            };

        case "CUSTOM_SLUGS":
            return {
                allowed: true,
                limit: plan.maxCustomSlugsPerMonth,
            };

        case "DESTINATION_CHANGES":
            return {
                allowed: true,
                limit: plan.maxDestinationChangesPerMonth,
            };

        default:
            throw new AppError("Unknown plan limit type", 500);
    }
};

export const checkLinkLimit = async (userId: string) => {
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    const linkCount = await prisma.link.count({
        where: {
            userId,
        },
    });

    if (plan.maxLinks !== null && linkCount >= plan.maxLinks) {
        throw new AppError("You have reached the maximum number of links allowed by your plan", 403);
    }

    return {
        allowed: true,
        used: linkCount,
        limit: plan.maxLinks,
    };
};

export const checkQrLimit = async (userId: string) => {
    const subscription = await getEntitledSubscription(userId);

    const plan = subscription
        ? subscription.plan
        : await getUserPlan(userId);

    const { periodStart, periodEnd } = getBillingPeriod(subscription);


    const qrCount = await prisma.qr.count({
        where: {
            link: {
                userId,
            },
            createdAt: {
                gte: periodStart,
                lt: periodEnd,
            },
        },
    });

    if (plan.maxQrPerMonth !== null && qrCount >= plan.maxQrPerMonth) {
        throw new AppError("You have reached the maximum number of QR codes allowed for this billing period", 403);
    }

    return {
        allowed: true,
        used: qrCount,
        limit: plan.maxQrPerMonth,
    };
};

export const checkDomainLimit = async (userId: string) => {
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    const domainCount = await prisma.domain.count({
        where: {
            userId,
        },
    });

    if (plan.maxDomains !== null && domainCount >= plan.maxDomains) {
        throw new AppError("You have reached the maximum number of custom domains allowed by your plan", 403);
    }

    return {
        allowed: true,
        used: domainCount,
        limit: plan.maxDomains,
    };
};


export const checkRedirectLimit = async (userId: string) => {
    const subscription = await getEntitledSubscription(userId);

    const plan = subscription
        ? subscription.plan
        : await getUserPlan(userId);

    const { periodStart, periodEnd } = getBillingPeriod(subscription);

    if (plan.maxRedirectsPerMonth === null) {
        return {
            allowed: true,
            warning: false,
            used: 0,
            limit: null,
            graceLimit: null,
        };
    }


    const redirectCount = await prisma.scan.count({
        where: {
            link: {
                userId,
            },
            scannedAt: {
                gte: periodStart,
                lt: periodEnd,
            },
        },
    });

    const normalLimit = plan.maxRedirectsPerMonth;
    const graceLimit = plan.maxRedirectsWithGracePerMonth;

    if (redirectCount < normalLimit) {
        return {
            allowed: true,
            warning: false,
            used: redirectCount,
            limit: normalLimit,
            graceLimit,
        };
    }
    
    if (graceLimit !== null && redirectCount < graceLimit) {
        return {
            allowed: true,
            warning: true,
            used: redirectCount,
            limit: normalLimit,
            graceLimit,
        };
    }

    throw new AppError(
        "You have exceeded your redirect allowance for this billing period. Please upgrade your plan.",
        429
    );
};

const PRO_DESTINATION_CHANGE_ABUSE_LIMIT = 5000;

export const checkDestinationLimit = async (userId: string) => {
    const subscription = await getEntitledSubscription(userId);

    if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const plan = subscription.plan;

    const { periodStart, periodEnd } = getBillingPeriod(subscription);

    const limit = plan.maxDestinationChangesPerMonth;


    
    if (limit === null) {
        if (plan.name !== "PRO") {
            return;
        }


        const used = await prisma.linkChange.count({
            where: {
                userId,
                type: "DESTINATION",
                createdAt: {
                    gte: periodStart,
                    lt :periodEnd
                },
            },
        });

        if (used >= PRO_DESTINATION_CHANGE_ABUSE_LIMIT) {
            throw new AppError(
                "You have exceeded the monthly destination change limit. Please contact support if you need a higher limit.",
                403
            );
        }

        return;
    }

    const used = await prisma.linkChange.count({
        where: {
            userId,
            type: "DESTINATION",
            createdAt: {
                gte: periodStart,
                lt : periodEnd
            },
        },
    });

    if (used >= limit) {
        throw new AppError(
            `You have reached your destination change limit for this billing period.`,
            403
        );
    }
};


export const checkCustomSlugLimit = async (userId: string) => {
    const subscription = await getEntitledSubscription(userId);

     if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const plan = subscription.plan;

    const { periodStart, periodEnd } = getBillingPeriod(subscription);

    const limit = plan.maxCustomSlugsPerMonth;

    
    if (limit === null) {
        return;
    }


    const used = await prisma.linkChange.count({
        where: {
            userId,
            type: "CUSTOM_SLUG",
            createdAt: {
                gte: periodStart,
                lt : periodEnd
            },
        },
    });

    if (used >= limit) {
        throw new AppError(
            `You have reached your monthly custom slug limit of ${limit}.`,
            403
        );
    }
};

export const checkUtmAccess = async (userId: string) => {
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    if (plan.name !== "CREATOR" && plan.name !== "PRO") {
        throw new AppError(
            "UTM Campaign Builder is available on Creator and Pro plans",
            403
        );
    }
};


const ANALYTICS_PERIODS = [
    7,
    30,
    60,
    90,
    180,
    365,
    730,
    1095,
];

export const getAnalyticsCutoff = async (userId: string, requestedDays ?: number) => {
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

     if (requestedDays !== undefined && !ANALYTICS_PERIODS.includes(requestedDays)) {
        throw new AppError("Invalid analytics period.", 400);
    }

    const days = requestedDays ?? plan.analyticsDays;

     if (days > plan.analyticsDays) {
        throw new AppError(
            `Your plan allows analytics for the last ${plan.analyticsDays} days.`,
            403
        );
    }

    const cutoff = new Date();

    cutoff.setDate(
        cutoff.getDate() - days
    );

    return cutoff;
};

export const checkCsvExportAccess = async (userId: string) => {
    const plan = await getUserPlan(userId); 

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    if (plan.name !== "CREATOR" && plan.name !== "PRO") {
        throw new AppError("CSV Analytics Export is available on Creator and Pro plans", 403);
    }
};


export const PLAN_ORDER = ["FREE", "STARTER", "CREATOR", "PRO", "ENTERPRISE"] as const;
export const planRankOf = (name: string): number =>
    (PLAN_ORDER as readonly string[]).indexOf(name);


const DEEP_LINK_PLANS = ["PRO", "ENTERPRISE"];

export const hasDeepLinkAccess = async (userId: string): Promise<boolean> => {
    const plan = await getUserPlan(userId);
    return !!plan && DEEP_LINK_PLANS.includes(plan.name);
};

export const checkDeepLinkAccess = async (userId: string) => {
    if (!(await hasDeepLinkAccess(userId))) {
        throw new AppError("Path forwarding is available on the Pro plan", 403);
    }
};


export const hasAppDeepLinkAccess = async (userId: string): Promise<boolean> => {
    const plan = await getUserPlan(userId);
    return !!plan && DEEP_LINK_PLANS.includes(plan.name);
};

export const checkAppDeepLinkAccess = async (userId: string) => {
    if (!(await hasAppDeepLinkAccess(userId))) {
        throw new AppError("Mobile app deep linking is available on the Pro plan", 403);
    }
};

export const getUsageService = async (userId: string) => {
    
    
    
    
    const subscription = await getEntitledSubscription(userId);
    const plan = await getUserPlan(userId);
    const { periodStart } = getBillingPeriod(subscription);

    const periodFilter = { gte: periodStart };

    const [totalLinks, customSlugs, destinationEdits, redirects, qrCodes, domainCount] = await Promise.all([
        prisma.link.count({ where: { userId } }),
        prisma.linkChange.count({
            where: { userId, type: "CUSTOM_SLUG", createdAt: periodFilter },
        }),
        prisma.linkChange.count({
            where: { userId, type: "DESTINATION", createdAt: periodFilter },
        }),
        prisma.scan.count({
            where: { link: { userId }, scannedAt: periodFilter },
        }),
        prisma.qr.count({
            where: { link: { userId }, createdAt: periodFilter },
        }),
        prisma.domain.count({ where: { userId } }),
    ]);

    return {
        periodStart,
        links: { used: totalLinks, cap: plan.maxLinks },
        customSlugs: { used: customSlugs, cap: plan.maxCustomSlugsPerMonth },
        destinationEdits: { used: destinationEdits, cap: plan.maxDestinationChangesPerMonth },
        redirects: { used: redirects, cap: plan.maxRedirectsPerMonth },
        qrCodes: { used: qrCodes, cap: plan.maxQrPerMonth },
        domains: { used: domainCount, cap: plan.maxDomains },
        analyticsDays: plan.analyticsDays,
    };
};
