import { describe, expect, it } from "vitest";
import { renderRoute, headForPath, jsonLdForPath, PUBLIC_PATHS } from "./prerender-entry";
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
        ]) {
            expect(PUBLIC_PATHS, `missing ${required}`).toContain(required);
        }
    });

    it("includes every documentation topic exactly once", () => {
        const topics = DOC_CATEGORIES.flatMap((c) => c.topics.map((t) => `/docs/${t.slug}`));
        for (const topic of topics) expect(PUBLIC_PATHS).toContain(topic);
        expect(new Set(PUBLIC_PATHS).size).toBe(PUBLIC_PATHS.length);
    });

    it("never prerenders private or authenticated routes", () => {
        for (const forbidden of [
            "/login",
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
