import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Bulk link import.
 *
 * The behaviours worth pinning are the ones that would silently corrupt a URL
 * migration:
 *
 *   - A slug that already exists must be REJECTED, never silently replaced with
 *     a generated short id. `getAvailableShortId` does generate one on
 *     collision, which is right for a casual create and would break every
 *     imported path if it leaked into a migration.
 *   - Duplicates inside one file must be caught, because each create is
 *     otherwise independent and only the database would notice.
 *   - The plan link ceiling must hard-stop the batch, not reject rows partway
 *     through and leave a half-migrated site.
 *   - Per-user plan gates (UTM, path forwarding) resolve once for the batch so
 *     the user sees one real reason instead of the same error 400 times.
 *   - A dry run must write nothing.
 */

const h = vi.hoisted(() => ({
    prisma: {
        link: {
            count: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        linkChange: { count: vi.fn(), create: vi.fn() },
        $transaction: vi.fn(),
    },
    redisClient: { isReady: true, get: vi.fn(), set: vi.fn(), del: vi.fn() },
    tx: {
        link: { findFirst: vi.fn(), create: vi.fn() },
        linkChange: { create: vi.fn() },
    },
    checkLinkImportAccess: vi.fn(),
    checkLinkLimit: vi.fn(),
    checkCustomSlugLimit: vi.fn(),
    checkUtmAccess: vi.fn(),
    checkDeepLinkAccess: vi.fn(),
    getValidatedDomain: vi.fn(),
    getAvailableShortId: vi.fn(),
}));

vi.mock("../src/config/prisma", () => ({ prisma: h.prisma }));
vi.mock("../src/config/redis", () => ({
    redisClient: h.redisClient,
    connectRedis: vi.fn(),
}));
vi.mock("../src/utils/validate.domain", () => ({
    getValidatedDomain: h.getValidatedDomain,
}));
vi.mock("../src/utils/shortId", () => ({ getAvailableShortId: h.getAvailableShortId }));
vi.mock("../src/features/billing/billing.service", () => ({
    checkLinkImportAccess: h.checkLinkImportAccess,
    checkLinkLimit: h.checkLinkLimit,
    checkCustomSlugLimit: h.checkCustomSlugLimit,
    checkUtmAccess: h.checkUtmAccess,
    checkDeepLinkAccess: h.checkDeepLinkAccess,
}));

import { importLinks } from "../src/features/link/link.import.service";
import { AppError } from "../src/errors/AppError";

const DOMAIN = { id: "clx0000000000000000000dom", host: "go.example.com" };
const DOMAIN_ID = DOMAIN.id;

const row = (over: Record<string, unknown> = {}) => ({
    targetUrl: "https://example.com/page",
    ...over,
}) as never;

const setup = (existingSlugs: string[] = []) => {
    h.prisma.link.findMany.mockResolvedValue(existingSlugs.map((shortId) => ({ shortId })));
    h.prisma.link.count.mockResolvedValue(0);
    h.prisma.link.create.mockResolvedValue({ id: "link-1", shortId: "x" });
    h.prisma.linkChange.create.mockResolvedValue({});
    h.prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof h.tx) => unknown) => cb(h.tx)
    );
    h.tx.link.findFirst.mockResolvedValue(null);
    h.tx.link.create.mockImplementation(({ data }: { data: { shortId: string } }) =>
        Promise.resolve({ id: `id-${data.shortId}`, shortId: data.shortId })
    );
    h.tx.linkChange.create.mockResolvedValue({});
    h.getAvailableShortId.mockImplementation((slug: string) => Promise.resolve(slug ?? "gen1234"));
    h.getValidatedDomain.mockResolvedValue(DOMAIN);
    h.checkLinkImportAccess.mockResolvedValue(undefined);
    h.checkLinkLimit.mockResolvedValue({ allowed: true });
    h.checkCustomSlugLimit.mockResolvedValue(undefined);
    h.checkUtmAccess.mockResolvedValue(undefined);
    h.checkDeepLinkAccess.mockResolvedValue(undefined);
};

beforeEach(() => {
    vi.clearAllMocks();
    setup();
});

