import { describe, expect, it } from "vitest";
import {
    renderRoute,
    headForPath,
    jsonLdForPath,
    PUBLIC_PATHS,
    PRERENDER_PATHS,
    ERROR_ROUTE_PATHS,
    ROUTE_SEO,
} from "./prerender-entry";
import { DOC_CATEGORIES } from "@/pages/docs/docs-data";

// ---------------------------------------------------------------------------
// Static prerender contract: every public route renders real, route-specific
// content and metadata from the initial HTML; private/authenticated routes
// are never prerendered; the sitemap and the prerender set cannot drift.
// ---------------------------------------------------------------------------

const ORIGIN = "https://linkshift.in";

describe("PUBLIC_PATHS", () => {
    it("covers every key public destination", () => {
        for (const required of [
            "/", "/pricing", "/docs", "/faq", "/contact",
            "/privacy", "/terms", "/refunds", "/shipping", "/acceptable-use", "/register",
            "/login",
        ]) {
            expect(PUBLIC_PATHS, `missing ${required}`).toContain(required);
        }
    });

    it("includes every documentation topic exactly once", () => {
        const topics = DOC_CATEGORIES.flatMap((c) => c.topics.map((t) => `/docs/${t.slug}`));
        for (const topic of topics) expect(PUBLIC_PATHS).toContain(topic);
        expect(new Set(PUBLIC_PATHS).size).toBe(PUBLIC_PATHS.length);
    });

    it("prerenders /login for the same reason as /register", () => {
        // /login carries deliberate ROUTE_SEO metadata (title, description and
        // a canonical path) and is linked from the landing navbar, so it is an
        // intended indexable page. Prerendering it gives crawlers real content
        // instead of an empty SPA shell — the treatment /register already had.
        expect(PUBLIC_PATHS).toContain("/login");
        expect(PUBLIC_PATHS).toContain("/register");
        expect(ROUTE_SEO["/login"]).toBeDefined();
        expect(ROUTE_SEO["/login"].canonicalPath).toBe("/login");
    });

    it("never prerenders private or authenticated routes", () => {
        for (const forbidden of [
            "/app",
            "/app/links",
            "/app/settings",
            "/reset-password",
            "/verify-email",
            "/forgot-password",
            "/auth/google/callback",
        ]) {
            expect(PUBLIC_PATHS, `${forbidden} must not be prerendered`).not.toContain(forbidden);
        }
    });

    it("keeps the token-bearing auth flows out of the prerender set", () => {
        // These set robots: noindex,nofollow at runtime — baking them into the
        // static bundle would publish a noindex page for no benefit.
        for (const forbidden of ["/reset-password", "/verify-email", "/forgot-password"]) {
            expect(PUBLIC_PATHS, `${forbidden} must stay non-prerendered`).not.toContain(forbidden);
        }
    });
});

describe("ERROR_ROUTE_PATHS", () => {
    it("prerenders /404 as a static error document", () => {
        // CloudFront's 403/404 custom error responses serve /404/index.html
        // (deploy/DEPLOYMENT.md §12b), so the file must exist in dist/.
        expect(ERROR_ROUTE_PATHS).toContain("/404");
        expect(PRERENDER_PATHS).toContain("/404");
    });

    it("keeps /404 out of PUBLIC_PATHS so it never reaches the sitemap", () => {
        // PUBLIC_PATHS is the sitemap set. A 404 is a utility error document,
        // not content — listing it would advertise a dead end to crawlers.
        expect(PUBLIC_PATHS).not.toContain("/404");
    });

    it("derives the prerender set as indexable routes plus error documents", () => {
        expect(new Set(PRERENDER_PATHS)).toEqual(new Set([...PUBLIC_PATHS, ...ERROR_ROUTE_PATHS]));
        expect(PRERENDER_PATHS.length).toBe(PUBLIC_PATHS.length + ERROR_ROUTE_PATHS.length);
    });

    it("marks the error document noindex and every indexable route indexable", () => {
        // A prerendered 404 must never be indexable, and no page that is in the
        // sitemap may carry a noindex directive.
        expect(headForPath("/404").robots).toBe("noindex,nofollow");
        for (const path of PUBLIC_PATHS) {
            expect(headForPath(path).robots, path).toBeUndefined();
        }
    });

    it("renders the real not-found copy into the error document", () => {
        const html = renderRoute("/404");
        expect(html).toContain("Page not found");
        expect(html).toContain("The page you requested does not exist.");
    });

    it("keeps the runtime 404 head in step with the prerendered document", () => {
        // The NotFound component renders ROUTE_SEO["/404"] at runtime; the
        // build renders headForPath("/404"). Both read the same registry entry,
        // so the SPA and the static error page cannot disagree.
        const head = headForPath("/404");
        const runtime = ROUTE_SEO["/404"];

        expect(runtime.title).toBe(head.title);
        expect(runtime.description).toBe(head.description);
        expect(runtime.robots).toBe(head.robots);
        expect(head.robots).toBe("noindex,nofollow");
        expect(head.canonical).toBe(`${ORIGIN}/404`);
    });
});

