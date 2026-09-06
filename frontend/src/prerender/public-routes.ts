/*
 * Public, indexable, prerendered routes — the single source of truth shared
 * by the build-time sitemap generator (vite.config.ts) and the prerender
 * step (scripts/prerender.mjs), so the sitemap and the static HTML output
 * can never drift apart.
 *
 * Deliberately excluded: /login (not promoted), /reset-password,
 * /verify-email, /auth/google/callback, and everything under /app/* — those
 * are private or authenticated surfaces (noindex / auth-gated).
 */

import { DOC_CATEGORIES } from "../pages/docs/docs-data.ts";

export const STATIC_PUBLIC_PATHS: string[] = [
    "/",
    "/pricing",
    "/docs",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/refunds",
    "/shipping",
    "/acceptable-use",
    "/register",
];

export const PUBLIC_PATHS: string[] = [
    ...STATIC_PUBLIC_PATHS,
    ...DOC_CATEGORIES.flatMap((category) =>
        category.topics.map((topic) => `/docs/${topic.slug}`),
    ),
];
