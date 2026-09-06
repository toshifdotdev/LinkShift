import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Email delivery fault tolerance: provider failures must never propagate as
// exceptions — callers degrade via the { delivered } result instead.
// ---------------------------------------------------------------------------

const sendMock = vi.hoisted(() => vi.fn());

vi.mock(import("resend"), () => ({
    Resend: class {
        emails = { send: sendMock };
    },
}));

vi.mock(import("../src/config"), () => ({
    config: {
        emailFrom: "noreply@test.linkshift.in",
        frontendUrl: "http://localhost:5173",
        APP_URL: "http://localhost:3000",
        resendApiKey: "test-key",
    },
    prisma: {
        emailVerification: {
            deleteMany: async () => ({ count: 0 }),
            create: async () => ({}),
        },
    },
}));

import { sendPasswordResetEmail, sendVerificationEmail } from "../src/utils/email";

describe("email delivery fault tolerance", () => {
    it("reports delivered:true when the provider accepts the email", async () => {
        sendMock.mockResolvedValueOnce({ data: { id: "em_1" } });
        const result = await sendVerificationEmail("user-1", "a@example.com", "A");
        expect(result).toEqual({ delivered: true });
        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it("absorbs provider failures into delivered:false instead of throwing", async () => {
        sendMock.mockRejectedValueOnce(new Error("ECONNREFUSED: Resend is down"));
        await expect(
            sendVerificationEmail("user-2", "b@example.com", "B")
        ).resolves.toEqual({ delivered: false });
    });

    it("password-reset emails degrade the same way", async () => {
        sendMock.mockRejectedValueOnce(new Error("429 rate limited"));
        await expect(
            sendPasswordResetEmail("c@example.com", "reset-token")
        ).resolves.toEqual({ delivered: false });

        sendMock.mockResolvedValueOnce({ data: { id: "em_2" } });
        await expect(
            sendPasswordResetEmail("c@example.com", "reset-token-2")
        ).resolves.toEqual({ delivered: true });
    });
});
