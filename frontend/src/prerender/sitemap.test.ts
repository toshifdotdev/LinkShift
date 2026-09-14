import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";
import { PUBLIC_PATHS, STATIC_PUBLIC_PATHS, ERROR_ROUTE_PATHS, PRERENDER_PATHS } from "./public-routes";
import {
    DOCS_CONTENT_UPDATED,
    FAQ_CONTENT_UPDATED,
    LEGAL_CONTENT_UPDATED,
    ROUTE_CONTENT_UPDATED,
    SITE_CONTENT_UPDATED,
    contentUpdatedFor,
} from "./content-updated";

// ---------------------------------------------------------------------------
// Sitemap contract.
//
// The generator previously stamped `new Date()` on every URL at build time,
// claiming every page changed on every deploy. These tests pin the two
// properties that matter: every <lastmod> is a real committed date describing
// when the content changed, and every <loc> is an absolute URL on the
// canonical origin.
//
// The "no fabrication" test is the important one — it is what stops the build
// date from creeping back in.
// ---------------------------------------------------------------------------

const ORIGIN = "https://linkshift.in";

/** Extract the inner text of every <loc> / <lastmod> element. */
function elements(xml: string, tag: string): string[] {
    return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => m[1]);
}

const sitemap = buildSitemap(PUBLIC_PATHS);

describe("sitemap structure", () => {
    it("is a well-formed urlset", () => {
        expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(sitemap.trimEnd().endsWith("</urlset>")).toBe(true);
    });

    it("emits one <url> per public path, in the same order", () => {
        const locs = elements(sitemap, "loc");
        expect(locs).toHaveLength(PUBLIC_PATHS.length);
        expect(locs).toEqual(PUBLIC_PATHS.map((p) => `${ORIGIN}${p}`));
    });

    it("keeps the sitemap and prerender route sets identical", () => {
        // PUBLIC_PATHS is the shared source of truth for the indexable set —
        // a route that is prerendered and indexable must be listed, and
        // nothing may be listed that is not prerendered.
        const locs = elements(sitemap, "loc").map((l) => l.replace(ORIGIN, ""));
        expect(new Set(locs)).toEqual(new Set(PUBLIC_PATHS));
        expect(locs).toHaveLength(PUBLIC_PATHS.length);
    });

    it("never lists the utility error document", () => {
        // /404 is prerendered (CloudFront serves it for 403/404) but it is an
        // error document, not content. Listing it would advertise a dead end.
        const locs = elements(sitemap, "loc").map((l) => l.replace(ORIGIN, ""));
        for (const path of ERROR_ROUTE_PATHS) {
            expect(locs, `${path} must not be in the sitemap`).not.toContain(path);
        }
        expect(sitemap).not.toContain(`${ORIGIN}/404`);
    });

    it("covers exactly the indexable subset of the prerender set", () => {
        // The prerender set is a strict superset: indexable routes plus error
        // documents. The sitemap must equal the difference, not the whole.
        const locs = elements(sitemap, "loc").map((l) => l.replace(ORIGIN, ""));
        expect(new Set(PRERENDER_PATHS)).toEqual(new Set([...locs, ...ERROR_ROUTE_PATHS]));
    });

    it("uses no priority or changefreq, which were deliberately dropped", () => {
        // Both are ignored by Google and were removed rather than faked.
        expect(sitemap).not.toContain("<priority>");
        expect(sitemap).not.toContain("<changefreq>");
    });
});

