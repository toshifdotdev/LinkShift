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
  password: passwordValidation.optional(),

  utmSource: z.string().trim().max(100).optional(),
  utmMedium: z.string().trim().max(100).optional(),
  utmCampaign: z.string().trim().max(150).optional(),
  utmTerm: z.string().trim().max(100).optional(),
  utmContent: z.string().trim().max(150).optional(),
  deepLink: z.boolean().optional(),

  appDeepLink: z.boolean().optional(),
  appScheme: z.string()
    .trim()
    .max(100, "URI scheme cannot exceed 100 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9+.-]*$/, "Invalid URI scheme (e.g. myapp)")
    .optional(),
  androidPackage: z.string()
    .trim()
    .max(255, "Android package cannot exceed 255 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, "Invalid Android package name (e.g. com.example.app)")
    .optional(),
  appPath: z.string().trim().max(1024, "In-app path cannot exceed 1024 characters").optional(),
  iosStoreUrl: z.string()
    .trim()
    .pipe(
      z.url({ message: "Invalid App Store URL format", protocol: /^https?$/ })
        .max(2048, { message: "URL must be 2048 characters or less" })
    ).optional(),
  androidStoreUrl: z.string()
    .trim()
    .pipe(
      z.url({ message: "Invalid Play Store URL format", protocol: /^https?$/ })
        .max(2048, { message: "URL must be 2048 characters or less" })
    ).optional(),
  }).superRefine((data, ctx) => {

      const hasAnyUtm =
          data.utmSource !== undefined ||
          data.utmMedium !== undefined ||
          data.utmCampaign !== undefined ||
          data.utmTerm !== undefined ||
          data.utmContent !== undefined;

      if (hasAnyUtm) {
          if (!data.utmSource) {
              ctx.addIssue({
                  code: "custom",
                  path: ["utmSource"],
                  message: "UTM source is required when using UTM parameters",
              });
          }

          if (!data.utmMedium) {
              ctx.addIssue({
                  code: "custom",
                  path: ["utmMedium"],
                  message: "UTM medium is required when using UTM parameters",
              });
          }

          if (!data.utmCampaign) {
              ctx.addIssue({
                  code: "custom",
                  path: ["utmCampaign"],
                  message: "UTM campaign is required when using UTM parameters",
              });
          }
      }

      if (data.appDeepLink && !data.appScheme) {
          ctx.addIssue({
              code: "custom",
              path: ["appScheme"],
              message: "A URI scheme is required to enable mobile app deep linking",
          });
      }
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

  utmSource: z.string().trim().max(100).nullable().optional(),
  utmMedium: z.string().trim().max(100).nullable().optional(),
  utmCampaign: z.string().trim().max(150).nullable().optional(),
  utmTerm: z.string().trim().max(100).nullable().optional(),
  utmContent: z.string().trim().max(150).nullable().optional(),
  deepLink: z.boolean().optional(),

  appDeepLink: z.boolean().optional(),
  appScheme: z.string()
    .trim()
    .max(100, "URI scheme cannot exceed 100 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9+.-]*$/, "Invalid URI scheme (e.g. myapp)")
    .nullable().optional(),
  androidPackage: z.string()
    .trim()
    .max(255, "Android package cannot exceed 255 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, "Invalid Android package name (e.g. com.example.app)")
    .nullable().optional(),
  appPath: z.string().trim().max(1024, "In-app path cannot exceed 1024 characters").nullable().optional(),
  iosStoreUrl: z.string()
    .trim()
    .pipe(
      z.url({ message: "Invalid App Store URL format", protocol: /^https?$/ })
        .max(2048, { message: "URL must be 2048 characters or less" })
    ).nullable().optional(),
  androidStoreUrl: z.string()
    .trim()
    .pipe(
      z.url({ message: "Invalid Play Store URL format", protocol: /^https?$/ })
        .max(2048, { message: "URL must be 2048 characters or less" })
    ).nullable().optional(),

}).partial().refine((data) => data.name !== undefined || data.targetUrl !== undefined || 
                              data.isActive !== undefined || data.expiresAt !== undefined ||
                              data.password !== undefined || data.slug !== undefined ||
                              data.domainId !== undefined ||  data.utmSource !== undefined ||
                              data.utmMedium !== undefined || data.utmCampaign !== undefined ||
                              data.utmTerm !== undefined || data.utmContent !== undefined ||
                              data.deepLink !== undefined || data.appDeepLink !== undefined ||
                              data.appScheme !== undefined || data.androidPackage !== undefined ||
                              data.appPath !== undefined || data.iosStoreUrl !== undefined ||
                              data.androidStoreUrl !== undefined,{
  message: "At least one field must be provided.",
});

export type updateData = z.infer<typeof updateLinkSchema>


 
const ANALYTICS_DAYS = [7, 30, 60, 90, 180, 365, 730, 1095] as const;

export const queryDaysSchema = z.object({
    days: z.coerce
        .number()
        .refine(
            (val) => ANALYTICS_DAYS.includes(val as any), 
            { message: `Period must be one of: ${ANALYTICS_DAYS.join(', ')}` }
        ).optional()
});

export type queryDaysInput = z.infer<typeof queryDaysSchema>