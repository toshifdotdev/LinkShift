import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Regression: a password RESET must end the live refresh session, exactly
// like a password change does — a stolen refresh token must not survive the
// new password. Hermetic: prisma is mocked, no database touched.
// ---------------------------------------------------------------------------

const { prisma } = vi.hoisted(() => {
    // Placeholder credentials so module imports succeed without real secrets
    // (email/cloudinary constructors validate at import time — CI convention).
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    return {
        prisma: {
            user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        },
    };
});

vi.mock(import("../src/config"), () => ({ config: {}, prisma }));

import { resetPasswordService, refreshService } from "../src/features/auth/auth.service";
import { AppError } from "../src/errors/AppError";

const RAW_TOKEN = "raw-reset-token";
const HASHED = crypto.createHash("sha256").update(RAW_TOKEN).digest("hex");

beforeEach(() => {
    vi.clearAllMocks();
});

describe("resetPasswordService", () => {
    it("revokes the refresh session when the password is reset", async () => {
        prisma.user.findFirst.mockResolvedValue({
            id: "user-1",
            resetPasswordExpires: new Date(Date.now() + 60_000),
        });
        prisma.user.update.mockResolvedValue({});

        await resetPasswordService(RAW_TOKEN, "N3wPassword!x");

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "user-1" },
                data: expect.objectContaining({
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                }),
            }),
        );
        expect(prisma.user.update.mock.calls[0][0].data.passwordHash).toBeDefined();
    });

    it("a refresh token issued before the reset can no longer refresh", async () => {
        // Simulate the post-reset row: the refresh-token hash was cleared, so
        // the pre-reset token no longer matches anything.
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(refreshService("stale-pre-reset-refresh-token")).rejects.toMatchObject({
            statusCode: 401,
        });
        // The lookup is by the SHA-256 of the presented token, never plaintext.
        expect(prisma.user.findFirst).toHaveBeenCalledWith({
            where: {
                refreshTokenHash: crypto
                    .createHash("sha256")
                    .update("stale-pre-reset-refresh-token")
                    .digest("hex"),
            },
        });
    });

    it("rejects an unknown reset token without writing anything", async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(resetPasswordService("unknown-token", "N3wPassword!x")).rejects.toMatchObject({
            statusCode: 400,
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects an expired reset token without writing anything", async () => {
        prisma.user.findFirst.mockResolvedValue({
            id: "user-1",
            resetPasswordExpires: new Date(Date.now() - 60_000),
        });

        await expect(resetPasswordService(RAW_TOKEN, "N3wPassword!x")).rejects.toBeInstanceOf(
            AppError,
        );
        expect(prisma.user.update).not.toHaveBeenCalled();
    });
});
