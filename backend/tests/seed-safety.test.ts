import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Seed production safety (hermetic — the generated Prisma client is mocked):
//   - seeding must be idempotent: plans are UPSERTed by name, never inserted
//     blindly (re-running on a populated production DB must be safe)
//   - the shared default domain go.linkshift.in must always be reclaimed as
//     unowned (userId: null) so it can never count toward one account's
//     custom-domain allowance again (regression for the "1 of 0 used" bug)
// ---------------------------------------------------------------------------

const upserts = vi.hoisted(() => ({
    domainUpsert: vi.fn(async () => ({})),
    planUpsert: vi.fn(async () => ({})),
    disconnect: vi.fn(async () => undefined),
}));

vi.mock(import("../src/generated/prisma/client"), () => ({
    PlanName: { FREE: "FREE", STARTER: "STARTER", CREATOR: "CREATOR", PRO: "PRO" },
    PrismaClient: class {
        domain = { upsert: upserts.domainUpsert };
        plan = { upsert: upserts.planUpsert };
        $disconnect = upserts.disconnect;
    },
}));

describe("prisma seed (production safety)", () => {
    it("is idempotent and never lets the shared default domain become owned", async () => {
        await import("../prisma/seed");

        // main() runs at module load and awaits its writes; wait for both
        // the domain upsert and the 4 plan upserts to settle.
        await vi.waitFor(() => {
            expect(upserts.domainUpsert).toHaveBeenCalledTimes(1);
            expect(upserts.planUpsert).toHaveBeenCalledTimes(4);
        });

        const domainCall = upserts.domainUpsert.mock.calls[0][0];
        expect(domainCall.where).toEqual({ host: "go.linkshift.in" });
        // THE critical invariant: update path reclaims ownership every run.
        expect(domainCall.update).toMatchObject({
            verified: true,
            isDefault: true,
            userId: null,
        });
        expect(domainCall.update.verifiedAt).toBeInstanceOf(Date);
        // Create path (fresh DBs) also marks verified + default.
        expect(domainCall.create).toMatchObject({
            host: "go.linkshift.in",
            verified: true,
            isDefault: true,
        });

        // Plans: upsert keyed by name — idempotent on re-run.
        const names = upserts.planUpsert.mock.calls.map((c) => c[0].where.name);
        expect(names).toEqual(["FREE", "STARTER", "CREATOR", "PRO"]);
        for (const call of upserts.planUpsert.mock.calls) {
            expect(call[0].update).toBeDefined();
            expect(call[0].create).toBeDefined();
        }

        // Free allowance is intentional: 0 custom domains.
        const free = upserts.planUpsert.mock.calls[0][0];
        expect(free.update.maxDomains).toBe(0);
        expect(free.create.maxDomains).toBe(0);
    });
});
