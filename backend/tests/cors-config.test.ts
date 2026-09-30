import { describe, expect, it } from "vitest";
import { resolveCorsOrigins } from "../src/config/env";

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

    it("fails loudly in production when no origin is configured", () => {
        expect(() =>
            resolveCorsOrigins({
                CORS_ORIGINS: "",
                FRONTEND_URL: "",
                NODE_ENV: "production",
            }),
        ).toThrow(/CORS_ORIGINS/);
    });

    it("rejects a wildcard in production", () => {
        expect(() =>
            resolveCorsOrigins({ CORS_ORIGINS: "*", NODE_ENV: "production" }),
        ).toThrow(/wildcard/i);
    });

    it("rejects a wildcard in production even when FRONTEND_URL is set", () => {
        expect(() =>
            resolveCorsOrigins({
                CORS_ORIGINS: "*,https://linkshift.in",
                FRONTEND_URL: "https://linkshift.in",
                NODE_ENV: "production",
            }),
        ).toThrow(/wildcard/i);
    });
});