import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { cspNonce, securityHeaders } from "../src/middleware/security";
import { createCspNonce, cspNonceFor } from "../src/utils/csp";
import { renderUnlockPage } from "../src/utils/unlockPage";
import { renderAppInterstitial } from "../src/utils/appDeepLink";
import { renderPublicError } from "../src/middleware/error.middleware";

/**
 * Regression coverage for the Content-Security-Policy on the redirect host.
 *
 * The API serves three hand-written HTML documents with inline <style>
 * (unlock page, branded public error page, mobile app interstitial) and the
 * interstitial also carries an inline <script>. Helmet's default policy is
 * `style-src 'self'; script-src 'self'`, which blocked all of them: the
 * unlock page and error page rendered unstyled, and the interstitial's script
 * never ran so app deep links never advanced to the store.
 *
 * The fix adds a per-response nonce to `style-src`/`script-src` and echoes it
 * into the inline tags, instead of weakening the policy with 'unsafe-inline'.
 */
const NONCE = "dGVzdC1ub25jZS1iYXNlNjQ=";

/**
 * Mounts the same middleware pair app.ts uses, on a throwaway router, so this
 * suite asserts the real shipped configuration without pulling in the whole
 * application (and its database pool).
 */
const probeApp = () => {
    const mini = express();
    mini.use(cspNonce);
    mini.use(securityHeaders);
    mini.get("/", (_req, res) => {
        res.type("html").send(
            renderPublicError(404, "This short link doesn't exist.", cspNonceFor(res)),
        );
    });
    return mini;
};

describe("CSP header", () => {
    it("emits a script-src/style-src that carries a nonce, not 'unsafe-inline'", async () => {
        const res = await request(probeApp()).get("/");

        const csp = res.headers["content-security-policy"];
        expect(csp).toBeDefined();

        // 'unsafe-inline' must not be reintroduced.
        expect(csp).not.toContain("'unsafe-inline'");

        expect(csp).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
        expect(csp).toMatch(/style-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);

        // Helmet's other defaults must survive.
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("frame-ancestors 'self'");
        // The inline SVG favicon on every page is a data: URI.
        expect(csp).toMatch(/img-src [^;]*data:/);
    });

    it("emits the same nonce in the header and in the inline tag", async () => {
        const res = await request(probeApp()).get("/");

        const nonce = /'nonce-([^']+)'/.exec(
            res.headers["content-security-policy"],
        )?.[1];

        expect(nonce).toBeTruthy();
        expect(res.text).toContain(`<style nonce="${nonce}">`);
    });

    it("issues a different nonce per response", async () => {
        const app = probeApp();
        const [a, b] = await Promise.all([
            request(app).get("/"),
            request(app).get("/"),
        ]);

        const nonceOf = (res: request.Response) =>
            /'nonce-([^']+)'/.exec(res.headers["content-security-policy"])?.[1];

        expect(nonceOf(a)).toBeTruthy();
        expect(nonceOf(a)).not.toBe(nonceOf(b));
    });
});

describe("inline tags carry the response nonce", () => {
    it("tags the unlock page style block", () => {
        const html = renderUnlockPage({
            shortId: "abc1234",
            rest: "",
            query: "",
            nonce: NONCE,
        });

        expect(html).toContain(`<style nonce="${NONCE}">`);
    });

    it("tags the public error page style block", () => {
        const html = renderPublicError(404, "This short link doesn't exist.", NONCE);

        expect(html).toContain(`<style nonce="${NONCE}">`);
    });

    it("tags both the style and the script on the app interstitial", () => {
        const html = renderAppInterstitial({
            platform: "ios",
            appUrl: "myapp://open",
            fallbackUrl: "https://example.com",
            nonce: NONCE,
        });

        expect(html).toContain(`<style nonce="${NONCE}">`);
        expect(html).toContain(`<script nonce="${NONCE}">`);
    });

    it("still renders valid markup when no nonce is supplied", () => {
        expect(renderUnlockPage({ shortId: "a", rest: "", query: "" })).toContain("<style>");
        expect(renderPublicError(404, "gone")).toContain("<style>");
    });
});

describe("nonce helpers", () => {
    it("generates a fresh high-entropy nonce per response", () => {
        const a = createCspNonce();
        const b = createCspNonce();

        expect(a).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
        expect(a).not.toBe(b);

        expect(cspNonceFor({ locals: { cspNonce: a } })).toBe(a);
    });

    it("returns an empty nonce when the middleware has not run", () => {
        expect(cspNonceFor(undefined)).toBe("");
        expect(cspNonceFor({})).toBe("");
    });
});