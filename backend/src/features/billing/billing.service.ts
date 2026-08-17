import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import razorpay from "../../config/razorpay";
import crypto from 'crypto';
import { config } from "../../config/env";
import { ChangePlanInput, CheckoutInput, PaymentVerificationInput, SubscriptionInput, SubscriptionVerificationInput } from "./billing.validation";


export const checkoutService = async(userId : string, plan : CheckoutInput["plan"], billingCycle : CheckoutInput["billingCycle"]) => {
    const selectedPlan = await prisma.plan.findUnique({
        where : {
            name : plan
        }
    })

    if (!selectedPlan) {
        throw new AppError("Plan not found.", 404);
    }


    const amount = billingCycle === "MONTHLY" ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

    if (amount === null || amount === undefined) {
        throw new AppError("This plan does not support the selected billing cycle.", 400);
    }

    const amountInPaise = amount * 100;

    const order = await razorpay.orders.create({
        amount : amountInPaise,
        currency : "INR",
        receipt : `rcpt_${Date.now()}`,
        notes : {
            userId,
            planId: selectedPlan.id,
            plan: selectedPlan.name,
            billingCycle
        }
    })

    await prisma.payment.create({
        data : {
            userId : userId,
            providerOrderId : order.id, 
            amount : Number(order.amount),
            currency : order.currency,
            provider : "RAZORPAY",
            status : "PENDING",
            planId : selectedPlan.id,
            billingCycle

        }
    })

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: selectedPlan.name,
        billingCycle,
        keyId: config.razorpayKeyId
    };
}


export const getPlansService = async() => {
    const result = await prisma.plan.findMany({
        orderBy: {
            monthlyPrice: "asc"
        }
    })

    return result;

}

export const verifyPaymentService = async(userId : string, data : PaymentVerificationInput) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const payment = await prisma.payment.findFirst({
        where : {
            userId,
            providerOrderId : razorpay_order_id
        }
    })

    if (!payment) {
        throw new AppError("Payment order not found", 404);
    }

    if(payment.status === "SUCCESS") {
        return {
            paymentId: payment.id,
            status: payment.status,
            message: "Payment already verified"
        };
    }

    if (payment.status !== "PENDING") {
        throw new AppError("Payment cannot be verified", 400);
    }

    const generatedSignature = crypto.createHmac("sha256", config.razorpayKeySecret!)
                               .update(`${payment.providerOrderId}|${razorpay_payment_id}`)
                               .digest("hex");
    

    const isValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature,"hex"),
        Buffer.from(razorpay_signature, "hex")
    );

    if (!isValid) {
        throw new AppError("Invalid payment signature", 400);
    }

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (razorpayPayment.order_id !== payment.providerOrderId) {
        throw new AppError("Payment does not belong to this order", 400);
    }

    if (razorpayPayment.status !== "captured") {
        throw new AppError(`Payment is not captured. Current status: ${razorpayPayment.status}`, 400);
    }


    const updatedPayment = await prisma.payment.update({
        where : {
            id : payment.id
        },
        data : {
            providerPaymentId : razorpay_payment_id,
            providerSignature : razorpay_signature,
            status : "SUCCESS"
        }
    })

    return {
        paymentId: updatedPayment.id,
        razorpayPaymentId: razorpay_payment_id,
        status: updatedPayment.status
    };
}



export const razorpayWebhookService = async(signature : string, data : Buffer) => {
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

        case "subscription.authenticated": {
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

        case "subscription.activated": {
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
                    status: "ACTIVE",

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
                ],
            },
        });

        if (!updatedPlan) {
            throw new AppError("Plan corresponding to Razorpay plan not found", 404);
        }

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

        case "subscription.authenticated": {
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

            console.log(
                "Razorpay subscription authenticated:",
                subscription.id
            );

            break;
        }


        default: 
            console.log("Unhandled Razorpay webhook event:", payload.event);
    }

    return {
        event: payload.event,
        processed: true,
    };

}

