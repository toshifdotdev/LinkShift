import { z } from 'zod';

export const createLinkSchema  = z.object({
  targetUrl: z.string()
    .trim()
    .pipe(
       z.url({ 
        message: "Invalid URL format", 
        protocol: /^https?$/ 
      })
       .max(2048, { message: "URL must be 2048 characters or less" })
    ),
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(50, { message: "Name cannot exceed 50 characters" })
    .optional(),

  expiresAt: z.iso.datetime().optional()
});

export type CreateLinkData = z.infer<typeof createLinkSchema>;

export const linkIdSchema = z.object({
  id : z.cuid2()
})

export type linkIdData = z.infer<typeof linkIdSchema>


export const updateLinkSchema = z.object({
  name : z.string(),
  targetUrl : z.string(),
  isActive : z.boolean(),
  expiresAt: z.iso.datetime().nullable().optional()
}).partial().refine((data) => data.name !== undefined || data.targetUrl !== undefined || data.isActive !== undefined || data.expiresAt !== undefined , {
  message: "At least one field must be provided.",
});

export type updateData = z.infer<typeof updateLinkSchema>