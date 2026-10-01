import { z } from "zod";

/**
 * Longest destination we will parse. A real short link target is far below
 * this; the cap stops a preview request from being used to make the server
 * allocate an unbounded string.
 */
export const MAX_PREVIEW_URL_LENGTH = 2048;

/** Schemes a destination may use. */
const WEB_SCHEMES = ["http", "https"] as const;

/**
 * Anything matching this is refused outright.
 *
 * A custom app scheme is a legitimate destination (`myapp://checkout`), so
 * schemes cannot be limited to http/https. But the preview result is rendered
 * back to the user, and `javascript:` or `data:` in a rendered link is a stored
 * XSS vector. `file:` has no business in a short link either.
 */
const BLOCKED_SCHEMES = ["javascript", "data", "file", "vbscript"] as const;

/**
 * A scheme is "custom" if it is neither web nor blocked: the product's own app
 * deep links depend on arbitrary vendor schemes being allowed.
 */
export const isSafeScheme = (raw: string): boolean => {
    const scheme = raw.slice(0, raw.indexOf(":")).trim().toLowerCase();

    if (!scheme) {
        // No scheme at all. Treated as a relative reference, which cannot be
        // resolved into a dangerous absolute URL.
        return true;
    }

    if ((BLOCKED_SCHEMES as readonly string[]).includes(scheme)) {
        return false;
    }

    // A scheme must be ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) per RFC 3986.
    return /^[a-z][a-z0-9+.-]*$/.test(scheme) || (WEB_SCHEMES as readonly string[]).includes(scheme);
};

const destinationSchema = z
    .string()
    .trim()
    .min(1, "Enter a destination URL to test.")
    .max(
        MAX_PREVIEW_URL_LENGTH,
        `Destinations are limited to ${MAX_PREVIEW_URL_LENGTH} characters.`
    )
    .refine(isSafeScheme, {
        message: "That URL scheme cannot be used as a short link destination.",
    });

export const TESTER_PRESETS = [
    "desktop",
    "ios-safari",
    "ios-chrome",
    "android-chrome",
    "android-firefox",
    "bot",
] as const;

export type TesterPreset = (typeof TESTER_PRESETS)[number];

const presetSchema = z.enum(TESTER_PRESETS);

export const redirectTesterSchema = z.looseObject({
    /** Where the link would send people. */
    url: destinationSchema,

    /**
     * Simulated visitor. Defaults to desktop, which is the most common case and
     * the one where nothing platform-specific happens.
     */
    preset: presetSchema.default("desktop"),

    /** Overrides the preset's user agent when the caller supplies a real one. */
    userAgent: z.string().trim().max(512).optional(),

    /** Simulated path after the slug, e.g. `/checkout/step-2`. */
    path: z
        .string()
        .trim()
        .max(512)
        .optional()
        .default(""),

    /** Simulated query string, with or without a leading `?`. */
    query: z
        .string()
        .trim()
        .max(512)
        .optional()
        .default(""),

    /**
     * Simulated app deep link settings, mirroring the fields on a real link.
     * Supplied by the caller so the tester can preview a configuration before
     * saving it to a link.
     */
    appScheme: z.string().trim().max(64).optional(),
    androidPackage: z.string().trim().max(128).optional(),
    appPath: z.string().trim().max(256).optional(),
    iosStoreUrl: z.string().trim().max(MAX_PREVIEW_URL_LENGTH).optional(),
    androidStoreUrl: z.string().trim().max(MAX_PREVIEW_URL_LENGTH).optional(),

    /** Whether the hypothetical link has deep link forwarding enabled. */
    deepLink: z.boolean().default(false),
});

export type RedirectTesterRequest = z.infer<typeof redirectTesterSchema>;
