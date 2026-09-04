import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Registration-reuse integration suite — touches the shared development DB.
// Enable explicitly:  RUN_INTEGRATION=1 npx vitest run
//
// Covers the abandoned-unverified-account fix: an unverified LOCAL account
// can re-register with the same email (fresh token issued), while verified
// LOCAL and unverified GOOGLE accounts still 409.
// ---------------------------------------------------------------------------

const RUN = !!process.env.RUN_INTEGRATION;

// Deterministic: never hit Resend during integration runs. The mock mimics
// the real sendVerificationEmail token behavior (delete old row, create a
// fresh 30-minute one) so the token-replacement contract is actually tested.
// Dynamic imports inside the mock functions avoid the vi.mock hoisting gap:
// prisma/token are only needed at call time, after module init.
vi.mock(import("../../src/utils/email"), () => ({
    sendVerificationEmail: async (userId: string, _email: string, _name: string | null) => {
        const { prisma } = await import("../../src/config");
        const { generateRandomToken, hashToken } = await import("../../src/utils/token");
        await prisma.emailVerification.deleteMany({ where: { userId } });
        const token = generateRandomToken();
        await prisma.emailVerification.create({
            data: {
                userId,
                tokenHash: hashToken(token),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
        return { delivered: true };
    },
    sendPasswordResetEmail: async () => ({ delivered: true }),
    resend: {} as never,
}));

import { app } from "../../src/app";
import { prisma } from "../../src/config";
import { registerLimiter } from "../../src/middleware/rateLimit.middleware";

const EMAIL_DOMAIN = "reuse.test.linkshift.in";
const PASSWORD = "Str0ng!Passw0rd";

let createdUserIds: string[] = [];

describe.skipIf(!RUN)("Registration reuse", () => {
    beforeAll(async () => {
        // Sanity: default domain must exist for link creation.
        const domain = await prisma.domain.findUnique({ where: { host: "go.linkshift.in" } });
        if (!domain) throw new Error("Seed missing: go.linkshift.in");
    });

    beforeEach(() => {
        // The suite makes 5 register calls from one IP — exactly the
        // registerLimiter's hourly cap. Reset the IP's counter so repeated
        // runs (and the suite itself) never trip the 429. Test-only: the
        // limiter instance and its production config are untouched.
        registerLimiter.resetKey("127.0.0.1");
    });

    afterAll(async () => {
        await prisma.link.deleteMany({
            where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } },
        });
        await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });
        await prisma.$disconnect();
    });

    it("unverified LOCAL account can re-register with the same email and gets a fresh token", async () => {
        const email = `reuse-${Date.now()}@${EMAIL_DOMAIN}`;

        // First registration — creates an unverified LOCAL account.
        const first = await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "First", email, password: PASSWORD })
            .expect(201);
        expect(first.body.message).toBe("We've sent a verification email.");

        const user = await prisma.user.findUniqueOrThrow({ where: { email } });
        createdUserIds.push(user.id);
        expect(user.verified).toBe(false);
        expect(user.provider).toBe("LOCAL");

        // Capture the first token hash (created by the mocked sendVerificationEmail).
        const firstToken = await prisma.emailVerification.findUniqueOrThrow({
            where: { userId: user.id },
        });

        // Re-register with the same email — must succeed (reuse path).
        const second = await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "Second", email, password: PASSWORD })
            .expect(201);
        expect(second.body.message).toBe("We've sent a verification email.");

        // Same user row reused (no duplicate), name + password updated.
        const after = await prisma.user.findUniqueOrThrow({ where: { email } });
        expect(after.id).toBe(user.id);
        expect(after.name).toBe("Second");
        expect(after.passwordHash).not.toBe(user.passwordHash);

        // Previous token replaced/invalidated: a fresh token row exists and
        // its hash differs from the original.
        const secondToken = await prisma.emailVerification.findUniqueOrThrow({
            where: { userId: user.id },
        });
        expect(secondToken.tokenHash).not.toBe(firstToken.tokenHash);
        expect(secondToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("verified LOCAL account still returns 409", async () => {
        const email = `verified-${Date.now()}@${EMAIL_DOMAIN}`;

        await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "Verified", email, password: PASSWORD })
            .expect(201);

        const user = await prisma.user.update({
            where: { email },
            data: { verified: true },
        });
        createdUserIds.push(user.id);

        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "Again", email, password: PASSWORD });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe("An account with this email already exists.");
    });

    it("unverified GOOGLE account still returns 409", async () => {
        const email = `google-${Date.now()}@${EMAIL_DOMAIN}`;

        const user = await prisma.user.create({
            data: {
                name: "Google User",
                email,
                provider: "GOOGLE",
                googleId: `google-${Date.now()}`,
                verified: false,
            },
        });
        createdUserIds.push(user.id);

        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "Local", email, password: PASSWORD });
        expect(res.status).toBe(409);
        expect(res.body.message).toBe("An account with this email already exists.");
    });

    it("fresh registration still works (no existing account)", async () => {
        const email = `fresh-${Date.now()}@${EMAIL_DOMAIN}`;

        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({ name: "Fresh", email, password: PASSWORD })
            .expect(201);
        expect(res.body.message).toBe("We've sent a verification email.");

        const user = await prisma.user.findUniqueOrThrow({ where: { email } });
        createdUserIds.push(user.id);
        expect(user.verified).toBe(false);
        expect(user.provider).toBe("LOCAL");
    });
});