describe("import validation", () => {
    it("rejects a row with an invalid URL and names the row", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row(), row({ targetUrl: "not-a-url" })] as never,
        });

        expect(result.summary.total).toBe(2);
        expect(result.summary.created).toBe(1);
        expect(result.summary.rejected).toBe(1);

        const rejected = result.results.find((r) => r.outcome === "rejected")!;
        expect(rejected.row).toBe(2);
        expect(rejected.code).toBe("INVALID_ROW");
        expect(rejected.reason).toMatch(/targetUrl/i);
    });

    it("rejects a slug that already exists on the domain instead of replacing it", async () => {
        setup(["legacy-path"]);

        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "legacy-path" })] as never,
        });

        const rejected = result.results[0];
        expect(rejected.outcome).toBe("rejected");
        expect(rejected.code).toBe("SLUG_TAKEN");
        expect(rejected.reason).toMatch(/already exists/i);
        // The critical assertion: no generated fallback is offered.
        expect(rejected.shortId).toBeUndefined();
        expect(h.getAvailableShortId).not.toHaveBeenCalled();
    });

    it("catches duplicate slugs inside one file and points at the first row", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "about" }), row({ slug: "about" })] as never,
        });

        const rejected = result.results.find((r) => r.outcome === "rejected")!;
        expect(rejected.row).toBe(2);
        expect(rejected.code).toBe("DUPLICATE_IN_FILE");
        expect(rejected.reason).toMatch(/row 1/i);
    });

    it("keeps a dry run from writing anything", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "about" }), row({ slug: "pricing" })] as never,
        });

        expect(result.dryRun).toBe(true);
        expect(result.summary.created).toBe(2);
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
        expect(h.prisma.link.create).not.toHaveBeenCalled();
        expect(h.tx.link.create).not.toHaveBeenCalled();
    });

    it("validates only the envelope at the route and each row in the service", async () => {
        // A bad row must not 400 the whole request: that is the reason rows are
        // re-parsed individually rather than relying on the route middleware.
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [
                row({ slug: "ok-one" }),
                row({ slug: "bad slug with spaces" }),
                row({ slug: "ok-two" }),
            ] as never,
        });

        expect(result.summary.created).toBe(2);
        expect(result.summary.rejected).toBe(1);
        expect(result.results.find((r) => r.outcome === "rejected")!.row).toBe(2);
    });
});

describe("import is a paid feature", () => {
    it("refuses a Free account with the plan reason, before touching any row", async () => {
        h.checkLinkImportAccess.mockRejectedValue(
            new AppError("Bulk import is available on paid plans", 403)
        );

        await expect(
            importLinks("u1", {
                domainId: DOMAIN_ID,
                dryRun: true,
                rows: [row({ slug: "about" })] as never,
            })
        ).rejects.toThrow(/paid plans/i);

        // The gate runs first, so a Free user gets one clear reason rather
        // than per-row validation noise.
        expect(h.getValidatedDomain).not.toHaveBeenCalled();
        expect(h.prisma.link.findMany).not.toHaveBeenCalled();
    });

    it("checks the plan once for the whole batch", async () => {
        await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "about" }), row({ slug: "pricing" })] as never,
        });

        expect(h.checkLinkImportAccess).toHaveBeenCalledTimes(1);
    });
});

