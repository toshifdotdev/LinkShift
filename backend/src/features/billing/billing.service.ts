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
    const expectedSignature = crypto.createHmac("sha256", config.razorpayWebhookSecret!)
                              .update(data).digest("hex");


    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!isValid) {
        throw new AppError("Invalid webhook signature", 400);
    }

    const payload = JSON.parse(data.toString("utf8"));

    // Idempotency: ensure WebhookEvent row exists
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

    // Atomic claim: only one process can claim PENDING/FAILED/stale PROCESSING
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
        // Another process is actively handling it (fresh PROCESSING)
        throw new AppError("Webhook event already being processed", 409);
    }

    // We own the claim - run business logic
    try {
        await processWebhookEvent(payload);
        
        // Success - mark PROCESSED
        await prisma.webhookEvent.update({
            where: { eventId },
            data: { status: "PROCESSED", processedAt: new Date(), claimedAt: null }
        });
        return { event: payload.event, processed: true };
    } catch (err) {
        // Failure - mark FAILED (retryable)
        await prisma.webhookEvent.update({
            where: { eventId },
            data: { status: "FAILED", claimedAt: null }
        });
        throw err;
    }
};

const processWebhookEvent = async (payload: any) => {
    switch (payload.event) {
        case "payment.captured": {
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
                throw new AppError("Payment record not found", 404);
            }

            if (existingPayment.status === "SUCCESS") {
                break;
            }

            await prisma.payment.update({
                where: {
                    id: existingPayment.id,
                },
                data: {
                    providerPaymentId: payment.id,
                    status: "SUCCESS",
                },
            });
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
                throw new AppError("Payment record not found", 404);
            }

            if (existingPayment.status === "SUCCESS") {
                break;
            }

            await prisma.payment.update({
                where: {
                    id: existingPayment.id,
                },
                data: {
                    providerPaymentId: payment.id,
                    status: "FAILED",
                },
            });
            break;
        }

        case "order.paid": {
            const order = payload.payload.order.entity;

            await prisma.payment.updateMany({
                where : {
                    providerOrderId : order.id
                },
                data : {
                    status : "SUCCESS"
                }
            })
            break;
        }

        case "subscription.authenticated": { // 1st
            const subscription = payload.payload.subscription.entity;

            await prisma.subscription.updateMany({
                where: {
                    provider: "RAZORPAY",
                    providerSubscriptionId: subscription.id,
                },
                data: {
                    providerCustomerId: subscription.customer_id ?? null,
                },
            });

            break;
        }

        case "subscription.activated": { 
            const subscription = payload.payload.subscription.entity;

            await prisma.subscription.updateMany({
                where: {
                    provider: "RAZORPAY",
                    providerSubscriptionId: subscription.id,
                },
                data: {
                    status: "ACTIVE",

                    providerCustomerId: subscription.customer_id ?? null,

                    startedAt: subscription.start_at
                        ? new Date(subscription.start_at * 1000)
                        : undefined,

                    currentPeriodStart: subscription.current_start
                        ? new Date(subscription.current_start * 1000)
                        : undefined,

                    currentPeriodEnd: subscription.current_end
                        ? new Date(subscription.current_end * 1000)
                        : undefined,
                },
            });

            break;
        }

            case "subscription.charged": {
                const subscription = payload.payload.subscription.entity;

                const payment = payload.payload.payment.entity;

                const existingSubscription =
                    await prisma.subscription.findUnique({
                        where: {
                            provider_providerSubscriptionId: {
                                provider: "RAZORPAY",
                                providerSubscriptionId: subscription.id,
                            },
                        },
                    });

                if (!existingSubscription) {
                    throw new AppError("Subscription record not found", 404);
                }

                const existingPayment =
                    await prisma.payment.findUnique({
                        where: {
                            provider_providerPaymentId: {
                                provider: "RAZORPAY",
                                providerPaymentId: payment.id,
                            },
                        },
                    });

                await prisma.$transaction(async (tx) => {

                    if (!existingPayment) {

                        await tx.payment.create({
                            data: {
                                planId: existingSubscription.planId,
                                userId: existingSubscription.userId,
                                subscriptionId: existingSubscription.id,

                                provider: "RAZORPAY",

                                providerOrderId: payment.order_id,
                                providerPaymentId: payment.id,

                                billingCycle: existingSubscription.billingCycle,

                                amount: payment.amount,
                                currency: payment.currency,

                                status: "SUCCESS",
                            },
                        });
                    }

                    await tx.subscription.update({
                        where: {
                            id: existingSubscription.id,
                        },

                        data: {
                            status: "ACTIVE",
                            currentPeriodStart:
                                new Date(
                                    subscription.current_start * 1000
                                ),

                            currentPeriodEnd:
                                new Date(
                                    subscription.current_end * 1000
                                ),
                        },
                    });
                });

                break;
            }

        case "subscription.pending": {
            const subscription = payload.payload.subscription.entity;

            const existingSubscription = await prisma.subscription.findUnique({
                where: {
                    provider_providerSubscriptionId: {
                        provider: "RAZORPAY",
                        providerSubscriptionId: subscription.id,
                    },
                },
            });

            if (!existingSubscription) {
                throw new AppError(
                    "Subscription record not found",
                    404
                );
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "PENDING",
                },
            });

            break;
        }


        case "subscription.halted": {
            const subscription = payload.payload.subscription.entity;

            const existingSubscription = await prisma.subscription.findUnique({
                where: {
                    provider_providerSubscriptionId: {
                        provider: "RAZORPAY",
                        providerSubscriptionId: subscription.id,
                    },
                },
            });

            if (!existingSubscription) {
                throw new AppError(
                    "Subscription record not found",
                    404
                );
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "HALTED",
                },
            });

            break;
        }

        case "subscription.cancelled": {
            const subscription = payload.payload.subscription.entity;

            const existingSubscription =
                await prisma.subscription.findUnique({
                    where: {
                        provider_providerSubscriptionId: {
                            provider: "RAZORPAY",
                            providerSubscriptionId: subscription.id,
                        },
                    },
                });

            if (!existingSubscription) {
                throw new AppError("Subscription record not found", 404);
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "CANCELLED",
                    cancelAtPeriodEnd: false,
                    cancelledAt: subscription.ended_at
                                ? new Date(subscription.ended_at * 1000)
                                : new Date(),

                    currentPeriodEnd:
                        subscription.current_end
                            ? new Date(subscription.current_end * 1000)
                            : existingSubscription.currentPeriodEnd,
                },
            });

            break;
        }

        case "subscription.paused": {
            const subscription =
                payload.payload.subscription.entity;

            const existingSubscription =
                await prisma.subscription.findUnique({
                    where: {
                        provider_providerSubscriptionId: {
                            provider: "RAZORPAY",
                            providerSubscriptionId: subscription.id,
                        },
                    },
                });

            if (!existingSubscription) {
                throw new AppError(
                    "Subscription record not found",
                    404
                );
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "PAUSED",
                },
            });

            break;
        }

        case "subscription.resumed": {
            const subscription = payload.payload.subscription.entity;

            const existingSubscription =
                await prisma.subscription.findUnique({
                    where: {
                        provider_providerSubscriptionId: {
                            provider: "RAZORPAY",
                            providerSubscriptionId: subscription.id,
                        },
                    },
                });

            if (!existingSubscription) {
                throw new AppError("Subscription record not found", 404);
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "ACTIVE",

                    currentPeriodStart:
                        subscription.current_start
                            ? new Date(subscription.current_start * 1000)
                            : existingSubscription.currentPeriodStart,

                    currentPeriodEnd:
                        subscription.current_end
                            ? new Date(subscription.current_end * 1000)
                            : existingSubscription.currentPeriodEnd,
                },
            });

            break;
        }

        case "subscription.completed": {
            const subscription = payload.payload.subscription.entity;

            const existingSubscription =
                await prisma.subscription.findUnique({
                    where: {
                        provider_providerSubscriptionId: {
                            provider: "RAZORPAY",
                            providerSubscriptionId: subscription.id,
                        },
                    },
                });

            if (!existingSubscription) {
                throw new AppError("Subscription record not found", 404);
            }

            await prisma.subscription.update({
                where: {
                    id: existingSubscription.id,
                },
                data: {
                    status: "COMPLETED",

                    currentPeriodStart:
                        subscription.current_start
                            ? new Date(subscription.current_start * 1000)
                            : existingSubscription.currentPeriodStart,

                    currentPeriodEnd:
                        subscription.current_end
                            ? new Date(subscription.current_end * 1000)
                            : existingSubscription.currentPeriodEnd,
                },
            });

            break;
        }

    case "subscription.updated": {
        const subscription = payload.payload.subscription.entity;

        const existingSubscription =
            await prisma.subscription.findUnique({
                where: {
                    provider_providerSubscriptionId: {
                        provider: "RAZORPAY",
                        providerSubscriptionId: subscription.id,
                    },
                },
            });

        if (!existingSubscription) {
            throw new AppError("Subscription record not found", 404);
        }

        
        const updatedPlan = await prisma.plan.findFirst({
            where: {
                OR: [
                    {
                        razorpayMonthlyPlanId: subscription.plan_id,
                    },
                    {
                        razorpayYearlyPlanId: subscription.plan_id,
                    },
                    {
                        razorpayUsdMonthlyPlanId : subscription.plan_id
                    },
                    {
                        razorpayUsdYearlyPlanId : subscription.plan_id
                    }
                ],
            },
        });

        if (!updatedPlan) {
            throw new AppError("Plan corresponding to Razorpay plan not found", 404);
        }
        const billingCycle =
            subscription.plan_id === updatedPlan.razorpayMonthlyPlanId ||
            subscription.plan_id === updatedPlan.razorpayUsdMonthlyPlanId
                ? "MONTHLY"
                : "YEARLY";

        await prisma.$transaction(async (tx) => {

            const planChanged =
                existingSubscription.planId !== updatedPlan.id;

            await tx.subscription.update({
            where: {
                id: existingSubscription.id,
            },

            data: {
                planId: planChanged
                    ? updatedPlan.id
                    : existingSubscription.planId,

                pendingPlanId: planChanged
                    ? null
                    : existingSubscription.pendingPlanId,

                changeScheduledAt: planChanged
                    ? null
                    : existingSubscription.changeScheduledAt,

                billingCycle,

                currentPeriodStart:
                    subscription.current_start
                        ? new Date(subscription.current_start * 1000)
                        : existingSubscription.currentPeriodStart,

                currentPeriodEnd:
                    subscription.current_end
                        ? new Date(subscription.current_end * 1000)
                        : existingSubscription.currentPeriodEnd,
            },
        });
    })

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
                in: ["ACTIVE", "PENDING"],
            },
        },
    });


    if (existingSubscription) {
        throw new AppError("You already have an active or pending subscription. Please manage your current subscription before purchasing another plan.", 409);
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
        ? 1200   // 100 years × 12 months
        : 100; 

    const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: totalCount,
        quantity : 1,
        customer_notify : true
    })

    try {
        const dbSubscription = await prisma.subscription.create({
            data: {
                userId,
                planId: selectedPlan.id,

                status : "PENDING",

                provider: "RAZORPAY",
                providerSubscriptionId: razorpaySubscription.id,
                billingCycle,
                currency
            },
        });

        return {
            subscriptionId: dbSubscription.id,
            planId: selectedPlan.id,
            billingCycle,
            currency,
            shortUrl: razorpaySubscription.short_url,
            keyId: config.razorpayKeyId
        };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
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

    return {
        subscriptionId: subscription.id,
        providerSubscriptionId : subscription.providerSubscriptionId,
        verified : true,
        status: subscription.status,
    };
}