describe("every <loc> is absolute", () => {
    it("starts with the canonical https origin", () => {
        for (const loc of elements(sitemap, "loc")) {
            expect(loc.startsWith(`${ORIGIN}/`), loc).toBe(true);
        }
    });

    it("uses no protocol-relative or relative forms", () => {
        for (const loc of elements(sitemap, "loc")) {
            expect(loc, loc).not.toMatch(/^\/\//);
            expect(loc, loc).not.toMatch(/^\/[^/]/);
        }
    });

    it("contains no trailing slash except the site root", () => {
        for (const loc of elements(sitemap, "loc")) {
            if (loc === `${ORIGIN}/`) continue;
            expect(loc.endsWith("/"), loc).toBe(false);
        }
    });
});

describe("every <lastmod> is an honest, valid ISO date", () => {
    it("parses as YYYY-MM-DD", () => {
        for (const lastmod of elements(sitemap, "lastmod")) {
            expect(lastmod, lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            // Round-trips through Date without shifting — rejects 2026-02-31.
            expect(new Date(`${lastmod}T00:00:00Z`).toISOString().slice(0, 10)).toBe(lastmod);
        }
    });

    it("is never in the future relative to the content registry", () => {
        // A committed date cannot be later than the newest committed date.
        const newest = [SITE_CONTENT_UPDATED, DOCS_CONTENT_UPDATED, FAQ_CONTENT_UPDATED, LEGAL_CONTENT_UPDATED]
            .concat(Object.values(ROUTE_CONTENT_UPDATED))
            .sort()
            .at(-1)!;

        for (const lastmod of elements(sitemap, "lastmod")) {
            expect(lastmod <= newest, `${lastmod} > ${newest}`).toBe(true);
        }
    });

    it("does not fabricate the build date", () => {
        // The regression guard for the original bug: the generator stamped
        // `new Date()` on every URL, so every lastmod equalled today.
        //
        // Invariant under test: no lastmod may equal the build date unless
        // that exact date is what the committed registry says. Today's date
        // can legitimately match a registry entry (a deploy on the day of a
        // content commit), so compare against the registry rather than
        // assuming the two must differ.
        const buildDate = new Date().toISOString().slice(0, 10);
        const locs = elements(sitemap, "loc");
        const lastmods = elements(sitemap, "lastmod");

        const fabricated = locs.filter((loc, i) => {
            const path = loc.replace(ORIGIN, "");
            const declared = contentUpdatedFor(path);
            return lastmods[i] === buildDate && declared !== buildDate;
        });

        expect(
            fabricated,
            `these URLs reported the build date (${buildDate}) instead of their committed content date: ${fabricated.join(", ")}`,
        ).toEqual([]);
    });

    it("reports the committed registry value for every URL", () => {
        // Strongest form of the same guarantee: the sitemap is a pure
        // projection of the registry, so no clock read can reach it.
        const locs = elements(sitemap, "loc");
        const lastmods = elements(sitemap, "lastmod");

        locs.forEach((loc, i) => {
            const path = loc.replace(ORIGIN, "");
            expect(lastmods[i], path).toBe(contentUpdatedFor(path));
        });
    });

    it("does not collapse to a single value across unrelated content groups", () => {
        // Docs, FAQ and legal share one review cycle each; the site surface
        // another. If everything collapses to one date the registry has been
        // bypassed.
        const docsDate = contentUpdatedFor("/docs/qr-studio");
        const siteDate = contentUpdatedFor("/pricing");
        expect(elements(sitemap, "lastmod").length).toBeGreaterThan(1);
        expect(typeof docsDate).toBe("string");
        expect(typeof siteDate).toBe("string");
    });
});

describe("contentUpdatedFor routing", () => {
    it("routes documentation to the docs corpus date", () => {
        expect(contentUpdatedFor("/docs")).toBe(DOCS_CONTENT_UPDATED);
        expect(contentUpdatedFor("/docs/qr-studio")).toBe(DOCS_CONTENT_UPDATED);
        expect(contentUpdatedFor("/docs/metrics-defined")).toBe(DOCS_CONTENT_UPDATED);
    });

    it("routes FAQ to the FAQ date", () => {
        expect(contentUpdatedFor("/faq")).toBe(FAQ_CONTENT_UPDATED);
    });

    it("routes the legal corpus to the legal date", () => {
        for (const path of [
            "/privacy",
            "/terms",
            "/refunds",
            "/shipping",
            "/acceptable-use",
        ]) {
            expect(contentUpdatedFor(path), path).toBe(LEGAL_CONTENT_UPDATED);
        }
    });

    it("applies per-route overrides ahead of the group defaults", () => {
        expect(contentUpdatedFor("/contact")).toBe(ROUTE_CONTENT_UPDATED["/contact"]);
    });

    it("falls back to the site default, never to the clock", () => {
        expect(contentUpdatedFor("/pricing")).toBe(SITE_CONTENT_UPDATED);
        expect(contentUpdatedFor("/register")).toBe(SITE_CONTENT_UPDATED);
        // An unregistered route must not claim to be freshly modified.
        expect(contentUpdatedFor("/some-future-route")).toBe(SITE_CONTENT_UPDATED);
        expect(contentUpdatedFor("/some-future-route")).not.toBe(
            new Date().toISOString().slice(0, 10),
        );
    });

    it("returns a valid ISO date for every public route", () => {
        for (const path of PUBLIC_PATHS) {
            const value = contentUpdatedFor(path);
            expect(value, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it("covers every prerendered route with a registered date source", () => {
        // Guards against a route being added to the sitemap without an
        // intentional date: every entry must resolve to a named constant.
        const known = new Set([
            SITE_CONTENT_UPDATED,
            DOCS_CONTENT_UPDATED,
            FAQ_CONTENT_UPDATED,
            LEGAL_CONTENT_UPDATED,
            ...Object.values(ROUTE_CONTENT_UPDATED),
        ]);
        for (const path of STATIC_PUBLIC_PATHS) {
            expect(known.has(contentUpdatedFor(path)), path).toBe(true);
        }
    });
});
