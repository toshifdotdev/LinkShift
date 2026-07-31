import { z } from "zod";

export const redirectParamSchema = z.object({
    shortId: z.string()
        .min(7)
        .max(7)
})

export const unlockSchema = z.object({
    password: z.string().min(1)
});
export type unlockData = z.infer<typeof unlockSchema>;