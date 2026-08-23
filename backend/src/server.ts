import { app } from "./app";
import { config, prisma } from "./config";
import { connectRedis, redisClient } from "./config/redis";
import passport from "passport";
import cookieParser from "cookie-parser"
import "./features/auth/google.strategy";

const FORCE_EXIT_MS = 10_000;

async function startServer() {
    await connectRedis();

    app.use(cookieParser());
    app.use(passport.initialize());

    const server = app.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
    });

    // Graceful shutdown (Wave M1): stop accepting new connections, drain
    // in-flight requests, then close Prisma and Redis before exiting. A hard
    // timer guarantees the process never hangs on a stuck connection.
    let shuttingDown = false;
    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`${signal} received — shutting down gracefully...`);

        const forceExit = setTimeout(() => {
            console.error("Graceful shutdown timed out — forcing exit.");
            process.exit(1);
        }, FORCE_EXIT_MS).unref();

        server.close(async () => {
            try {
                await prisma.$disconnect();
                await redisClient.quit();
                console.log("Shutdown complete.");
            } catch (err) {
                console.error("Error during shutdown cleanup:", err);
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
    console.error("Failed to start server:", err);
    process.exit(1);
});
