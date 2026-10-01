import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase C — launch readiness.
 *
 * C1 publishes a status feed. It is deliberately unauthenticated, so the tests
 * here are mostly about what it must NOT leak: a status page is a public
 * document, and it must never describe the shape of the infrastructure it
 * probes.
 */

const { prisma, redisClient } = vi.hoisted(() => ({
    prisma: { $queryRaw: vi.fn() },
    redisClient: { isReady: true },
}));

vi.mock("../src/config/prisma", () => ({ prisma }));
vi.mock("../src/config/redis", () => ({ redisClient, connectRedis: vi.fn() }));

import { readStatus } from "../src/features/status/status.service";

describe("readStatus", () => {
    beforeEach(() => {
        prisma.$queryRaw.mockReset();
        prisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
        redisClient.isReady = true;
    });

    it("reports every component as operational when both probes succeed", async () => {
        const status = await readStatus();

        expect(status.status).toBe("operational");
        expect(status.components.map((c) => c.id)).toEqual([
            "api",
            "database",
            "cache",
        ]);
        expect(status.components.every((c) => c.status === "operational")).toBe(true);
    });

    it("degrades when the cache is unavailable but the database is fine", async () => {
        redisClient.isReady = false;

        const status = await readStatus();

        const cache = status.components.find((c) => c.id === "cache");
        expect(cache?.status).toBe("degraded");
        expect(status.status).toBe("degraded");
    });

    it("reports the database as down when the probe throws", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

        const status = await readStatus();

        expect(status.components.find((c) => c.id === "database")?.status).toBe("down");
        expect(status.status).toBe("down");
    });

    it("reports down when the probe rejects rather than throwing to the caller", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("timeout"));

        await expect(readStatus()).resolves.toBeDefined();
    });

    it("never leaks connection strings, hosts or error text", async () => {
        prisma.$queryRaw.mockRejectedValue(
            new Error("FATAL: password authentication failed for user \"linkshift\"")
        );
        redisClient.isReady = false;

        const status = await readStatus();
        const serialised = JSON.stringify(status);

        expect(serialised).not.toContain("password");
        expect(serialised).not.toContain("FATAL");
        expect(serialised).not.toContain("user \"");
        expect(Object.keys(status).sort()).toEqual([
            "components",
            "status",
            "updatedAt",
        ]);
    });

    it("stamps an ISO timestamp so the page can show a last-checked time", async () => {
        const status = await readStatus();

        expect(Number.isNaN(Date.parse(status.updatedAt))).toBe(false);
        expect(status.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
});