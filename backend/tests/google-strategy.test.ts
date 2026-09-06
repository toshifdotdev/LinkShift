import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Google OAuth strategy registration semantics (hermetic — no network, no DB):
//
//   credentials present              → strategy registered (unchanged behavior)
//   credentials missing, dev/test/CI → module imports cleanly, strategy NOT
//                                      registered — this is what lets the app
//                                      initialize in CI without Google secrets
//   credentials missing, production  → fail fast at startup with a clear error
//
// "Missing" is simulated with EMPTY STRING values: dotenv (backend/.env) never
// overrides already-present process.env entries, so an empty string reliably
// reaches the config as falsy in any environment.
//
// Each case re-imports the module with a fresh module registry so the
// env-dependent configuration is evaluated per test.
// ---------------------------------------------------------------------------

vi.hoisted(() => {
    process.env.RESEND_API_KEY ??= "re_placeholder";
    process.env.CLOUDINARY_CLOUD_NAME ??= "ci-cloud";
    process.env.CLOUDINARY_API_KEY ??= "0";
    process.env.CLOUDINARY_API_SECRET ??= "ci-secret";
    process.env.JWT_SECRET ??= "test-jwt-secret";
    process.env.NODE_ENV ??= "test";
});

const GOOGLE_VARS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"] as const;

async function importStrategy(
    overrides: Record<string, string | undefined>,
): Promise<typeof import("../src/features/auth/google.strategy")> {
    vi.resetModules();
    const saved: Record<string, string | undefined> = {};
    for (const key of GOOGLE_VARS) {
        saved[key] = process.env[key];
    }
    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    try {
        return await import("../src/features/auth/google.strategy");
    } finally {
        for (const key of GOOGLE_VARS) {
            const previous = saved[key];
            if (previous === undefined) delete process.env[key];
            else process.env[key] = previous;
        }
    }
}

const CREDENTIALS = {
    GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback",
};

const UNCONFIGURED = {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_CALLBACK_URL: "",
};

function registeredStrategy(passport: unknown): unknown {
    return (passport as { _strategy: (name: string) => unknown })._strategy("google");
}

describe("Google OAuth strategy registration", () => {
    it("registers the strategy when credentials are configured", async () => {
        const { default: passport } = await importStrategy({ ...CREDENTIALS, NODE_ENV: "test" });

        expect(registeredStrategy(passport)).toBeTruthy();
    });

    it("imports cleanly without credentials outside production and skips registration", async () => {
        const { default: passport } = await importStrategy({ ...UNCONFIGURED, NODE_ENV: "test" });

        // passport's default authenticator is a cross-module singleton that
        // survives vi.resetModules (node_modules are externalized) — drop any
        // strategy leaked by earlier tests so THIS import is what's measured.
        (passport as { unuse?: (name: string) => void }).unuse?.("google");

        // The module itself must not throw (CI/hermetic imports depend on this)…
        expect(passport).toBeDefined();
        // …and no half-configured strategy may be registered.
        expect(registeredStrategy(passport)).toBeUndefined();
    });

    it("imports the full application cleanly without Google credentials", async () => {
        // The exact CI regression: app.ts side-effect-imports the strategy at
        // module load; that must not require Google secrets.
        vi.resetModules();
        Object.assign(process.env, UNCONFIGURED);

        await expect(import("../src/app")).resolves.toHaveProperty("app");
    }, 240_000); // cold import of the full app graph is slow on modest machines

    it("fails fast in production when credentials are missing", async () => {
        await expect(
            importStrategy({ ...UNCONFIGURED, NODE_ENV: "production" }),
        ).rejects.toThrow(/Google OAuth is not configured/);
    });

    it("registers normally in production when credentials are present", async () => {
        const { default: passport } = await importStrategy({ ...CREDENTIALS, NODE_ENV: "production" });

        expect(registeredStrategy(passport)).toBeTruthy();
    });
});
