import { defineConfig } from "vitest/config";




export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        env: {
            NODE_ENV: "test",
            TRUST_PROXY_HOPS: "0",
            DATABASE_POOL_MAX: "5",
            DB_CONNECT_TIMEOUT_MS: "15000",
            PORT: "0",
        },
        setupFiles: ["./tests/setup.ts"],
        testTimeout: 30_000,
        hookTimeout: 30_000,
    },
});
