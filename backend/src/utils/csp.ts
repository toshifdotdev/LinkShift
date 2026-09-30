import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * The redirect host serves three hand-written HTML documents — the password
 * unlock page, the branded public error page, and the mobile app interstitial
 * — each with an inline <style> block, and the interstitial also carries an
 * inline <script>. Helmet's default Content-Security-Policy allows
 * `style-src 'self'` and `script-src 'self'` only, which blocks all of them.
 *
 * Rather than weakening the policy with 'unsafe-inline', each response gets a
 * fresh nonce that Helmet writes into the header and the templates echo into
 * their inline tags. Nonces stay strict, and they remain correct for the
 * templates whose inline content varies per request.
 *
 * This middleware must be registered before Helmet: Helmet resolves
 * function-valued directives while building the response header, so the
 * nonce has to already be on `res.locals`.
 */
export const createCspNonce = (): string => randomBytes(16).toString('base64');

export const cspNonceMiddleware = (
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    res.locals.cspNonce = createCspNonce();
    next();
};

/**
 * Helmet's function-valued directives receive the underlying Node
 * `ServerResponse`, not Express's `Response`. Express puts `locals` on that
 * same object at runtime, but the Node type does not declare it and will not
 * structurally match a type whose only property is optional, so the carrier
 * is narrowed from `unknown` here.
 */
export const cspNonceFor = (res: unknown): string => {
    const locals = (res as { locals?: unknown } | undefined)?.locals as
        | { cspNonce?: unknown }
        | undefined;
    return typeof locals?.cspNonce === 'string' ? locals.cspNonce : '';
};

export const cspNonceForReq = (req: Request): string =>
    cspNonceFor(req.res);

/** Render a nonce attribute, or nothing when there is no nonce to carry. */
export const nonceAttr = (nonce: string): string =>
    nonce ? ` nonce="${nonce}"` : '';