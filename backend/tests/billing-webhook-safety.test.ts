import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Razorpay webhook production-safety checks (hermetic — prisma is mocked):
//   1. signatures are verified with the dashboard secret (invalid → 400)
//   2. a missing configured secret fails closed with a clean error
//      (no signature can be trusted, no raw TypeError escapes)
//   3. duplicate delivery of the same event id is processed exactly once —
//      the replay returns alreadyProcessed instead of mutating state again
// ---------------------------------------------------------------------------

const testState = vi.hoisted(() => ({
    webhookSecret: "whsec_test_secret" as string | undefined,
}));

const { prisma } = vi.hoisted(() => {
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    return {
        prisma: {
            webhookEvent: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
            $executeRaw: vi.fn(),
        },
    };
});

// billing.service reads `config` from ../src/config/env (not the index
// re-export), so BOTH module specifiers are mocked. The env mock uses a
// live getter for the secret so each test can control it, plus placeholder
// Razorpay keys for the SDK constructed at import time (CI convention).
vi.mock(import("../src/config"), () => ({
    config: {
        get razorpayWebhookSecret() {
            return testState.webhookSecret;
        },
    },
    prisma,
}));
vi.mock(import("../src/config/env"), () => ({
    config: {
        razorpayKeyId: "rzp_test_placeholder",
        razorpayKeySecret: "placeholder_secret",
        get razorpayWebhookSecret() {
            return testState.webhookSecret;
        },
    },
}));

// Real class (same module instance the service uses) so
// `e instanceof Prisma.PrismaClientKnownRequestError` matches the mocked
// P2002 rejection.
import { Prisma } from "../src/generated/prisma/client";

import { razorpayWebhookService } from "../src/features/billing/billing.service";
import { AppError } from "../src/errors/AppError";

const SECRET = "whsec_test_secret";
const EVENT_ID = "evt_123";
const BODY = Buffer.from(JSON.stringify({ event: "some.unknown.event", payload: {} }));

function sign(body: Buffer, secret: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

beforeEach(() => {
    vi.clearAllMocks();
    testState.webhookSecret = SECRET;
});

describe("razorpayWebhookService", () => {
    it("rejects an invalid signature without touching the ledger", async () => {
        await expect(
            razorpayWebhookService(sign(BODY, "wrong-secret"), BODY, EVENT_ID),
        ).rejects.toMatchObject({ statusCode: 400, message: "Invalid webhook signature" });

        expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    });

    it("fails closed with a clean error when no secret is configured", async () => {
        testState.webhookSecret = undefined;

        await expect(
            razorpayWebhookService(sign(BODY, SECRET), BODY, EVENT_ID),
        ).rejects.toMatchObject({
            statusCode: 500,
            message: "Razorpay webhook secret is not configured",
        });

        expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    });

    it("processes a valid delivery exactly once (claim → PROCESSED)", async () => {
        prisma.webhookEvent.create.mockResolvedValue({});
        prisma.$executeRaw.mockResolvedValue(1); // claim won
        prisma.webhookEvent.update.mockResolvedValue({});

        const result = await razorpayWebhookService(sign(BODY, SECRET), BODY, EVENT_ID);

        expect(result).toMatchObject({ event: "some.unknown.event", processed: true });
        expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
            data: { eventId: EVENT_ID, eventType: "some.unknown.event", status: "PENDING" },
        });
        expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
            where: { eventId: EVENT_ID },
            data: { status: "PROCESSED", processedAt: expect.any(Date), claimedAt: null },
        });
    });

    it("a duplicate delivery is acknowledged without reprocessing", async () => {
        // First delivery already happened; the event row is PROCESSED.
        prisma.webhookEvent.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002",
                clientVersion: "test",
            }),
        );
        prisma.$executeRaw.mockResolvedValue(0); // claim lost
        prisma.webhookEvent.findUnique.mockResolvedValue({ eventId: EVENT_ID, status: "PROCESSED" });

        const result = await razorpayWebhookService(sign(BODY, SECRET), BODY, EVENT_ID);

        expect(result).toMatchObject({ processed: true, alreadyProcessed: true });
        // The claim attempt is the only write — no state is mutated again.
        expect(prisma.webhookEvent.update).not.toHaveBeenCalled();
    });

    it("an event actively processed by another worker is rejected with 409", async () => {
        prisma.webhookEvent.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                code: "P2002",
                clientVersion: "test",
            }),
        );
        prisma.$executeRaw.mockResolvedValue(0); // claim lost, still PROCESSING (fresh)
        prisma.webhookEvent.findUnique.mockResolvedValue({ eventId: EVENT_ID, status: "PROCESSING" });

        await expect(
            razorpayWebhookService(sign(BODY, SECRET), BODY, EVENT_ID),
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});
