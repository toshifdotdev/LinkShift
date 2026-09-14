
import { contentUpdatedFor } from "./content-updated.ts";

/**
 * The canonical origin for every URL in the sitemap. Absolute URLs are
 * required by the sitemap protocol — relative paths are silently ignored.
 */
export const SITEMAP_ORIGIN = "https://linkshift.in";

/**
 * Builds the sitemap XML for the given public routes.
 *
 * Extracted from the Vite plugin so the output contract can be tested without
 * running a build (see ./sitemap.test.ts).
 *
 * `<lastmod>` comes from the committed content-update registry, never from the
 * clock. A sitemap that reports "today" for every URL on every deploy teaches
 * crawlers to discard the signal entirely, which is worse than omitting the
 * tag — see ./content-updated.ts for the full rationale.
 *
 * `priority` and `changefreq` are deliberately not emitted: Google has stated
 * it ignores both, and inventing values for them would be more fabricated
 * metadata of exactly the kind this change removed.
 */
export function buildSitemap(paths: readonly string[]): string {
    const urls = paths
        .map(
            (path) =>
                `  <url>\n    <loc>${SITEMAP_ORIGIN}${path}</loc>\n    <lastmod>${contentUpdatedFor(path)}</lastmod>\n  </url>`,
        )
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