export const subscriptionService = async(userId : string, plan : SubscriptionInput["plan"], billingCycle : SubscriptionInput["billingCycle"]) => {
    const activeSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: "ACTIVE",
        },
    });


    if (activeSubscription) {
        throw new AppError("You already have an active subscription. Please manage your current subscription before purchasing another plan.", 409);
    }


    const selectedPlan = await prisma.plan.findFirst({
        where : {
            name : plan,
        },
    })

    if(!selectedPlan) {
        throw new AppError("Plan not found", 404);
    }

    const razorpayPlanId = billingCycle === "MONTHLY" ? selectedPlan.razorpayMonthlyPlanId : selectedPlan.razorpayYearlyPlanId;

    if (!razorpayPlanId) {
        throw new AppError("Razorpay plan is not configured", 500);
    }

    const totalCount =
    billingCycle === "MONTHLY"
        ? 1200   // 100 years × 12 months
        : 100; 

    const subscription = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: totalCount,
        quantity : 1,
        customer_notify : true
    })

    const dbSubscription = await prisma.subscription.create({
        data: {
            userId,
            planId: selectedPlan.id,

            status : "PENDING",

            provider: "RAZORPAY",
            providerSubscriptionId: subscription.id,

            billingCycle,

        },
    });

    return {
        subscriptionId: subscription.id,
        planId: selectedPlan.id,
        billingCycle,
        shortUrl: subscription.short_url,
        keyId: config.razorpayKeyId
    };

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

export const changePlanService = async(userId : string, plan : ChangePlanInput["plan"], billingCycle : ChangePlanInput["billingCycle"]) => {
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

    if (subscription.pendingPlanId) {
        throw new AppError("A plan change is already scheduled for this subscription", 400);
    }

    if (subscription.cancelAtPeriodEnd) {
        throw new AppError("This subscription is scheduled for cancellation. Please cancel the scheduled cancellation before changing your plan.", 400);
    }

    let currentPrice: number;
    let newPrice: number;

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

    const isUpgrade = newPrice > currentPrice;

    const scheduleChangeAt = isUpgrade
        ? "now"
        : "cycle_end";

    const razorpayPlanId =
        billingCycle === "MONTHLY"
            ? selectedPlan.razorpayMonthlyPlanId
            : selectedPlan.razorpayYearlyPlanId;

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
    

    await prisma.subscription.update({
        where: {
            id: subscription.id,
        },
        data: {
            pendingPlanId: selectedPlan.id,
            changeScheduledAt: isUpgrade
                ? new Date()
                : subscription.currentPeriodEnd,
        },
    });

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
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("Active subscription required", 403);
    }

    const now = new Date();

    const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    const qrCount = await prisma.qr.count({
        where: {
            link: {
                userId,
            },
            createdAt: {
                gte: startOfMonth,
                lt: startOfNextMonth,
            },
        },
    });

    if (plan.maxQrPerMonth !== null && qrCount >= plan.maxQrPerMonth) {
        throw new AppError("You have reached the maximum number of QR codes allowed for this month", 403);
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
    const plan = await getUserPlan(userId);

    if (!plan) {
        throw new AppError("No active plan found", 403);
    }

    if (plan.maxRedirectsPerMonth === null) {
        return {
            allowed: true,
            warning: false,
            used: 0,
            limit: null,
            graceLimit: null,
        };
    }

    const now = new Date();

    const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    const redirectCount = await prisma.scan.count({
        where: {
            link: {
                userId,
            },
            scannedAt: {
                gte: startOfMonth,
                lt: startOfNextMonth,
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
        "You have exceeded your monthly redirect allowance. Please upgrade your plan.",
        429
    );
};

const getMonthStart = () => {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );
};

const PRO_DESTINATION_CHANGE_ABUSE_LIMIT = 5000;

export const checkDestinationLimit = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: "ACTIVE",
        },
        include: {
            plan: true,
        },
    });

    if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const limit = subscription.plan.maxDestinationChangesPerMonth;

    // Pro / unlimited
    if (limit === null) {
        if (subscription.plan.name !== "PRO") {
            return;
        }

        const monthStart = getMonthStart();

        const used = await prisma.linkChange.count({
            where: {
                userId,
                type: "DESTINATION",
                createdAt: {
                    gte: monthStart,
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

    const monthStart = getMonthStart();

    const used = await prisma.linkChange.count({
        where: {
            userId,
            type: "DESTINATION",
            createdAt: {
                gte: monthStart,
            },
        },
    });

    if (used >= limit) {
        throw new AppError(
            `You have reached your monthly destination change limit of ${limit}.`,
            403
        );
    }
};

export const checkCustomSlugLimit = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: "ACTIVE",
        },
        include: {
            plan: true,
        },
    });

    if (!subscription) {
        throw new AppError("No active subscription found", 403);
    }

    const limit = subscription.plan.maxCustomSlugsPerMonth;

    // Unlimited
    if (limit === null) {
        return;
    }

    const monthStart = getMonthStart();

    const used = await prisma.linkChange.count({
        where: {
            userId,
            type: "CUSTOM_SLUG",
            createdAt: {
                gte: monthStart,
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
