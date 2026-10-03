import { app } from "./app";
import { config, prisma } from "./config";
import { assertCorsOriginsConfigured, assertCriticalEnvConfigured } from "./config/env";
import { connectRedis, redisClient } from "./config/redis";
import { log } from "./utils/logger";

const FORCE_EXIT_MS = 10_000;

// Last-resort handlers. A stray rejection must land in the logs and take the
// process down cleanly rather than leaving a half-alive worker: the platform
// restarts the container and the error is on record instead of vanishing.
// The exit is production-only — test workers import this module too, and one
// suite's stray rejection must not kill an unrelated suite mid-run.
process.on("unhandledRejection", (reason) => {
    log.error("unhandled_rejection", {
        error: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
    if (process.env.NODE_ENV === "production") process.exit(1);
});

process.on("uncaughtException", (err) => {
    log.error("uncaught_exception", { error: err.message, stack: err.stack });
    if (process.env.NODE_ENV === "production") process.exit(1);
});

async function startServer() {

    void connectRedis();

    // Before anything can accept traffic. The CORS allow-list is no longer
    // validated as a side effect of importing config, so this is the only
    // thing standing between a misconfigured production deploy and an API
    // that silently rejects every browser origin.
    assertCorsOriginsConfigured();
    assertCriticalEnvConfigured();


    const server = app.listen(config.port, () => {
        log.info("server_listening", { port: config.port });
    });

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        log.info("shutdown_started", { signal });

        const forceExit = setTimeout(() => {
            log.error("shutdown_forced", { reason: "timeout", timeoutMs: FORCE_EXIT_MS });
            process.exit(1);
        }, FORCE_EXIT_MS).unref();

        server.close(async () => {
            try {
                await prisma.$disconnect();
                await redisClient.quit();
                log.info("shutdown_complete", {});
            } catch (err) {
                log.error("shutdown_cleanup_error", { error: (err as Error)?.message ?? String(err) });
            } finally {
                clearTimeout(forceExit);
                process.exit(0);
            }
        });
    };

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
}

startServer().catch((err) => {
    log.error("server_start_failed", { error: (err as Error)?.message ?? String(err) });
    process.exit(1);
});
