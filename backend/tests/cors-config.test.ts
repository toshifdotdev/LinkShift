import { describe, expect, it } from "vitest";
import { assertCorsOriginsConfigured, resolveCorsOrigins } from "../src/config/env";

/**
 * Regression coverage for the CORS allow-list.
 *
 * Previously `CORS_ORIGINS ?? FRONTEND_URL ?? <dev default>` was used.
 * `??` only falls back on null/undefined, so a variable that is present but
 * empty (`CORS_ORIGINS=`, which is what the shipped .env and .env.example
 * contained) resolved to an empty array. The cors package rejects every origin
 * against an empty allow-list, so the API became unreachable from the browser
 * with no error anywhere.
 */
describe("resolveCorsOrigins", () => {
    it("treats an empty CORS_ORIGINS as unset and falls back to FRONTEND_URL", () => {
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "",
                FRONTEND_URL: "http://localhost:5173",
                NODE_ENV: "development",
            }),
        ).toEqual(["http://localhost:5173"]);
    });

    it("treats a whitespace-only CORS_ORIGINS as unset", () => {
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "   ",
                FRONTEND_URL: "https://linkshift.in",
            }),
        ).toEqual(["https://linkshift.in"]);
    });

    it("allows the local Vite dev origin in development", () => {
        expect(
            resolveCorsOrigins({ FRONTEND_URL: "http://localhost:5173", NODE_ENV: "development" }),
        ).toEqual(["http://localhost:5173"]);
    });

    it("allows the production frontend origin", () => {
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "",
                FRONTEND_URL: "https://linkshift.in",
                NODE_ENV: "production",
            }),
        ).toEqual(["https://linkshift.in"]);
    });

    it("prefers an explicit CORS_ORIGINS over FRONTEND_URL", () => {
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "https://linkshift.in",
                FRONTEND_URL: "http://localhost:5173",
                NODE_ENV: "production",
            }),
        ).toEqual(["https://linkshift.in"]);
    });

    it("splits a comma-separated multi-origin list and trims each entry", () => {
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "https://linkshift.in, https://staging.example.com ,",
                NODE_ENV: "production",
            }),
        ).toEqual(["https://linkshift.in", "https://staging.example.com"]);
    });

    it("never resolves to an empty list in development", () => {
        expect(
            resolveCorsOrigins({ CORS_ORIGINS: "", FRONTEND_URL: "", NODE_ENV: "development" }),
        ).toEqual(["http://localhost:5173"]);
    });

    it("never resolves to an empty list when nothing is configured at all", () => {
        expect(resolveCorsOrigins({})).toEqual(["http://localhost:5173"]);
    });

it("returns an empty list in production when no origin is configured", () => {
        // Moved off the throwing resolver: resolving no longer decides whether
        // a deployment is safe. `assertCorsOriginsConfigured` still fails the
        // boot on exactly this input, covered below.
        expect(
            resolveCorsOrigins({
                CORS_ORIGINS: "",
                FRONTEND_URL: "",
                NODE_ENV: "production",
            }),
        ).toEqual([]);
    });

    it("rejects a wildcard in production even when FRONTEND_URL is set", () => {
        expect(() =>
            assertCorsOriginsConfigured({
                CORS_ORIGINS: "*,https://linkshift.in",
                FRONTEND_URL: "https://linkshift.in",
                NODE_ENV: "production",
            }),
        ).toThrow(/wildcard/i);
    });

    describe("importing config must not require a valid deployment", () => {
        // The defect this suite exists for: `resolveCorsOrigins` used to throw
        // when it was called, and `config` called it at module load. So any
        // module that merely read a config value inherited the obligation of
        // being correctly deployed for CORS. A test setting NODE_ENV=production
        // to check an unrelated guard died on this one first, which is exactly
        // how the Google OAuth production guards went unasserted for five
        // consecutive CI runs.
        it("resolves to an empty list in production instead of throwing", () => {
            expect(
                resolveCorsOrigins({ CORS_ORIGINS: "", FRONTEND_URL: "", NODE_ENV: "production" }),
            ).toEqual([]);
        });

        it("does not throw on a wildcard at resolve time", () => {
            expect(resolveCorsOrigins({ CORS_ORIGINS: "*", NODE_ENV: "production" })).toEqual(["*"]);
        });

        it("is still caught by the boot-time guard, so nothing regresses", () => {
            expect(() =>
                assertCorsOriginsConfigured({ CORS_ORIGINS: "", FRONTEND_URL: "", NODE_ENV: "production" }),
            ).toThrow(/CORS_ORIGINS/);
            expect(() =>
                assertCorsOriginsConfigured({ CORS_ORIGINS: "*", NODE_ENV: "production" }),
            ).toThrow(/wildcard/i);
        });
    });

    describe("the boot-time guard", () => {
        it("is a no-op outside production, so dev and CI start normally", () => {
            expect(() =>
                assertCorsOriginsConfigured({ CORS_ORIGINS: "", FRONTEND_URL: "", NODE_ENV: "development" }),
            ).not.toThrow();
            expect(() => assertCorsOriginsConfigured({})).not.toThrow();
        });

        it("accepts a valid production allow-list", () => {
            expect(() =>
                assertCorsOriginsConfigured({
                    CORS_ORIGINS: "https://linkshift.in",
                    NODE_ENV: "production",
                }),
            ).not.toThrow();
        });

        it("falls back to FRONTEND_URL when CORS_ORIGINS is empty", () => {
            expect(() =>
                assertCorsOriginsConfigured({
                    CORS_ORIGINS: "",
                    FRONTEND_URL: "https://linkshift.in",
                    NODE_ENV: "production",
                }),
            ).not.toThrow();
        });
    });
});