describe("headForPath", () => {
    it("builds route-specific titles, descriptions and canonicals", () => {
        for (const path of ["/", "/pricing", "/terms", "/privacy", "/docs/qr-studio"]) {
            const head = headForPath(path);
            expect(head.title.length).toBeGreaterThan(10);
            expect(head.description.length).toBeGreaterThan(30);
            expect(head.canonical).toBe(`${ORIGIN}${path === "/" ? "/" : path}`);
        }
    });

    it("does not share metadata between unrelated public pages", () => {
        const titles = ["/", "/pricing", "/docs", "/terms"].map((p) => headForPath(p).title);
        expect(new Set(titles).size).toBe(titles.length);
        const descriptions = ["/", "/pricing", "/docs", "/terms"].map(
            (p) => headForPath(p).description,
        );
        expect(new Set(descriptions).size).toBe(descriptions.length);
    });

    it("attaches the page's own JSON-LD types", () => {
        const landing = jsonLdForPath("/") as { "@graph": Array<{ "@type": string }> };
        const types = landing["@graph"].map((node) => node["@type"]);
        expect(types).toContain("WebSite");
        expect(types).toContain("WebApplication");
        expect(types).toContain("Organization");

        expect(jsonLdForPath("/faq")).toMatchObject({ "@type": "FAQPage" });
        expect(jsonLdForPath("/docs/qr-studio")).toMatchObject({ "@type": "BreadcrumbList" });
        expect(jsonLdForPath("/pricing")).toBeUndefined();
    });

    it("throws for a public path with no registered SEO metadata", () => {
        expect(() => headForPath("/definitely-not-registered")).toThrow(/No SEO metadata/);
    });
});

describe("renderRoute", () => {
    it("renders real documentation text for a docs topic", () => {
        const html = renderRoute("/docs/metrics-defined");
        expect(html).toContain("Metrics, defined");
        expect(html).toContain("Clicks over time plots completed redirects per day");
    });

    it("renders the actual legal text for terms", () => {
        const html = renderRoute("/terms");
        expect(html).toContain("Terms of Service");
        expect(html).toContain("governed by the laws of India");
        expect(html).toContain("LinkShift, a sole proprietorship");
    });

    it("renders static pricing product info; prices stay backend-owned", () => {
        const html = renderRoute("/pricing");
        // Universal capabilities and billing behaviour — static product facts.
        expect(html).toContain("Password-protected links");
        expect(html).toContain("Full QR studio");
        expect(html).toContain("REGIONAL PRICING");
        expect(html).toContain("Payments are processed securely by Razorpay");
        // Prices are deliberately fetched at runtime (never hardcoded) — the
        // static HTML must not fabricate them.
        expect(html).toContain("Loading prices…");
        expect(html).not.toMatch(/₹\s?\d{3,}/);
    });

    it("renders the homepage hero content", () => {
        const html = renderRoute("/");
        expect(html).toContain("LinkShift");
    });

    it("renders the privacy policy contact channel", () => {
        const html = renderRoute("/privacy");
        expect(html).toContain("Privacy Policy");
        expect(html).toContain("linkshift.admin@gmail.com");
    });
});
