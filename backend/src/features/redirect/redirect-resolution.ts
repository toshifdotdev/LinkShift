import { Request } from "express";
import {
    AppDeepLinkConfig,
    buildAppUrl,
    buildIntentUrl,
    detectMobilePlatform,
    extractQuery,
    extractRest,
    isAndroidChromium,
    renderAppInterstitial,
} from "../../utils/appDeepLink";
import { applyDeepLinkTo } from "../../utils/completeRedirect";
import { cspNonceForReq } from "../../utils/csp";
import type { CachedLink } from "./redirect.service";

/**
 * Everything resolution needs, as plain data.
 *
 * The redirect path can reach into an Express `Request` for these values, but
 * the redirect tester has no request to reach into. Carrying them explicitly
 * lets one pure function serve both, so a preview cannot disagree with the
 * behaviour a real visitor gets.
 */
export type RedirectContext = {
    userAgent: string;
    /** Path segments captured after the slug, e.g. `/checkout/step-2`. */
    rest: string;
    /** Raw query string without the leading `?`. */
    query: string;
    /** CSP nonce for the interstitial. Absent outside the live request path. */
    nonce?: string;
};

/** Whether the link's owner is entitled to the paid destination features. */
export type DestinationAccess = {
    deepLink: boolean;
    appDeepLink: boolean;
};

export type ResolvedRedirect =
    | {
        kind: "redirect";
        targetUrl: string;
    }
    | {
        kind: "interstitial";
        html: string;
    };

/**
 * Reads the resolution inputs off a live request.
 *
 * Each read is guarded. Only the app deep link branch needs the captured path,
 * the query, or a CSP nonce, and a request that is not carrying an app deep
 * link has no reason to require any of them. Guarding keeps resolution usable
 * for a plain redirect, where `params` and `res` are not guaranteed to be
 * populated.
 */
export const contextFromRequest = (req: Request): RedirectContext => ({
    userAgent: req.headers?.["user-agent"] ?? "",
    rest: req.params ? extractRest(req.params as Record<string, unknown>) : "",
    query: extractQuery(req.url ?? ""),
    nonce: req.res ? cspNonceForReq(req) : undefined,
});

/**
 * Decides where a link actually sends someone.
 *
 * Pure: no database, no cache, no analytics write, no quota check. Recording
 * that a human clicked is a separate concern handled by `completeTargetUrl`
 * before this runs on the live path. Keeping the two apart is what makes a
 * side-effect-free preview possible, and it is why this function is safe to
 * point at arbitrary user input.
 */
export const resolveFinalDestination = (
    link: CachedLink,
    ctx: RedirectContext,
    access: DestinationAccess
): ResolvedRedirect => {
    let finalUrl = link.targetUrl;

    if (access.deepLink) {
        finalUrl = applyDeepLinkTo(finalUrl, ctx.rest, ctx.query);
    }

    if (access.appDeepLink && link.appScheme) {
        const platform = detectMobilePlatform(ctx.userAgent);

        if (platform) {
            const cfg: AppDeepLinkConfig = {
                appScheme: link.appScheme,
                androidPackage: link.androidPackage,
                appPath: link.appPath,
                iosStoreUrl: link.iosStoreUrl,
                androidStoreUrl: link.androidStoreUrl,
            };

            if (platform === "android" && isAndroidChromium(ctx.userAgent) && cfg.androidPackage) {
                return {
                    kind: "redirect",
                    targetUrl: buildIntentUrl(cfg, ctx.rest, ctx.query, finalUrl),
                };
            }

            return {
                kind: "interstitial",
                html: renderAppInterstitial({
                    platform,
                    appUrl: buildAppUrl(cfg, ctx.rest, ctx.query),
                    fallbackUrl: finalUrl,
                    storeUrl: platform === "ios" ? cfg.iosStoreUrl : cfg.androidStoreUrl,
                    nonce: ctx.nonce,
                }),
            };
        }
    }

    return {
        kind: "redirect",
        targetUrl: finalUrl,
    };
};
