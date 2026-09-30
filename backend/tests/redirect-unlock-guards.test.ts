import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for password-protected link access rules.
 *
 * `unlockService` re-reads the link straight from the database and used to
 * jump straight to the bcrypt comparison. That meant a password-protected
 * link could still be opened through POST /:shortId/unlock after the owner
 * disabled it or let it expire, and it produced a Scan row (via
 * resolveDestination) without ever consulting the plan's redirect quota.
 *
 * These tests pin the ordering: the access rules are enforced before the
 * password is compared, so a correct password cannot unlock an inactive link.
 */
const { prisma, bcrypt, checkRedirectLimit, hasDeepLinkAccess, hasAppDeepLinkAccess, completeTargetUrl, applyDeepLink } =
    vi.hoisted(() => ({
        prisma: {
            domain: { findFirst: vi.fn() },
            link: { findFirst: vi.fn() },
        },
        bcrypt: { compare: vi.fn() },
        checkRedirectLimit: vi.fn(),
        hasDeepLinkAccess: vi.fn(),
        hasAppDeepLinkAccess: vi.fn(),
        completeTargetUrl: vi.fn(),
        applyDeepLink: vi.fn(),
    }));

vi.mock(import("../src/config"), () => ({ prisma }));
vi.mock(import("bcrypt"), () => ({ compare: bcrypt.compare }));
vi.mock(import("../src/features/billing/billing.service"), () => ({
    checkRedirectLimit,
    hasDeepLinkAccess,
    hasAppDeepLinkAccess,
}));
vi.mock(import("../src/utils/completeRedirect"), () => ({
    completeTargetUrl,
    applyDeepLink,
}));
vi.mock(import("../src/utils/cache"), () => ({
    getCache: vi.fn().mockResolvedValue(null),
    setCache: vi.fn(),
    linkCacheKey: vi.fn().mockReturnValue("k"),
}));

import { unlockService } from "../src/features/redirect/redirect.service";

const req = { headers: { "user-agent": "Mozilla/5.0" } } as never;

function protectedLink(overrides: Record<string, unknown> = {}) {
    return {
        id: "link-1",
        userId: "user-1",
        shortId: "secret",
        targetUrl: "https://example.com/dest",
        passwordHash: "$2b$10$hashed",
        isActive: true,
        expiresAt: null,
        deepLink: false,
        appDeepLink: false,
        appScheme: null,
        androidPackage: null,
        appPath: null,
        iosStoreUrl: null,
        androidStoreUrl: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    prisma.domain.findFirst.mockResolvedValue({ id: "domain-1", host: "go.linkshift.in" });
    bcrypt.compare.mockResolvedValue(true);
    checkRedirectLimit.mockResolvedValue({ allowed: true });
    completeTargetUrl.mockResolvedValue({ targetUrl: "https://example.com/dest" });
});

describe("unlockService access rules", () => {
    it("unlocks an active, unexpired link with the correct password", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink());

        const result = await unlockService("secret", "hunter2", "go.linkshift.in", req);

        expect(result).toEqual(
            expect.objectContaining({ kind: "redirect", targetUrl: "https://example.com/dest" }),
        );
    });

    it("rejects a disabled link even with the correct password", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink({ isActive: false }));

        await expect(
            unlockService("secret", "hunter2", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("rejects an expired link even with the correct password", async () => {
        prisma.link.findFirst.mockResolvedValue(
            protectedLink({ expiresAt: new Date(Date.now() - 60_000) }),
        );

        await expect(
            unlockService("secret", "hunter2", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 410 });
    });

    it("does not reveal whether the password was correct for a disabled link", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink({ isActive: false }));

        await expect(
            unlockService("secret", "hunter2", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("allows a link whose expiry is still in the future", async () => {
        prisma.link.findFirst.mockResolvedValue(
            protectedLink({ expiresAt: new Date(Date.now() + 3_600_000) }),
        );

        const result = await unlockService("secret", "hunter2", "go.linkshift.in", req);

        expect(result).toEqual(
            expect.objectContaining({ kind: "redirect" }),
        );
    });

    it("enforces the redirect quota before granting access", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink());
        checkRedirectLimit.mockRejectedValue(
            Object.assign(new Error("Monthly redirect limit reached."), { statusCode: 429 }),
        );

        await expect(
            unlockService("secret", "hunter2", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 429 });

        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("consults the redirect quota on the unlock path", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink());

        await unlockService("secret", "hunter2", "go.linkshift.in", req);

        expect(checkRedirectLimit).toHaveBeenCalledWith("user-1");
    });

    it("still rejects a wrong password with 401", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink());
        bcrypt.compare.mockResolvedValue(false);

        await expect(
            unlockService("secret", "wrong", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 401 });

        expect(completeTargetUrl).not.toHaveBeenCalled();
    });

    it("still rejects a link that is not password protected", async () => {
        prisma.link.findFirst.mockResolvedValue(protectedLink({ passwordHash: null }));

        await expect(
            unlockService("secret", "hunter2", "go.linkshift.in", req),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});