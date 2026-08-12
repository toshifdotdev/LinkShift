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