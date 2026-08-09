import { z } from 'zod';
import { passwordValidation } from '../auth/auth.validation';

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

  slug : z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters long")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/, 
      "Slug can only contain letters, numbers, hyphens (-), and underscores (_)"
    ).optional(),

  domainId : z.cuid2(),

  expiresAt: z.iso.datetime().optional(),
  password: passwordValidation
});

export type CreateLinkData = z.infer<typeof createLinkSchema>;

export const linkIdSchema = z.object({
  id : z.cuid2()
})
export const qrIdSchema = z.object({
  id : z.cuid2()
})
export type linkIdData = z.infer<typeof linkIdSchema>


export const updateLinkSchema = z.object({
  name : z.string(),
  targetUrl : z.string(),
  isActive : z.boolean(),
  expiresAt: z.iso.datetime().nullable().optional(),
  password: passwordValidation.nullable().optional(),
  slug : z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters long")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/, 
      "Slug can only contain letters, numbers, hyphens (-), and underscores (_)"
    ).optional(),

  domainId : z.cuid2().optional(),

}).partial().refine((data) => data.name !== undefined || data.targetUrl !== undefined || 
                              data.isActive !== undefined || data.expiresAt !== undefined ||
                              data.password !== undefined || data.slug !== undefined ||
                              data.domainId !== undefined,{
  message: "At least one field must be provided.",
});

export type updateData = z.infer<typeof updateLinkSchema>