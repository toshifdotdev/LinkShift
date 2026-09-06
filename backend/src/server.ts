import { app } from "./app";
import { config, prisma } from "./config";
import { connectRedis, redisClient } from "./config/redis";
import { log } from "./utils/logger";

const FORCE_EXIT_MS = 10_000;

async function startServer() {

    void connectRedis();


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