describe("plan ceilings", () => {
    it("hard-stops the batch when the link ceiling is reached", async () => {
        h.checkLinkLimit.mockRejectedValue(
            new AppError("You have reached the maximum number of links allowed by your plan", 403)
        );

        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "about" }), row({ slug: "pricing" })] as never,
        });

        expect(result.summary.created).toBe(0);
        expect(result.summary.rejected).toBe(2);
        expect(result.summary.blocked).toMatch(/maximum number of links/i);
        // Nothing may be written when the batch cannot proceed.
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("hard-stops when the custom slug allowance is exhausted", async () => {
        h.checkCustomSlugLimit.mockRejectedValue(
            new AppError("You have reached your monthly custom slug limit of 10.", 403)
        );

        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "about" })] as never,
        });

        expect(result.summary.created).toBe(0);
        expect(result.summary.blocked).toMatch(/custom slug limit/i);
        expect(h.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("counts the ceilings once for the batch, not once per row", async () => {
        await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "about" }), row({ slug: "pricing" }), row({ slug: "contact" })] as never,
        });

        expect(h.checkLinkLimit).toHaveBeenCalledTimes(1);
        expect(h.checkLinkLimit).toHaveBeenCalledWith("u1", 3);
        expect(h.checkCustomSlugLimit).toHaveBeenCalledTimes(1);
        expect(h.checkCustomSlugLimit).toHaveBeenCalledWith("u1", 3);
        expect(h.prisma.link.count).not.toHaveBeenCalled();
    });

    it("checks the UTM gate once and surfaces the real plan reason", async () => {
        h.checkUtmAccess.mockRejectedValue(
            new AppError("UTM parameters are available on the Creator plan", 403)
        );

        await expect(
            importLinks("u1", {
                domainId: DOMAIN_ID,
                dryRun: true,
                rows: [
                    row({ utmSource: "a", utmMedium: "b", utmCampaign: "c" }),
                    row({ utmSource: "d", utmMedium: "e", utmCampaign: "f" }),
                ] as never,
            })
        ).rejects.toThrow(/Creator plan/);

        expect(h.checkUtmAccess).toHaveBeenCalledTimes(1);
    });

    it("checks the path-forwarding gate once when any row asks for it", async () => {
        h.checkDeepLinkAccess.mockRejectedValue(
            new AppError("Path forwarding is available on the Pro plan", 403)
        );

        await expect(
            importLinks("u1", {
                domainId: DOMAIN_ID,
                dryRun: true,
                rows: [row({ slug: "about" }), row({ slug: "second", deepLink: true })] as never,
            })
        ).rejects.toThrow(/Pro plan/);

        expect(h.checkDeepLinkAccess).toHaveBeenCalledTimes(1);
    });

    it("does not consult the UTM or forwarding gates when no row needs them", async () => {
        await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: true,
            rows: [row({ slug: "about" })] as never,
        });

        expect(h.checkUtmAccess).not.toHaveBeenCalled();
        expect(h.checkDeepLinkAccess).not.toHaveBeenCalled();
    });
});

describe("persisting a batch", () => {
    it("writes the accepted rows in one transaction", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "about" }), row({ slug: "pricing" }), row({ slug: "contact" })] as never,
        });

        expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(h.tx.link.create).toHaveBeenCalledTimes(3);
        expect(result.summary.created).toBe(3);
        expect(result.results.map((r) => r.shortId)).toEqual(["about", "pricing", "contact"]);
    });

    it("records a CUSTOM_SLUG change for each explicit slug, against the link id", async () => {
        await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "about" })] as never,
        });

        expect(h.tx.linkChange.create).toHaveBeenCalledWith({
            data: { userId: "u1", linkId: "id-about", type: "CUSTOM_SLUG" },
        });
    });

    it("writes only the rows that passed validation", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "good-one" }), row({ targetUrl: "nope" }), row({ slug: "also-good" })] as never,
        });

        expect(h.tx.link.create).toHaveBeenCalledTimes(2);
        expect(result.summary.created).toBe(2);
        expect(result.summary.rejected).toBe(1);
    });

    it("returns results in file order regardless of processing order", async () => {
        const result = await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [
                row({ slug: "one-page" }),
                row({ targetUrl: "bad" }),
                row({ slug: "three-page" }),
            ] as never,
        });

        expect(result.results.map((r) => r.row)).toEqual([1, 2, 3]);
    });

    it("passes the transaction client to the slug allocator", async () => {
        await importLinks("u1", {
            domainId: DOMAIN_ID,
            dryRun: false,
            rows: [row({ slug: "about" })] as never,
        });

        // Using the global prisma mid-transaction would read pre-transaction
        // state, so the allocator must receive the transaction client.
        expect(h.getAvailableShortId).toHaveBeenCalledWith("about", DOMAIN_ID, h.tx);
    });
});
