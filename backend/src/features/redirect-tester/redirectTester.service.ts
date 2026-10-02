import {
    buildAppUrl,
    buildIntentUrl,
    detectMobilePlatform,
    isAndroidChromium,
} from "../../utils/appDeepLink";
import { applyDeepLinkTo } from "../../utils/completeRedirect";
import { hasAppDeepLinkAccess, hasDeepLinkAccess } from "../billing/billing.service";
import type { CachedLink } from "../redirect/redirect.service";
import { resolveFinalDestination } from "../redirect/redirect-resolution";
import {
    redirectTesterSchema,
    type RedirectTesterRequest,
    type TesterPreset,
} from "./redirectTester.validation";

/**
 * Real user agents, so each preset exercises the same detection the live path
 * uses rather than a simplified stand-in that could pass while the real branch
 * is broken.
 */
export const PRESET_USER_AGENTS: Record<TesterPreset, string> = {
    desktop:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "ios-safari":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    // Chrome on iOS still reports CriOS, so the iOS branch is the correct one.
    "ios-chrome":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1",
    "android-chrome":
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    "android-firefox":
        "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
    bot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

export type PreviewStep = {
    label: string;
    detail: string;
};

export type RedirectPreview = {
    /** Where this visitor would actually land. */
    finalUrl: string;
    kind: "redirect" | "interstitial";
    preset: TesterPreset;
    /** Detected platform, or `desktop` / `bot` for clarity in the UI. */
    audience: "ios" | "android" | "desktop" | "bot";
    /** True when a store or interstitial screen is shown before the destination. */
    showsInterstitial: boolean;
    /** The app URL that would be attempted, when an app deep link applies. */
    appUrl: string | null;
    /** The Play Store URL offered on the interstitial. */
    storeUrl: string | null;
    deepLinkApplied: boolean;
    appDeepLinkApplied: boolean;
    /** Ordered explanation, so the result is never an unexplained URL. */
    steps: PreviewStep[];
    /** Non-fatal observations worth surfacing. */
    warnings: string[];
};

const classifyBot = (userAgent: string): boolean =>
    /bot|crawler|spider|crawling|slurp|curl\/|wget|python-requests|headless/i.test(userAgent);

/**
 * Produces a preview of where a link would send a given visitor.
 *
 * Strictly read-only. It never writes a scan, never consults the redirect
 * quota, and never opens an HTTP connection to the destination: the answer is
 * computed by the same pure resolver the live redirect uses. That is what makes
 * it safe to run against arbitrary user input, and it is why a preview can
 * never burn a customer's monthly redirect allowance.
 */
export const previewRedirect = async (
    userId: string,
    input: unknown
): Promise<RedirectPreview> => {
    const data: RedirectTesterRequest = redirectTesterSchema.parse(input);

    const userAgent = data.userAgent || PRESET_USER_AGENTS[data.preset];
    const rest = data.path.replace(/^\/+/, "").replace(/\/+$/, "");
    const query = data.query.replace(/^\?/, "");

    const hasAppScheme = Boolean(data.appScheme?.trim());
    const wantsAppDeepLink = hasAppScheme;

    // Entitlement is the caller's real plan, so the preview answers "what would
    // my link do", not "what could it do if I upgrade".
    const deepLinkEntitled = data.deepLink ? await hasDeepLinkAccess(userId) : false;
    const appDeepLinkEntitled = wantsAppDeepLink
        ? await hasAppDeepLinkAccess(userId)
        : false;

    const link: CachedLink = {
        id: "preview",
        userId,
        targetUrl: data.url,
        isActive: true,
        domainId: "preview",
        expiresAt: null,
        passwordHash: null,
        deepLink: data.deepLink,
        appDeepLink: wantsAppDeepLink,
        appScheme: data.appScheme ?? null,
        androidPackage: data.androidPackage ?? null,
        appPath: data.appPath ?? null,
        iosStoreUrl: data.iosStoreUrl ?? null,
        androidStoreUrl: data.androidStoreUrl ?? null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        ogTitle: null,
        ogDescription: null,
        ogImageUrl: null,
    };

    const access = {
        deepLink: deepLinkEntitled,
        appDeepLink: appDeepLinkEntitled,
    };

    const steps: PreviewStep[] = [];
    const warnings: string[] = [];

    steps.push({
        label: "Destination",
        detail: data.url,
    });

    if (data.deepLink) {
        if (deepLinkEntitled) {
            steps.push({
                label: "Path forwarding",
                detail: rest
                    ? `"${rest}" is appended to the destination path.`
                    : "Enabled, but no path was supplied, so the destination is unchanged.",
            });
        } else {
            warnings.push(
                "Path forwarding is on the link but not included in your plan, so it will not be applied."
            );
        }
    }

    if (query) {
        const forwarded = new URLSearchParams(query);
        const pairs = [...forwarded.keys()];
        if (data.deepLink && deepLinkEntitled) {
            steps.push({
                label: "Query forwarding",
                detail: `${pairs.length} parameter${pairs.length === 1 ? "" : "s"} (${pairs.join(
                    ", "
                )}) forwarded to the destination.`,
            });
        } else {
            warnings.push(
                "A query string was supplied but query forwarding needs path forwarding, which is not active. It will be dropped."
            );
        }
    }

    const platform = detectMobilePlatform(userAgent);
    const isBot = classifyBot(userAgent);
    const audience: RedirectPreview["audience"] = isBot
        ? "bot"
        : platform ?? "desktop";

    let appUrl: string | null = null;
    let storeUrl: string | null = null;

    if (wantsAppDeepLink) {
        if (!appDeepLinkEntitled) {
            warnings.push(
                "App deep links are not included in your plan, so the destination will be used as-is."
            );
        } else if (!platform) {
            steps.push({
                label: "App deep link",
                detail:
                    "Skipped. App deep links only apply to iOS and Android visitors; this one is on desktop.",
            });
        } else {
            const cfg = {
                appScheme: data.appScheme!,
                androidPackage: data.androidPackage ?? null,
                appPath: data.appPath ?? null,
                iosStoreUrl: data.iosStoreUrl ?? null,
                androidStoreUrl: data.androidStoreUrl ?? null,
            };

            appUrl = buildAppUrl(cfg, rest, query);

            if (platform === "android" && isAndroidChromium(userAgent) && cfg.androidPackage) {
                storeUrl = cfg.androidStoreUrl;
                steps.push({
                    label: "App deep link",
                    detail: `Android Chrome supports direct app links, so this visitor goes straight to ${appUrl} without an interstitial.`,
                });
            } else {
                storeUrl = platform === "ios" ? cfg.iosStoreUrl : cfg.androidStoreUrl;
                steps.push({
                    label: "App deep link",
                    detail: `This visitor sees an interstitial offering the store, then opens ${appUrl} if the app is installed.`,
                });

                if (platform === "android" && !cfg.androidPackage) {
                    warnings.push(
                        "No Android package is set, so Android Chrome cannot deep link directly and will show the interstitial instead."
                    );
                }
            }
        }
    }

    if (isBot) {
        steps.push({
            label: "Bot traffic",
            detail:
                "Recorded as a machine request and excluded from your click analytics and redirect quota. It still receives this destination.",
        });
    }

    const webFallback = data.deepLink && deepLinkEntitled
        ? applyDeepLinkTo(data.url, rest, query)
        : data.url;

    if (isBot || !platform) {
        steps.push({ label: "Result", detail: webFallback });
    } else if (!wantsAppDeepLink || !appDeepLinkEntitled) {
        steps.push({ label: "Result", detail: webFallback });
    }

    const resolved = resolveFinalDestination(
        link,
        { userAgent, rest, query },
        access
    );

    // `resolveFinalDestination` is the authority on the outcome. The narration
    // above only explains it, so the two cannot disagree about where a visitor
    // ends up.
    //
    // Narrowed to the two kinds this service can actually produce. The
    // "preview" kind is not reachable here: it is gated on a crawler user agent,
    // and the tester deliberately drives the resolver with a real platform
    // agent so it can describe a human visitor.
    const finalUrl = resolved.kind === "redirect" ? resolved.targetUrl : webFallback;
    const kind: "redirect" | "interstitial" =
        resolved.kind === "interstitial" ? "interstitial" : "redirect";

    return {
        finalUrl,
        kind,
        preset: data.preset,
        audience,
        showsInterstitial: resolved.kind === "interstitial",
        appUrl,
        storeUrl,
        deepLinkApplied: data.deepLink && deepLinkEntitled && Boolean(rest || query),
        appDeepLinkApplied: appDeepLinkEntitled && Boolean(platform),
        steps,
        warnings,
    };
};
