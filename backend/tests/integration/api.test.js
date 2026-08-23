"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
// ---------------------------------------------------------------------------
// Integration suite — touches the shared development database.
// Enable explicitly:  RUN_INTEGRATION=1 npx vitest run
// ---------------------------------------------------------------------------
const RUN = !!process.env.RUN_INTEGRATION;
// Resolved via the import object so the path is correct from tests/integration/.
vitest_1.vi.mock(Promise.resolve().then(() => __importStar(require("../../src/utils/email"))), () => ({
    // Deterministic: never hit Resend during integration runs.
    sendVerificationEmail: async () => { },
    sendPasswordResetEmail: async () => { },
    resend: {},
}));
const app_1 = require("../../src/app");
const config_1 = require("../../src/config");
const EMAIL_DOMAIN = "test.linkshift.in";
const PASSWORD = "Str0ng!Passw0rd";
let createdUserIds = [];
async function createVerifiedUser() {
    const email = `it${Date.now()}${Math.floor(Math.random() * 100000)}@${EMAIL_DOMAIN}`;
    await (0, supertest_1.default)(app_1.app)
        .post("/api/v1/auth/register")
        .send({ name: "Integration", email, password: PASSWORD })
        .expect(201);
    const user = await config_1.prisma.user.update({
        where: { email },
        data: { verified: true },
    });
    createdUserIds.push(user.id);
    const login = await (0, supertest_1.default)(app_1.app)
        .post("/api/v1/auth/login")
        .send({ email, password: PASSWORD })
        .expect(200);
    return { userId: user.id, email, token: login.body.accessToken };
}
vitest_1.describe.skipIf(!RUN)("Integration API", () => {
    (0, vitest_1.beforeAll)(async () => {
        // Sanity: default domain must exist for link creation.
        const domain = await config_1.prisma.domain.findUnique({ where: { host: "go.linkshift.in" } });
        if (!domain)
            throw new Error("Seed missing: go.linkshift.in");
    });
    (0, vitest_1.afterAll)(async () => {
        // NOTE: Link.userId FK is RESTRICT (no cascade) — links must be removed
        // before their owner. This is also why the future account-deletion
        // feature (M2) will need explicit link cleanup before user removal.
        await config_1.prisma.link.deleteMany({
            where: { user: { email: { endsWith: EMAIL_DOMAIN } } },
        });
        await config_1.prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
        await config_1.prisma.$disconnect();
    });
    (0, vitest_1.it)("health reports database up", async () => {
        const res = await (0, supertest_1.default)(app_1.app).get("/health");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.checks.database).toBe("up");
    });
    (0, vitest_1.it)("login rejects bad credentials without mutation", async () => {
        const res = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/auth/login")
            .send({ email: `nobody-${Date.now()}@${EMAIL_DOMAIN}`, password: PASSWORD });
        (0, vitest_1.expect)(res.status).toBe(404); // current contract; enumeration fix is backlog
    });
    (0, vitest_1.it)("register -> verify -> login -> read billing subscription", async () => {
        const { token } = await createVerifiedUser();
        const res = await (0, supertest_1.default)(app_1.app)
            .get("/api/v1/billing/subscription")
            .set("Authorization", `Bearer ${token}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        // No subscription yet — FREE entitlement fallback applies elsewhere.
        (0, vitest_1.expect)(res.body.subscription).toBeNull();
    });
    (0, vitest_1.it)("unauthenticated access is rejected", async () => {
        await (0, supertest_1.default)(app_1.app).get("/api/v1/billing/subscription").expect(401);
    });
    (0, vitest_1.it)("link lifecycle: create -> redirect -> deactivate -> redirect blocked", async () => {
        const { userId, token } = await createVerifiedUser();
        const domain = await config_1.prisma.domain.findUniqueOrThrow({
            where: { host: "go.linkshift.in" },
        });
        const slug = `it${Date.now().toString(36)}`;
        // NOTE: no custom slug — FREE users are currently hard-blocked by
        // checkCustomSlugLimit's ACTIVE-subscription requirement (known
        // entitlement inconsistency, tracked separately).
        const created = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/links")
            .set("Authorization", `Bearer ${token}`)
            .send({
            targetUrl: "https://example.com/?utm_source=integration",
            domainId: domain.id,
        })
            .expect(201);
        const shortId = created.body.data.shortId;
        (0, vitest_1.expect)(shortId).toBeTruthy();
        // Warm the Redis cache with a successful redirect.
        const first = await (0, supertest_1.default)(app_1.app)
            .get(`/r/${shortId}`)
            .set("Host", "go.linkshift.in");
        (0, vitest_1.expect)(first.status).toBe(302);
        (0, vitest_1.expect)(first.headers.location).toContain("example.com");
        // Deactivate, then confirm the cached entry was invalidated.
        await (0, supertest_1.default)(app_1.app)
            .patch(`/api/v1/links/${created.body.data.id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ isActive: false })
            .expect(200);
        const second = await (0, supertest_1.default)(app_1.app)
            .get(`/r/${shortId}`)
            .set("Host", "go.linkshift.in");
        // /r/* errors render the HTML error branch (non-/api path prefix).
        (0, vitest_1.expect)(second.status).toBe(403);
        (0, vitest_1.expect)(second.text).toMatch(/disabled/i);
        void userId;
    });
});
