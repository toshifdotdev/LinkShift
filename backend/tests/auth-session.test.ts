import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Refresh-session lifecycle (hermetic): expired refresh tokens are rejected,
// and logout revokes the stored session hash so the cookie becomes unusable.
// ---------------------------------------------------------------------------

const { prisma, config } = vi.hoisted(() => {
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    return {
        prisma: {
            user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        },
        config: { jwtSecret: "test-jwt-secret" },
    };
});

vi.mock(import("../src/config"), () => ({ config, prisma }));

import crypto from "crypto";
import { logoutService, refreshService } from "../src/features/auth/auth.service";

const RAW = "raw-refresh-token";
const HASHED = crypto.createHash("sha256").update(RAW).digest("hex");

beforeEach(() => {
    vi.clearAllMocks();
});

describe("refreshService", () => {
    it("rejects an expired refresh token", async () => {
        prisma.user.findFirst.mockResolvedValue({
            id: "user-1",
            refreshTokenExpiresAt: new Date(Date.now() - 1000),
        });

        await expect(refreshService(RAW)).rejects.toMatchObject({
            statusCode: 401,
            message: "Token Expired",
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rotates the session for a live token (hash + expiry rewritten)", async () => {
        prisma.user.findFirst.mockResolvedValue({
            id: "user-1",
            refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
        });
        prisma.user.update.mockResolvedValue({});

        const result = await refreshService(RAW);

        expect(result.accessToken).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();
        expect(result.refreshToken).not.toBe(RAW); // rotation
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: {
                refreshTokenHash: expect.not.stringMatching(new RegExp(`^${HASHED}$`)),
                refreshTokenExpiresAt: expect.any(Date),
            },
        });
    });

    it("rejects a token that matches no stored session", async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(refreshService("unknown-token")).rejects.toMatchObject({
            statusCode: 401,
        });
    });
});

describe("logoutService", () => {
    it("revokes the stored refresh session", async () => {
        prisma.user.findFirst.mockResolvedValue({ id: "user-1", refreshTokenHash: HASHED });
        prisma.user.update.mockResolvedValue({});

        await logoutService(RAW);

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
        });
    });

    it("rejects a logout for an unknown session without writing", async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(logoutService("unknown-token")).rejects.toMatchObject({
            statusCode: 401,
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });
});
