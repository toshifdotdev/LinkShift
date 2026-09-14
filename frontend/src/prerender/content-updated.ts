
// ---------------------------------------------------------------------------
// Content update dates — the single honest source for sitemap <lastmod>.
//
// WHY THIS EXISTS
//
// The sitemap previously stamped `new Date()` on every URL at build time. That
// claims every page changed on every deploy, which is false. Google learns to
// ignore a <lastmod> that always reports "today", and once ignored the signal
// is lost permanently — so fabricating freshness is strictly worse than
// omitting the tag.
//
// WHY NOT DERIVE IT FROM git log
//
// Deriving per-route dates from `git log -1 --format=%cs -- <file>` is more
// granular, but the build then depends on git metadata. That breaks builds from
// a source tarball, a shallow clone, or a build cache — and CI here uses
// actions/checkout with default depth, where history is not guaranteed. It also
// silently produces wrong dates when history is truncated.
//
// WHY NOT PER-PAGE DATES
//
// Inventing a different date per route to look granular is just fabrication
// with extra steps. The dates below are the real dates the content last
// changed, grouped by the review cycle that actually governs them.
//
// HOW TO MAINTAIN THIS
//
// Update a group's date in the same commit that changes that group's content.
// The `now` default is deliberately absent: an unlisted route falls back to
// SITE_CONTENT_UPDATED rather than to the build date, so a new route can never
// silently claim to be freshly modified.
// ---------------------------------------------------------------------------

/**
 * The date the marketing surface (home, pricing, contact, auth entry) was last
 * substantively revised. Every route not listed in ROUTE_CONTENT_UPDATED uses
 * this value.
 */
export const SITE_CONTENT_UPDATED = "2026-09-06";

/**
 * The date the documentation corpus was last revised. Docs topics share one
 * review cycle, so they share one date rather than pretending to individual
 * per-file precision.
 */
export const DOCS_CONTENT_UPDATED = "2026-09-06";

/**
 * The date the FAQ content was last revised.
 */
export const FAQ_CONTENT_UPDATED = "2026-09-06";

/**
 * The date the legal corpus (privacy, terms, refunds, shipping, acceptable
 * use) was last revised. Mirrors `LEGAL_UPDATED` in pages/legal/legal-data.ts —
 * keep the two in step, since the rendered page states this date to the reader.
 */
export const LEGAL_CONTENT_UPDATED = "2026-09-06";

/**
 * Per-route overrides. Only routes whose content date differs from the group
 * defaults need an entry.
 */
export const ROUTE_CONTENT_UPDATED: Record<string, string> = {
    "/contact": "2026-09-05",
};

/**
 * Returns the honest last-modified date for a public route, as `YYYY-MM-DD`.
 *
 * Precedence: explicit per-route override → documentation corpus → FAQ →
 * legal corpus → site default. Every branch returns a committed constant
 * describing when the content changed; none derives from the current time.
 */
export function contentUpdatedFor(path: string): string {
    const override = ROUTE_CONTENT_UPDATED[path];
    if (override) return override;

    if (path.startsWith("/docs")) return DOCS_CONTENT_UPDATED;
    if (path === "/faq") return FAQ_CONTENT_UPDATED;

    if (LEGAL_PATHS.has(path)) return LEGAL_CONTENT_UPDATED;

    return SITE_CONTENT_UPDATED;
}

/** Legal routes, which share the LEGAL_CONTENT_UPDATED date. */
const LEGAL_PATHS = new Set([
    "/privacy",
    "/terms",
    "/refunds",
    "/shipping",
    "/acceptable-use",
]);
