import { z } from "zod";

export const redirectParamSchema = z.object({
    shortId: z.string()
        .min(3, "Slug must be at least 3 characters long")
        .max(50, "Slug cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9_-]+$/, "Slug can only contain letters, numbers, hyphens (-), and underscores (_)")
})

export const unlockSchema = z.object({
    password: z.string().min(1)
});
export type unlockData = z.infer<typeof unlockSchema>;