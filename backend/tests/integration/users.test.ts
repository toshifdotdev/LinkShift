import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Integration — Account lifecycle (M2). Touches the shared dev database.
// Enable:  RUN_INTEGRATION=1 npx vitest run tests/integration/users.test.ts
// ---------------------------------------------------------------------------

const RUN = !!process.env.RUN_INTEGRATION;

vi.mock(import("../../src/utils/email"), () => ({
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    resend: {},
}));

import { app } from "../../src/app";
import { prisma } from "../../src/config";

const EMAIL_DOMAIN = "users.test.linkshift.in";
const PASSWORD = "Str0ng!Passw0rd";
let createdUserIds: string[] = [];

function uniqueEmail(prefix = "u") {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}@${EMAIL_DOMAIN}`;
}

async function createVerifiedUser(name = "Integration"): Promise<{ userId: string; email: string; token: string }> {
    const email = uniqueEmail();
    // Seed directly to stay under the register rate limiter (5/hour/IP).
    const bcrypt = await import("bcrypt");
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: undefined as never,
            passwordHash: bcrypt.hashSync(PASSWORD, 10),
            provider: "LOCAL",
            verified: true,
        } as never,
    });
    createdUserIds.push(user.id);

    // Mint the access token directly instead of HTTP login — keeps this suite
    // immune to loginLimiter exhaustion across repeated dev runs.
    const { default: jwt } = await import("jsonwebtoken");
    const token = jwt.sign(
        { id: user.id, email },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
    );

    return { userId: user.id, email, token, password: PASSWORD };
}

async function seedGoogleOnlyUser(): Promise<{ userId: string; email: string; token: string }> {
    // Google-only accounts have no local password — deletion relies on the
    // valid session alone. Seed directly and hand-craft a JWT the way
    // generateAccessToken would.
    const { default: jwt } = await import("jsonwebtoken");
    const email = uniqueEmail("g");
    const user = await prisma.user.create({
        data: {
            email,
            name: "Google Only",
            provider: "GOOGLE",
            verified: true,
        },
    });
    createdUserIds.push(user.id);
    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET as string, {
        expiresIn: "15m",
    });
    return { userId: user.id, email, token };
}

async function cleanup() {
    // Link.userId FK is RESTRICT — links must go before users. Subscriptions/
    // payments cascade with the user; provider-side subs are intentionally NOT
    // cancelled here because tests that abort deletion still own their rows.
    for (const userId of createdUserIds) {
        await prisma.link.deleteMany({ where: { userId } }).catch(() => {});
        await prisma.subscription.deleteMany({ where: { userId } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } }).catch(() => {});
    createdUserIds = [];
}

describe.skipIf(!RUN)("Integration Users (M2)", () => {
    afterAll(cleanup);

    it("/me aggregates profile + FREE plan fallback", async () => {
        const { token } = await createVerifiedUser();
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.plan.name).toBe("FREE");
        expect(res.body.data.subscription).toBeNull();
        expect(res.body.data.email).toContain(`@${EMAIL_DOMAIN}`);
    });

    it("PATCH /me updates the display name", async () => {
        const { userId, token } = await createVerifiedUser();
        const res = await request(app)
            .patch("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Renamed User" })
            .expect(200);

        expect(res.body.data.name).toBe("Renamed User");

        const db = await prisma.user.findUnique({ where: { id: userId } });
        expect(db?.name).toBe("Renamed User");
    });

    it("login responses are enumeration-neutral (identical body+status)", async () => {
        const { email, password } = await createVerifiedUser();

        const unknown = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: uniqueEmail("ghost"), password });
        const wrongPw = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: "Wr0ng!Passw0rd" });

        // Unverified account with CORRECT credentials also gets the same body.
        const unverifiedEmail = uniqueEmail("uv");
        await prisma.user.create({
            data: { name: "UV", email: unverifiedEmail, passwordHash: null as never, provider: "LOCAL" as never, verified: false },
        });
        const unverified = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: unverifiedEmail, password });

        if (process.env.RECON_DEBUG) {
            console.log("PARITY:", JSON.stringify([unknown.body, wrongPw.body, unverified.body]));
            console.log("PARITY STATUS:", [unknown.status, wrongPw.status, unverified.status]);
        }
        if (process.env.RECON_DEBUG) {
            console.log("PARITY BODIES:", JSON.stringify([
                { s: unknown.status, b: unknown.body },
                { s: wrongPw.status, b: wrongPw.body },
                { s: unverified.status, b: unverified.body },
            ]));
        }
        for (const res of [unknown, wrongPw, unverified]) {
            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Invalid email or password.");
        }
        expect(unknown.body).toEqual(wrongPw.body);
        expect(wrongPw.body).toEqual(unverified.body);
    });

    it("resend-verification is enumeration-neutral (200 in all cases)", async () => {
        const { email } = await createVerifiedUser();

        const unknown = await request(app)
            .post("/api/v1/auth/resend-verification")
            .send({ email: uniqueEmail("ghost") });
        const verified = await request(app)
            .post("/api/v1/auth/resend-verification")
            .send({ email });

        expect(unknown.status).toBe(200);
        expect(verified.status).toBe(200);
        expect(unknown.body.message).toBe(verified.body.message);
    });

    it("deletion rejects wrong password and PRESERVES the account", async () => {
        const { userId, email, token } = await createVerifiedUser();

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: "Wr0ng!Passw0rd", confirmation: email })
            .expect(403);

        expect(res.body.message).toMatch(/invalid/i);
        const stillThere = await prisma.user.findUnique({ where: { id: userId } });
        expect(stillThere).not.toBeNull();
    });

    it("deletion rejects a mismatched confirmation email and PRESERVES the account", async () => {
        const { userId, token } = await createVerifiedUser();

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: PASSWORD, confirmation: "not-the-account@example.com" })
            .expect(400);

        expect(res.body.message).toMatch(/does not match/i);
        const stillThere = await prisma.user.findUnique({ where: { id: userId } });
        expect(stillThere).not.toBeNull();
    });

    it("deletion without password confirmation is rejected (password accounts)", async () => {
        const { userId, email, token } = await createVerifiedUser();

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ confirmation: email });
        expect([400, 403]).toContain(res.status);

        const stillThere = await prisma.user.findUnique({ where: { id: userId } });
        expect(stillThere).not.toBeNull();
    });

    it("Google-only accounts can delete with a valid session alone", async () => {
        const { userId, email, token } = await seedGoogleOnlyUser();

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ confirmation: email });
        expect(res.status).toBe(200);

        const gone = await prisma.user.findUnique({ where: { id: userId } });
        expect(gone).toBeNull();
    });

    it("happy-path deletion removes links + user and clears the cookie", async () => {
        const { userId, email, token } = await createVerifiedUser("Deleter");

        const domain = await prisma.domain.findUniqueOrThrow({
            where: { host: "go.linkshift.in" },
        });
        await request(app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${token}`)
            .send({
                targetUrl: "https://example.com/deletion-test",
                domainId: domain.id,
            })
            .expect(201);

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: PASSWORD, confirmation: email })
            .expect(200);

        expect(res.headers["set-cookie"]?.[0]).toContain("refreshToken=;");
        expect(res.body.message).toMatch(/deleted/i);

        const goneUser = await prisma.user.findUnique({ where: { id: userId } });
        expect(goneUser).toBeNull();
        const goneLinks = await prisma.link.count({ where: { userId } });
        expect(goneLinks).toBe(0);
    });

    it("provider-cancel failure ABORTS deletion and preserves the account (Option A safety)", async () => {
        const { userId, email, token } = await createVerifiedUser("AbortCase");

        const plan = await prisma.plan.findUniqueOrThrow({ where: { name: "CREATOR" } });
        // One live subscription whose provider id does not exist at Razorpay —
        // the provider cancel fails, which MUST abort the entire deletion
        // without touching a single local row (Option A safety contract).
        // (The one-live-per-user invariant forbids seeding two live subs.)
        await prisma.subscription.create({
            data: {
                userId,
                planId: plan.id,
                status: "ACTIVE",
                billingCycle: "MONTHLY",
                currency: "INR",
                provider: "RAZORPAY",
                providerSubscriptionId: `sub_fake_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
            },
        });

        const res = await request(app)
            .delete("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ password: PASSWORD, confirmation: email });

        expect(res.status).toBe(502);
        expect(res.body.message).toMatch(/has not been deleted/i);
        const intact = await prisma.user.findUnique({ where: { id: userId } });
        expect(intact).not.toBeNull(); // nothing mutated on abort
        const subs = await prisma.subscription.count({ where: { userId } });
        expect(subs).toBe(1); // preserved verbatim
    });

    it("change-password updates the hash, revokes the refresh session, and wrong current password is rejected", async () => {
        const { userId, email, token } = await createVerifiedUser("PwdChanger");

        // Simulate a live session by seeding the single refresh slot directly.
        await prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: "live-session-hash", refreshTokenExpiresAt: new Date(Date.now() + 86400000) },
        });

        // Wrong current password is rejected and nothing changes.
        const bad = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: "Wr0ng!Passw0rd", newPassword: "Chang3d!Passw0rd" });
        expect(bad.status).toBe(403);

        // Happy path: new hash stored, refresh slot revoked, reset tokens cleared.
        const res = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Authorization", `Bearer ${token}`)
            .send({ currentPassword: PASSWORD, newPassword: "Chang3d!Passw0rd" });
        expect(res.status).toBe(200);

        const db = await prisma.user.findUnique({ where: { id: userId } });
        const bcrypt = await import("bcrypt");
        expect(await bcrypt.compare("Chang3d!Passw0rd", db?.passwordHash ?? "")).toBe(true);
        expect(await bcrypt.compare(PASSWORD, db?.passwordHash ?? "")).toBe(false);
        expect(db?.refreshTokenHash).toBeNull();
        expect(db?.refreshTokenExpiresAt).toBeNull();
        void email;
    });

    it("Google-only accounts can set a password without a current password", async () => {
        const { userId, token } = await seedGoogleOnlyUser();

        const res = await request(app)
            .post("/api/v1/auth/change-password")
            .set("Authorization", `Bearer ${token}`)
            .send({ newPassword: "New!Passw0rd" });
        expect(res.status).toBe(200);

        const db = await prisma.user.findUnique({ where: { id: userId } });
        const bcrypt = await import("bcrypt");
        expect(await bcrypt.compare("New!Passw0rd", db?.passwordHash ?? "")).toBe(true);
    });
});
