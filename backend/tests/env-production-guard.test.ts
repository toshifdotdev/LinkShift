import { describe, expect, it } from "vitest";
import { assertCriticalEnvConfigured } from "../src/config/env";

/**
 * Production boot requires the credentials the server cannot serve without.
 *
 * The CORS guard already stopped an unreachable deployment; this one stops a
 * deployment that looks healthy but is not: a JWT_SECRET-less boot signs tokens
 * with `undefined`, and a missing DATABASE_URL surfaces as a confusing pool
 * error on the first query. Both are caught here at boot instead, and only in
 * production — tests and dev boot freely.
 */
describe("assertCriticalEnvConfigured", () => {
    it("passes in production with both variables set", () => {
        expect(() =>
            assertCriticalEnvConfigured({
                NODE_ENV: "production",
                DATABASE_URL: "postgresql://user:pass@host/db",
                JWT_SECRET: "secret",
            }),
        ).not.toThrow();
    });

    it("names the missing variable in production", () => {
        expect(() =>
            assertCriticalEnvConfigured({
                NODE_ENV: "production",
                JWT_SECRET: "secret",
            }),
        ).toThrow(/DATABASE_URL/);
    });

    it("treats whitespace-only values as missing", () => {
        expect(() =>
            assertCriticalEnvConfigured({
                NODE_ENV: "production",
                DATABASE_URL: "   ",
                JWT_SECRET: "secret",
            }),
        ).toThrow(/DATABASE_URL/);
    });

    it("reports every missing variable at once", () => {
        expect(() =>
            assertCriticalEnvConfigured({ NODE_ENV: "production" }),
        ).toThrow(/DATABASE_URL, JWT_SECRET/);
    });

    it("never blocks dev or test boots", () => {
        expect(() =>
            assertCriticalEnvConfigured({ NODE_ENV: "development" }),
        ).not.toThrow();
        expect(() =>
            assertCriticalEnvConfigured({ NODE_ENV: "test" }),
        ).not.toThrow();
    });
});
