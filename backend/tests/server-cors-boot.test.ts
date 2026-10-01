import { describe, expect, it, vi } from "vitest";

/**
 * The CORS guard only protects production if the server actually runs it.
 *
 * `resolveCorsOrigins` deliberately no longer throws, so the production check
 * lives in a single function that the entrypoint must call. If that call is
 * ever dropped, every unit test for the guard still passes while a deployment
 * with no allow-list boots and serves an API the browser cannot reach. These
 * tests assert the wiring, not the logic.
 */

vi.hoisted(() => {
    process.env.JWT_SECRET ??= "test-jwt-secret";
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
});

const listen = vi.fn();
const connectRedis = vi.fn();
const exit = vi.fn();

vi.mock("express", async (orig) => {
    const actual = await orig<typeof import("express")>();
    return { ...actual, default: Object.assign(actual.default, { listen }) };
});

vi.mock("../src/app", () => ({
    app: { listen, use: vi.fn(), post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/config/redis", () => ({
    connectRedis: () => connectRedis(),
    redisClient: { quit: vi.fn() },
}));

vi.mock("../src/utils/logger", () => ({
    log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

/** Boots server.ts under a given environment and waits for the start to settle. */
async function boot(env: Record<string, string | undefined>) {
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys(env)) {
        saved[key] = process.env[key];
        if (env[key] === undefined) delete process.env[key];
        else process.env[key] = env[key];
    }

    listen.mockClear();
    connectRedis.mockClear();
    exit.mockClear();
    vi.resetModules();

    try {
        await import("../src/server");
        // startServer() is async and self-invoked; let it run to the listen call.
        await new Promise((resolve) => setTimeout(resolve, 0));
    } catch {
        // A rejected import is itself an acceptable outcome: it means boot failed.
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

describe("server boot: the production CORS guard is wired in", () => {
    it("refuses to start a production deploy with no allow-list", async () => {
        await boot({ NODE_ENV: "production", CORS_ORIGINS: "", FRONTEND_URL: "" });

        expect(listen, "must not accept traffic with an empty CORS allow-list").not.toHaveBeenCalled();
    });

    it("refuses to start a production deploy with a wildcard", async () => {
        await boot({ NODE_ENV: "production", CORS_ORIGINS: "*", FRONTEND_URL: "" });

        expect(listen).not.toHaveBeenCalled();
    });

    it("starts normally in production when the allow-list is valid", async () => {
        await boot({
            NODE_ENV: "production",
            CORS_ORIGINS: "https://linkshift.in",
            FRONTEND_URL: "https://linkshift.in",
        });

        expect(listen).toHaveBeenCalled();
    });

    it("is not blocked by CORS config in development", async () => {
        // The guard must not make local work or CI depend on a production
        // setting, which was the whole point of splitting it out.
        await boot({ NODE_ENV: "development", CORS_ORIGINS: "", FRONTEND_URL: "" });

        expect(listen).toHaveBeenCalled();
    });
});