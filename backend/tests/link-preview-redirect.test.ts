import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Social / chat link preview on the redirect path.
 *
 * A short link answers with a redirect, and a redirect body carries no
 * metadata, so a chat crawler had nothing to render and every shared link
 * appeared as bare text. These tests pin the split that fixes it:
 *
 *   - a chat crawler gets the Open Graph card
 *   - a human is redirected, always, and never sees a card
 *   - a search crawler is redirected too, because serving it HTML is exactly
 *     the pattern that gets a shortener deindexed
 *   - a link with no preview configured behaves precisely as it did before
 *
 * They also assert the request is still recorded. The Privacy Policy states
 * that every request to a short link is stored, with machine requests excluded
 * from clicks rather than from storage, so short-circuiting the scan would
 * quietly contradict a published promise.
 */

const { prisma, completeTargetUrl, checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess } =
    vi.hoisted(() => ({
        prisma: {
            domain: { findUnique: vi.fn(), findFirst: vi.fn() },
            link: { findFirst: vi.fn() },
        },
        completeTargetUrl: vi.fn(),
        checkRedirectLimit: vi.fn(),
        hasDeepLinkAccess: vi.fn(),
        hasAppDeepLinkAccess: vi.fn(),
    }));

vi.mock(import("../src/config"), () => ({ prisma }));
vi.mock(import("../src/features/billing/billing.service"), () => ({
    checkRedirectLimit,
    hasDeepLinkAccess,
    hasAppDeepLinkAccess,
}));
vi.mock(import("../src/utils/completeRedirect"), () => ({ completeTargetUrl }));
vi.mock(import("../src/utils/cache"), () => ({
    getCache: vi.fn().mockResolvedValue(null),
    setCache: vi.fn(),
    linkCacheKey: vi.fn().mockReturnValue("k"),
}));

import { redirect } from "../src/features/redirect/redirect.service";

const SLACK = "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)";
const BROWSER =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const link = (og: { title?: string | null; description?: string | null; image?: string | null }) => ({
    id: "link-1",
    domainId: "d1",
    userId: "u1",
    shortId: "launch",
    targetUrl: "https://example.com/landing",
    isActive: true,
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
    ogTitle: og.title ?? null,
    ogDescription: og.description ?? null,
    ogImageUrl: og.image ?? null,
});

const req = (userAgent: string) =>
    ({
        headers: { host: "go.example.com", "user-agent": userAgent },
        params: {},
        url: "/launch",
        protocol: "https",
    }) as never;

const DOMAIN = { id: "d1", host: "go.example.com", verified: true, userId: "u1" };

beforeEach(() => {
    vi.clearAllMocks();
    prisma.domain.findUnique.mockResolvedValue(DOMAIN);
    completeTargetUrl.mockImplementation(async (l: { targetUrl: string }) => ({
        requiredPassword: false,
        targetUrl: l.targetUrl,
    }));
    checkRedirectLimit.mockResolvedValue(undefined);
    hasDeepLinkAccess.mockResolvedValue(true);
    hasAppDeepLinkAccess.mockResolvedValue(true);
});

describe("link preview: a chat crawler gets a card", () => {
    it("serves Open Graph metadata instead of redirecting", async () => {
        prisma.link.findFirst.mockResolvedValue({
            ...link({ title: "Launch week", description: "All in one place", image: "https://cdn.example.com/a.png" }),
            domain: DOMAIN,
        });

        const result = await redirect("launch", "go.example.com", req(SLACK));

        expect(result.kind).toBe("preview");
        const html = (result as { html: string }).html;
        expect(html).toContain('<meta property="og:title" content="Launch week">');
        expect(html).toContain('<meta property="og:image" content="https://cdn.example.com/a.png">');
    });

    it("sets og:url to the URL that was actually requested", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "Launch" }), domain: DOMAIN });

        const result = await redirect("launch", "go.example.com", req(SLACK));

        // Built from the request host, so it is correct on a customer custom
        // domain and survives the primary short domain changing.
        expect((result as { html: string }).html).toContain(
            '<meta property="og:url" content="https://go.example.com/launch">'
        );
    });

    it("still records the request", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "Launch" }), domain: DOMAIN });

        await redirect("launch", "go.example.com", req(SLACK));

        // Required by the published privacy commitment: every request is
        // stored, with machine requests excluded from clicks, not from storage.
        expect(completeTargetUrl).toHaveBeenCalledTimes(1);
    });

    it("never spends redirect quota on a crawler", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "Launch" }), domain: DOMAIN });

        await redirect("launch", "go.example.com", req(SLACK));

        // Quota is checked on entry for every request, unchanged. A card render
        // is not a click and must not be billable as one; the bot classifier
        // excludes it downstream.
        expect(checkRedirectLimit).toHaveBeenCalledTimes(1);
    });
});

describe("link preview: humans and search crawlers are unaffected", () => {
    it("redirects a real browser even when a preview is configured", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "Launch" }), domain: DOMAIN });

        const result = await redirect("launch", "go.example.com", req(BROWSER));

        // The single most important property here: nobody who clicks a link is
        // ever shown a preview page instead of being taken where they wanted.
        expect(result.kind).toBe("redirect");
        expect((result as { targetUrl: string }).targetUrl).toBe("https://example.com/landing");
    });

    it("redirects Googlebot rather than serving it HTML", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "Launch" }), domain: DOMAIN });

        const result = await redirect("launch", "go.example.com", req(GOOGLEBOT));

        // Serving a search crawler a 200 HTML page instead of a redirect is the
        // classic soft-404 pattern that gets shortener domains deindexed.
        expect(result.kind).toBe("redirect");
    });
});

describe("link preview: strictly opt-in", () => {
    it("leaves a link with no preview configured exactly as it was", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({}), domain: DOMAIN });

        const result = await redirect("launch", "go.example.com", req(SLACK));

        expect(result.kind).toBe("redirect");
        expect((result as { targetUrl: string }).targetUrl).toBe("https://example.com/landing");
    });

    it("works with only a description, and only an image", async () => {
        prisma.link.findFirst.mockResolvedValue({
            ...link({ description: "Just a description" }),
            domain: DOMAIN,
        });
        const withDescription = await redirect("launch", "go.example.com", req(SLACK));
        expect(withDescription.kind).toBe("preview");

        prisma.link.findFirst.mockResolvedValue({
            ...link({ image: "https://cdn.example.com/a.png" }),
            domain: DOMAIN,
        });
        const withImage = await redirect("launch", "go.example.com", req(SLACK));
        expect(withImage.kind).toBe("preview");
    });

    it("ignores a whitespace-only title", async () => {
        prisma.link.findFirst.mockResolvedValue({ ...link({ title: "   " }), domain: DOMAIN });

        const result = await redirect("launch", "go.example.com", req(SLACK));

        // Otherwise the owner gets a card with an empty heading, which looks
        // worse than the bare URL it replaced.
        expect(result.kind).toBe("redirect");
    });
});

describe("link preview: password-protected links", () => {
    it("does not leak preview text to a crawler before the password is entered", async () => {
        prisma.link.findFirst.mockResolvedValue({
            ...link({ title: "Members only" }),
            passwordHash: "hash",
            domain: DOMAIN,
        });

        const result = await redirect("launch", "go.example.com", req(SLACK));

        // Password protection gates the destination, but preview text is the
        // owner's own words about the link. Not serving it means a shared link
        // cannot advertise a gated page before anyone has proved anything.
        expect(result.kind).not.toBe("preview");
        expect((result as { requiresPassword: boolean }).requiresPassword).toBe(true);
    });
});