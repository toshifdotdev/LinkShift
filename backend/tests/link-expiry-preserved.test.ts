import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for expiry preservation on link edits.
 *
 * `updateLink` computed `const expiryDate = data.expiresAt ? new Date(...) : null`
 * and passed it straight into `prisma.link.update`. Prisma treats `undefined`
 * as "leave this field alone" but writes an explicit `null`, so *every* PATCH
 * that did not mention `expiresAt` silently deleted the expiry of an
 * expiring link. Editing a name, a slug or a UTM tag turned a time-limited
 * campaign link into a permanent one.
 *
 * The three cases that must stay distinct:
 *   omitted  -> field untouched
 *   null     -> expiry explicitly cleared (intentional behaviour, preserved)
 *   a date   -> expiry set
 */
const {
    prisma,
    getAvailableShortId,
    getValidatedDomain,
    getLinkMapper,
    buildUtmUrl,
    checkCustomSlugLimit,
    checkDestinationLimit,
    checkUtmAccess,
    checkDeepLinkAccess,
    checkAppDeepLinkAccess,
} = vi.hoisted(() => ({
    prisma: {
        link: { findFirst: vi.fn(), update: vi.fn() },
        domain: { findMany: vi.fn() },
        linkChange: { createMany: vi.fn() },
    },
    getAvailableShortId: vi.fn(),
    getValidatedDomain: vi.fn(),
    getLinkMapper: vi.fn(),
    buildUtmUrl: vi.fn(),
    checkCustomSlugLimit: vi.fn(),
    checkDestinationLimit: vi.fn(),
    checkUtmAccess: vi.fn(),
    checkDeepLinkAccess: vi.fn(),
    checkAppDeepLinkAccess: vi.fn(),
}));

vi.mock(import("../src/config"), () => ({ prisma }));
vi.mock(import("../src/utils/shortId"), () => ({ getAvailableShortId }));
vi.mock(import("../src/utils/validate.domain"), () => ({ getValidatedDomain }));
vi.mock(import("../src/features/link/link.mapper"), () => ({ getLinkMapper }));
vi.mock(import("../src/features/utm/utm.service"), () => ({ buildUtmUrl }));
vi.mock(import("../src/utils/cache"), () => ({
    deleteCache: vi.fn(),
    linkCacheKey: vi.fn().mockReturnValue("k"),
}));
vi.mock(import("../src/features/billing/billing.service"), () => ({
    checkCustomSlugLimit,
    checkDestinationLimit,
    checkUtmAccess,
    checkDeepLinkAccess,
    checkAppDeepLinkAccess,
    checkLinkLimit: vi.fn(),
    checkRedirectLimit: vi.fn(),
}));

import { updateLink } from "../src/features/link/link.service";

const FUTURE = new Date("2030-06-01T00:00:00.000Z");

function existing(overrides: Record<string, unknown> = {}) {
    return {
        id: "link-1",
        userId: "user-1",
        shortId: "promo",
        name: "Spring campaign",
        targetUrl: "https://example.com/spring",
        passwordHash: null,
        isActive: true,
        expiresAt: FUTURE,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
        deepLink: false,
        appDeepLink: false,
        appScheme: null,
        androidPackage: null,
        appPath: null,
        iosStoreUrl: null,
        androidStoreUrl: null,
        domainId: "domain-1",
        ...overrides,
    };
}

/** The value Prisma would actually write for the expiresAt column. */
const writtenExpiry = (): unknown => prisma.link.update.mock.calls[0][0].data.expiresAt;

beforeEach(() => {
    vi.clearAllMocks();
    prisma.link.findFirst.mockResolvedValue(existing());
    prisma.link.update.mockResolvedValue({
        id: "link-1",
        userId: "user-1",
        shortId: "promo",
        domain: { id: "domain-1", host: "go.linkshift.in" },
    });
    prisma.domain.findMany.mockResolvedValue([
        { id: "domain-1", host: "go.linkshift.in" },
    ]);
    getLinkMapper.mockReturnValue({ id: "link-1" });
    getValidatedDomain.mockResolvedValue({ id: "domain-1" });
    buildUtmUrl.mockImplementation((target: string) => target);
});

describe("updateLink expiry preservation", () => {
    it("preserves the existing expiry when only the name is edited", async () => {
        await updateLink({ userId: "user-1", linkId: "link-1", name: "Renamed" });

        // undefined => Prisma leaves the column untouched.
        expect(writtenExpiry()).toBeUndefined();
        expect(prisma.link.update.mock.calls[0][0].data).not.toHaveProperty(
            "expiresAt",
            null,
        );
    });

    it("preserves the existing expiry when only a UTM tag is edited", async () => {
        await updateLink({
            userId: "user-1",
            linkId: "link-1",
            utmCampaign: "summer",
        });

        expect(writtenExpiry()).toBeUndefined();
    });

    it("preserves the existing expiry when only the slug is edited", async () => {
        getAvailableShortId.mockResolvedValue("promo-2");

        await updateLink({ userId: "user-1", linkId: "link-1", slug: "promo-2" });

        expect(writtenExpiry()).toBeUndefined();
    });

    it("preserves the existing expiry when only isActive is edited", async () => {
        await updateLink({ userId: "user-1", linkId: "link-1", isActive: false });

        expect(writtenExpiry()).toBeUndefined();
    });

    it("still clears the expiry when null is sent explicitly", async () => {
        await updateLink({ userId: "user-1", linkId: "link-1", expiresAt: null });

        expect(writtenExpiry()).toBeNull();
    });

    it("sets a new expiry when a date is sent", async () => {
        const next = "2031-01-01T00:00:00.000Z";

        await updateLink({ userId: "user-1", linkId: "link-1", expiresAt: next });

        expect(writtenExpiry()).toEqual(new Date(next));
    });

    it("clears the expiry when a link that had none is renamed", async () => {
        prisma.link.findFirst.mockResolvedValue(existing({ expiresAt: null }));

        await updateLink({ userId: "user-1", linkId: "link-1", name: "Renamed" });

        expect(writtenExpiry()).toBeUndefined();
    });
});