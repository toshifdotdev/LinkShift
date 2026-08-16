import { z } from 'zod';

export const checkoutSchema = z.object({
    plan : z.enum([
        "STARTER",
        "CREATOR",
        "PRO"
    ]),

    billingCycle : z.enum([
        "MONTHLY",
        "YEARLY"
    ])
})

export type CheckoutInput = z.infer<typeof checkoutSchema>;


export const paymentVerificationSchema = z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1)
});

export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;


export const subscriptionSchema = z.object({
  plan: z.enum([
    "STARTER",
    "CREATOR",
    "PRO",
  ]),

  billingCycle: z.enum([
    "MONTHLY",
    "YEARLY",
  ]),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;


export const subscriptionVerificationSchema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_subscription_id: z.string(),
    razorpay_signature: z.string(),
});

export type SubscriptionVerificationInput = z.infer<typeof subscriptionVerificationSchema>

export const cancelSubscriptionSchema = z.object({
    cancelAtPeriodEnd: z.boolean(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const changePlanSchema = z.object({
    plan: z.enum([
        "STARTER",
        "CREATOR",
        "PRO",
    ]),

    billingCycle: z.enum([
        "MONTHLY",
        "YEARLY",
    ]),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;