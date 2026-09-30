import helmet from "helmet";
import { cspNonceFor, cspNonceMiddleware } from "../utils/csp";

/**
 * HTTP security headers for the redirect host.
 *
 * The redirect host serves JSON for the API and three hand-written HTML
 * documents (password unlock page, branded public error page, mobile app
 * interstitial). Each has an inline <style> block and the interstitial also
 * has an inline <script>.
 *
 * Helmet's default policy is `style-src 'self'; script-src 'self'`, which
 * blocked all of them outright: the unlock page and the error page rendered
 * unstyled, and the interstitial's script never ran, so an app deep link
 * never advanced to the store.
 *
 * The fix keeps every other default directive and adds a per-response nonce
 * to `style-src`/`script-src`. `'unsafe-inline'` is deliberately not used:
 * these documents interpolate escaped request data, so the policy stays strict.
 * The nonce middleware must be registered before this (see app.ts).
 */
export const cspNonce = cspNonceMiddleware;

export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", (_req, res) => `'nonce-${cspNonceFor(res)}'`],
            "style-src": ["'self'", (_req, res) => `'nonce-${cspNonceFor(res)}'`],
        },
    },
});