import { z } from "zod";
import { EyeBallStyle, EyeStyle, PatternStyle } from "../../generated/prisma/enums";

export const createQrSchema = z.object({
    foregroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
    backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
    margin: z.number().int().nonnegative().optional(),
    
    pattern: z.enum(PatternStyle).optional(),
    
    eyeStyle: z.enum(EyeStyle).optional(),
    
    eyeBallStyle: z.enum(EyeBallStyle).optional(),

    logoUrl: z.string().trim()
            .pipe(
                z.url({ 
                    message: "Invalid URL format", 
                    protocol: /^https?$/ 
                })
                .max(2048, { message: "URL must be 2048 characters or less" })
            ).optional(),

    logoPublicId: z
            .string()
            .trim()
            .min(1, "Public ID cannot be empty")
            .max(255, "Public ID is too long")
            .regex(
            /^[a-zA-Z0-9_/-]+$/, 
            "Public ID can only contain letters, numbers, underscores, hyphens, and forward slashes"
            ).optional()
    })


export type createLinkQr = {
    userId: string;
    linkId: string;
} & z.infer<typeof createQrSchema>;