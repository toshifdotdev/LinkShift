import { defineConfig } from "vitest/config";

// TRUST_PROXY_HOPS=0 keeps req.ip pinned to the socket address so rate-limit
// tests are deterministic. Integration suites opt in via RUN_INTEGRATION=1
// because they touch the shared dev database.
export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        env: {
            NODE_ENV: "test",
            TRUST_PROXY_HOPS: "0",
            PORT: "0",
        },
        setupFiles: ["./tests/setup.ts"],
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
