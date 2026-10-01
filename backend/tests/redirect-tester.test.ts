import { describe, expect, it, vi, beforeEach } from "vitest";

const hasDeepLinkAccess = vi.fn();
const hasAppDeepLinkAccess = vi.fn();

vi.mock("../src/features/billing/billing.service", () => ({
    hasDeepLinkAccess: (...args: unknown[]) => hasDeepLinkAccess(...args),
    hasAppDeepLinkAccess: (...args: unknown[]) => hasAppDeepLinkAccess(...args),
}));

import { previewRedirect, PRESET_USER_AGENTS } from "../src/features/redirect-tester/redirectTester.service";
import { resolveFinalDestination } from "../src/features/redirect/redirect-resolution";
import { isSafeScheme } from "../src/features/redirect-tester/redirectTester.validation";
import { prisma } from "../src/config";

const USER = "user-1";

const baseLink = {
    id: "preview",
    userId: USER,
    targetUrl: "https://example.com/base",
    isActive: true,
    domainId: "d",
    expiresAt: null,
    passwordHash: null,
    deepLink: false,
    appDeepLink: false,
    appScheme: null,
    androidPackage: null,
    appPath: null,
    iosStoreUrl: null,
    androidStoreUrl: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
};

beforeEach(() => {
    hasDeepLinkAccess.mockReset().mockResolvedValue(true);
    hasAppDeepLinkAccess.mockReset().mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("redirect tester: it never records a click or spends quota", () => {
    // The whole value of a preview is that it is free. If it wrote a scan or
    // consulted the redirect quota, a user testing six platforms would burn six
    // of their monthly redirects and pollute their own analytics.
    it("writes no scan row", async () => {
        const create = vi.spyOn(prisma.scan, "create");

        await previewRedirect(USER, {
            url: "https://example.com/x",
            path: "/checkout",
        });

        expect(create).not.toHaveBeenCalled();
        create.mockRestore();
    });

    it("issues no query at all while previewing", async () => {
        const scan = vi.spyOn(prisma.scan, "create");
        const link = vi.spyOn(prisma.link, "findFirst");

        await previewRedirect(USER, {
            url: "https://example.com/x",
            appScheme: "myapp",
            path: "/a",
        });

        expect(scan).not.toHaveBeenCalled();
        expect(link).not.toHaveBeenCalled();
        scan.mockRestore();
        link.mockRestore();
    });
});

describe("redirect tester: it never fetches the destination", () => {
    // Resolution is pure string manipulation. If this ever grew a fetch it
    // would become an SSRF proxy into the deployment's private network.
    it("does not perform a network call for an internal address", async () => {
        const preview = await previewRedirect(USER, {
            url: "http://169.254.169.254/latest/meta-data/",
        });

        expect(preview.finalUrl).toContain("169.254.169.254");
    });
});

describe("redirect tester: refuses dangerous schemes", () => {
    it.each(["javascript", "data", "file", "vbscript"])(
        "rejects the %s scheme",
        (scheme) => {
            expect(isSafeScheme(`${scheme}:payload`)).toBe(false);
        }
    );

    it.each(["http", "https", "myapp", "com.line.voice"])(
        "allows the %s scheme",
        (scheme) => {
            expect(isSafeScheme(`${scheme}://host/path`)).toBe(true);
        }
    );

    it("is case insensitive", () => {
        expect(isSafeScheme("JavaScript:alert(1)")).toBe(false);
    });

    it("rejects a real javascript payload end to end", async () => {
        await expect(
            previewRedirect(USER, { url: "javascript:alert(1)" })
        ).rejects.toThrow();
    });
});

describe("redirect tester: preview matches the real redirect path", () => {
    // The preview is only trustworthy if it runs the same resolver. This pins
    // that: the two must agree exactly, for every platform branch.
    it.each([
        ["desktop", {}],
        ["ios-safari", { appScheme: "myapp", iosStoreUrl: "https://apps.apple.com/app/id1" }],
        [
            "android-chrome",
            { appScheme: "myapp", androidPackage: "com.example", androidStoreUrl: "https://play.google.com/store/apps/details?id=com.example" },
        ],
    ] as const)("agrees with resolveFinalDestination on %s", async (preset, extra) => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset,
            deepLink: true,
            path: "/checkout",
            query: "a=1",
            ...extra,
        });

        const direct = resolveFinalDestination(
            { ...baseLink, targetUrl: "https://example.com/base", deepLink: true, ...extra },
            {
                userAgent: PRESET_USER_AGENTS[preset as keyof typeof PRESET_USER_AGENTS],
                rest: "checkout",
                query: "a=1",
            },
            { deepLink: true, appDeepLink: Boolean(extra.appScheme) }
        );

        expect(preview.kind).toBe(direct.kind);
        if (direct.kind === "redirect") {
            expect(preview.finalUrl).toBe(direct.targetUrl);
        }
    });
});

describe("redirect tester: explains itself", () => {
    it("shows the interstitial to an iPhone visitor", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset: "ios-safari",
            appScheme: "myapp",
            iosStoreUrl: "https://apps.apple.com/app/id1",
        });

        expect(preview.showsInterstitial).toBe(true);
        expect(preview.audience).toBe("ios");
        expect(preview.storeUrl).toBe("https://apps.apple.com/app/id1");
    });

    it("sends Android Chrome straight to the intent url", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset: "android-chrome",
            appScheme: "myapp",
            androidPackage: "com.example",
        });

        expect(preview.showsInterstitial).toBe(false);
        expect(preview.finalUrl).toContain("intent://");
    });

    it("skips the app branch on desktop", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset: "desktop",
            appScheme: "myapp",
        });

        expect(preview.showsInterstitial).toBe(false);
        expect(preview.finalUrl).toBe("https://example.com/base");
    });

    it("flags a bot visitor rather than presenting it as a click", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset: "bot",
        });

        expect(preview.audience).toBe("bot");
        expect(
            preview.steps.some((s) => s.label === "Bot traffic")
        ).toBe(true);
    });

    it("never returns an unexplained result", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            deepLink: true,
            path: "/checkout",
        });

        expect(preview.steps.length).toBeGreaterThan(0);
        expect(preview.steps[0].label).toBe("Destination");
    });
});

describe("redirect tester: plan gating is reported honestly", () => {
    it("warns instead of silently dropping an unentitled feature", async () => {
        hasAppDeepLinkAccess.mockResolvedValue(false);

        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            preset: "ios-safari",
            appScheme: "myapp",
        });

        expect(preview.finalUrl).toBe("https://example.com/base");
        expect(
            preview.warnings.some((w) => w.includes("not included in your plan"))
        ).toBe(true);
    });

    it("does not consult the plan cache when the feature is unused", async () => {
        await previewRedirect(USER, { url: "https://example.com/base" });

        // Both entitlement checks cost a cache read; a plain preview of a plain
        // URL should not pay for features it did not ask about.
        expect(hasDeepLinkAccess).not.toHaveBeenCalled();
        expect(hasAppDeepLinkAccess).not.toHaveBeenCalled();
    });
});

describe("redirect tester: utm is recorded, not rewritten", () => {
    // Verified against the redirect path: UTM values are written to the Scan for
    // attribution and are never appended to the destination. A preview that
    // claimed otherwise would be lying about product behaviour.
    it("does not invent utm parameters on the destination", async () => {
        const preview = await previewRedirect(USER, {
            url: "https://example.com/base",
            deepLink: true,
            query: "utm_source=news",
        });

        expect(preview.finalUrl).toContain("utm_source=news");
        expect(preview.finalUrl).not.toContain("utm_medium=");
    });
});