export const cancelSubscriptionService = async(userId : string, cancelAtPeriodEnd : boolean) => {
    const subscription = await prisma.subscription.findFirst({
        where : {
            userId,
            status : "ACTIVE"
        }
    })

     if (!subscription) {
        throw new AppError("No active subscription found", 404);
    }

    if (subscription.cancelAtPeriodEnd) {
        throw new AppError("Subscription is already scheduled for cancellation", 400);
    }

    if (!subscription.providerSubscriptionId) {
        throw new AppError("Provider subscription ID is missing", 500);
    }

    const razorpaySubscription = await razorpay.subscriptions.cancel(subscription.providerSubscriptionId, cancelAtPeriodEnd);


    if(cancelAtPeriodEnd) {
        await prisma.subscription.update({
            where :{
                id : subscription.id
            },
            data :{
                cancelAtPeriodEnd : true
            }
        })
    }

    return {
        subscriptionId: subscription.id,
        providerSubscriptionId: razorpaySubscription.id,
        status: razorpaySubscription.status,
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

    if (subscription.billingCycle !== billingCycle) {
        throw new AppError("Changing billing cycle is currently not supported. Please wait until your current billing cycle ends.", 400);
    }

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

    const isUpgrade = newPrice > currentPrice;

    const scheduleChangeAt = isUpgrade
        ? "now"
        : "cycle_end";
    
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

    const razorpaySubscription =
        await razorpay.subscriptions.update(
            subscription.providerSubscriptionId,
            {
                plan_id: razorpayPlanId,
                schedule_change_at: scheduleChangeAt,
                customer_notify: true,
            }
        );

    const latestSubscription =
        await prisma.subscription.findUnique({
            where: {
                id: subscription.id,
            },
        });
    
    if (!latestSubscription) {
        throw new AppError("Subscription record not found", 404);
    }

    if (latestSubscription.planId !== selectedPlan.id) {
        await prisma.subscription.update({
            where: {
                id: subscription.id,
            },
            data: {
                pendingPlanId: selectedPlan.id,
                changeScheduledAt: isUpgrade
                    ? null
                    : subscription.currentPeriodEnd,
            },
        });
    }
    

    return {
        subscriptionId: subscription.id,
        providerSubscriptionId: razorpaySubscription.id,
        currentPlan: subscription.plan.name,
        requestedPlan: selectedPlan.name,
        billingCycle,
        changeType: isUpgrade ? "UPGRADE" : "DOWNGRADE",
        scheduleChangeAt,
        status: razorpaySubscription.status,
    };
}


export const getSubscriptionService = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: {
                in: [
                    "ACTIVE",
                    "PENDING",
                    "HALTED",
                    "PAUSED",
                ],
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
    const subscription = await getActiveSubscription(userId);

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
        if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
            throw new AppError("Billing period information unavailable", 500);
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
    const subscription = await getActiveSubscription(userId);

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
    const subscription = await getActiveSubscription(userId);

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
    const subscription = await getActiveSubscription(userId);

    if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const plan = subscription.plan;

    const { periodStart, periodEnd } = getBillingPeriod(subscription);

    const limit = plan.maxDestinationChangesPerMonth;


    // Pro / unlimited
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
    const subscription = await getActiveSubscription(userId);

     if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const plan = subscription.plan;

    const { periodStart, periodEnd } = getBillingPeriod(subscription);

    const limit = plan.maxCustomSlugsPerMonth;

    // Unlimited
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