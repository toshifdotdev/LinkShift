import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { PRERENDER_PATHS } from "../../src/prerender/public-routes.ts";

// ---------------------------------------------------------------------------
// Contract for the CloudFront viewer-request clean-URL rewrite.
//
// The function lives at deploy/cloudfront/clean-url-rewrite.js and runs on the
// restricted CloudFront Functions runtime: plain ES5 whose only export is a
// `handler` function, with no module system. It therefore cannot be imported,
// so its source is read and evaluated in this realm.
//
// This test sits with the build/runtime scripts rather than in src/ because it
// touches the filesystem and Node built-ins; src/ is compiled with DOM-only
// types.
//
// The rewrite is the missing half of the prerender pipeline. The build writes
// dist/<route>/index.html, and this mapping is what makes the clean public URL
// resolve to it. The first test below pins that coupling directly: every route
// in PRERENDER_PATHS must map, so the two can never drift.
// ---------------------------------------------------------------------------

const FUNCTION_PATH = resolve(
    import.meta.dirname,
    "../../../deploy/cloudfront/clean-url-rewrite.js",
);

const source = readFileSync(FUNCTION_PATH, "utf8");

interface CloudFrontRequest {
    uri: string;
    [key: string]: unknown;
}

let cachedHandler: ((event: { request: CloudFrontRequest }) => CloudFrontRequest) | undefined;

function loadHandler() {
    if (!cachedHandler) {
        // Evaluated in this realm so the handler can be handed plain fixtures.
        // A separate `vm` context produces cross-realm objects whose property
        // access fails when passed a normal object literal.
        vm.runInThisContext(`${source}\n;;globalThis.__lsCleanUrlHandler = handler;`, {
            filename: "clean-url-rewrite.js",
        });
        cachedHandler = (globalThis as unknown as Record<string, unknown>)
            .__lsCleanUrlHandler as typeof cachedHandler;
        delete (globalThis as unknown as Record<string, unknown>).__lsCleanUrlHandler;
    }
    return cachedHandler!;
}

/** Returns the rewritten URI. The handler mutates and returns `request`. */
function rewrite(uri: string): string {
    return loadHandler()({ request: { uri } }).uri;
}

describe("CloudFront Functions runtime constraints", () => {
    // Comments legitimately mention these words while explaining the
    // constraints, so strip them before asserting on executable code.
    const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line: string) => !line.trimStart().startsWith("//"))
        .join("\n");

    it("exposes a handler and uses no ESM module syntax", () => {
        expect(typeof loadHandler()).toBe("function");
        // CloudFront Functions has no module system — an import/export here
        // would fail to deploy at all.
        expect(code).not.toMatch(/\bexport\b/);
        expect(code).not.toMatch(/\bimport\b/);
    });

    it("uses no Node-only APIs or async syntax in executable code", () => {
        expect(code).not.toMatch(/\brequire\s*\(/);
        expect(code).not.toMatch(/\bprocess\./);
        expect(code).not.toMatch(/\basync\b/);
        expect(code).not.toMatch(/\bawait\b/);
    });
});

describe("clean document URLs map to their prerendered file", () => {
    it("maps every prerendered route to <route>/index.html", () => {
        // The coupling that matters: if a route is prerendered but the rewrite
        // cannot resolve it, that page is unreachable. PRERENDER_PATHS is the
        // full prerender set, so this covers the /404 error document too —
        // CloudFront must be able to fetch the body it serves for 403/404.
        for (const path of PRERENDER_PATHS) {
            const expected = path === "/" ? "/index.html" : `${path}/index.html`;
            expect(rewrite(path), `route ${path}`).toBe(expected);
        }
    });

    it("resolves the error document CloudFront serves for 403/404", () => {
        expect(rewrite("/404")).toBe("/404/index.html");
    });

    it("maps the site root to the root index", () => {
        expect(rewrite("/")).toBe("/index.html");
    });

    it("maps the login and register pages", () => {
        expect(rewrite("/login")).toBe("/login/index.html");
        expect(rewrite("/register")).toBe("/register/index.html");
    });

    it("handles deep documentation slugs", () => {
        expect(rewrite("/docs/metrics-defined")).toBe("/docs/metrics-defined/index.html");
        expect(rewrite("/docs/app-wont-open")).toBe("/docs/app-wont-open/index.html");
    });

    it("treats a trailing slash as a directory request", () => {
        expect(rewrite("/pricing/")).toBe("/pricing/index.html");
        expect(rewrite("/docs/qr-studio/")).toBe("/docs/qr-studio/index.html");
    });
});

describe("file requests are never rewritten", () => {
    it("leaves crawler and manifest files untouched", () => {
        expect(rewrite("/sitemap.xml")).toBe("/sitemap.xml");
        expect(rewrite("/robots.txt")).toBe("/robots.txt");
        expect(rewrite("/llms.txt")).toBe("/llms.txt");
        expect(rewrite("/brand/manifest.webmanifest")).toBe("/brand/manifest.webmanifest");
    });

    it("leaves hashed build assets untouched", () => {
        expect(rewrite("/assets/index-abc123.js")).toBe("/assets/index-abc123.js");
        expect(rewrite("/assets/index-abc123.css")).toBe("/assets/index-abc123.css");
    });

    it("leaves brand assets untouched", () => {
        expect(rewrite("/brand/og-image.png")).toBe("/brand/og-image.png");
        expect(rewrite("/brand/favicon.ico")).toBe("/brand/favicon.ico");
        expect(rewrite("/brand/favicon.svg")).toBe("/brand/favicon.svg");
        expect(rewrite("/brand/icon-512.png")).toBe("/brand/icon-512.png");
    });

    it("leaves product screenshots untouched", () => {
        expect(rewrite("/product/product-analytics-dark.png")).toBe(
            "/product/product-analytics-dark.png",
        );
    });

    it("detects extensions on the final segment only", () => {
        // A dotted directory must not rescue a clean leaf.
        expect(rewrite("/docs/v1.2/qr-studio")).toBe("/docs/v1.2/qr-studio/index.html");
    });
});

describe("the request object is preserved apart from the uri", () => {
    it("does not drop other request fields", () => {
        const event = {
            request: {
                uri: "/pricing",
                method: "GET",
                querystring: { utm_source: { value: "newsletter" } },
                headers: { host: { value: "linkshift.in" } },
            },
        };

        const out = loadHandler()(event);

        expect(out.uri).toBe("/pricing/index.html");
        expect(out.method).toBe("GET");
        expect(out.querystring).toEqual({ utm_source: { value: "newsletter" } });
        expect(out.headers).toEqual({ host: { value: "linkshift.in" } });
    });

    it("is deterministic — the same input always yields the same output", () => {
        expect(rewrite("/pricing")).toBe(rewrite("/pricing"));
        expect(rewrite("/assets/a.js")).toBe(rewrite("/assets/a.js"));
    });
});

describe("unknown clean routes do not become soft 404s", () => {
    it("maps an unknown path to a missing object rather than the homepage", () => {
        // Rewriting to "/index.html" would return the homepage WITH a 200 —
        // a soft 404 Google reports as a duplicate of "/". Mapping to the
        // non-existent /<path>/index.html instead lets CloudFront's custom
        // error response serve the branded 404 with a real 404 status.
        expect(rewrite("/definitely-not-a-page")).toBe("/definitely-not-a-page/index.html");
        expect(rewrite("/definitely-not-a-page")).not.toBe("/index.html");
    });
});
