import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// GeoIP degradation (hermetic): the MaxMind database is enrichment only —
// a missing/corrupt MMDB file must disable location lookup gracefully
// instead of crashing the process via an unhandled rejection at startup.
// ---------------------------------------------------------------------------

const openMock = vi.hoisted(() => vi.fn());

vi.mock(import("@maxmind/geoip2-node"), () => ({
    Reader: { open: openMock },
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

describe("getLocation", () => {
    it("returns the location when the database opens", async () => {
        openMock.mockResolvedValue({
            city: () => ({
                country: { names: { en: "India" } },
                city: { names: { en: "Dehradun" } },
            }),
        });
        const { getLocation } = await import("../src/utils/geoIp");

        await expect(getLocation("1.2.3.4")).resolves.toEqual({
            country: "India",
            city: "Dehradun",
        });
    });

    it("degrades gracefully when the MMDB file is unavailable", async () => {
        openMock.mockRejectedValue(new Error("ENOENT: no such file"));
        const { getLocation } = await import("../src/utils/geoIp");

        await expect(getLocation("1.2.3.4")).resolves.toEqual({
            country: undefined,
            city: undefined,
        });
    });

    it("degrades gracefully when a lookup on an open database fails", async () => {
        openMock.mockResolvedValue({
            city: () => {
                throw new Error("invalid ip");
            },
        });
        const { getLocation } = await import("../src/utils/geoIp");

        await expect(getLocation("not-an-ip")).resolves.toEqual({
            country: undefined,
            city: undefined,
        });
    });
});
