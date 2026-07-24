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
    .optional()
});


export type CreateLinkData = z.infer<typeof createLinkSchema>;