

import { DOC_CATEGORIES } from "../pages/docs/docs-data.ts";

/**
 * Public routes that are prerendered to static HTML and listed in the sitemap.
 *
 * `PUBLIC_PATHS` is the shared source of truth for the *indexable* route set.
 * It drives the sitemap generator directly, and the prerender step renders it
 * plus `ERROR_ROUTE_PATHS` (see `PRERENDER_PATHS`). `prerender.test.ts` and
 * `sitemap.test.ts` assert that the two cannot drift.
 *
 * Indexable routes belong here. Routes that are reachable but deliberately
 * excluded:
 *
 *   /forgot-password, /reset-password, /verify-email, /auth/google/callback
 *     — token-bearing flows that set `robots: noindex,nofollow`. Prerendering
 *       them would bake a noindex page into the static bundle for no benefit.
 *   /app/*
 *     — authenticated application surface, disallowed in robots.txt.
 *   /404
 *     — a utility error document, not content. Prerendered (see
 *       ERROR_ROUTE_PATHS) so CloudFront can serve it for 403/404, but
 *       deliberately absent from this list so it never enters the sitemap.
 *
 * `/login` IS included. It carries deliberate ROUTE_SEO metadata, is linked
 * from the landing navbar, and is a legitimate landing page for branded
 * "linkshift login" queries — the same rationale that already put `/register`
 * here. Leaving it out was an inconsistency: it was canonicalised and
 * crawlable but served to crawlers as a bare index.html shell, while its
 * sibling `/register` got real prerendered content.
 */
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
    "/login",
];

export const PUBLIC_PATHS: string[] = [
    ...STATIC_PUBLIC_PATHS,
    ...DOC_CATEGORIES.flatMap((category) =>
        category.topics.map((topic) => `/docs/${topic.slug}`),
    ),
];

/**
 * Utility routes that must exist as static files but must never be indexed or
 * listed in the sitemap.
 *
 * `/404` is the body CloudFront serves for a 403 or 404 custom error response
 * (see `deploy/DEPLOYMENT.md` §12b). It is served *in place of* the requested
 * URL, so it needs a real file at `dist/404/index.html` — but it is an error
 * document, not a destination, so it stays out of `PUBLIC_PATHS` and out of
 * the sitemap, and it is prerendered `noindex,nofollow`.
 */
export const ERROR_ROUTE_PATHS: string[] = ["/404"];

/**
 * Everything the prerender step writes to `dist/<route>/index.html`.
 *
 * The prerender set is a superset of the sitemap set: every indexable route
 * plus the error documents. The sitemap uses `PUBLIC_PATHS` alone.
 */
export const PRERENDER_PATHS: string[] = [...PUBLIC_PATHS, ...ERROR_ROUTE_PATHS];

