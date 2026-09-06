import express, { NextFunction, Request, Response } from 'express';
import authRouter from './features/auth/auth.routes';
import qrRouter from './features/qr/qr.routes';
import redirectRouter from './features/redirect/redirect.routes';
import dashRouter from './features/dashboard/dashboard.routes'
import linkRouter from './features/link/link.routes'
import domainRouter from './features/domains/domain.routes'
import billingRouter from './features/billing/billing.routes';
import internalRouter from './features/internal/reconciliation.routes';
import usersRouter from './features/users/users.routes';
import supportRouter from './features/support/support.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { AppError } from './errors/AppError';
import { razorpayWebhookController } from './features/billing/billing.controller';
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";
import { config, prisma } from "./config";
import { redisClient } from "./config/redis";
import "./features/auth/google.strategy";

export const app = express();


const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
}

app.use(cookieParser());
app.use(passport.initialize());

app.use(helmet());

app.use(
    cors({
        origin: config.corsOrigins,
        credentials: true,
    })
);

app.post(
    "/api/v1/billing/webhook", 
    express.raw({ type: "application/json" }), 
    razorpayWebhookController
);

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.get("/health", async (_, res) => {
    
    
    const checks: Record<string, string> = {};

    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = "up";
    } catch {
        checks.database = "down";
    }

    checks.redis = redisClient.isReady ? "up" : "down";

    const healthy = checks.database === "up";

    res.status(healthy ? 200 : 503).json({
        status: healthy ? "ok" : "degraded",
        checks,
    });
});

app.use("/api/v1/auth",authRouter);
app.use("/api/v1/qr",qrRouter); 
app.use("/api/v1/links", linkRouter);

app.get("/favicon.ico", (_, res) => {
    res.sendStatus(204);
});

app.use("/api/v1/dashboard",dashRouter);
app.use("/api/v1/domains", domainRouter);
app.use("/api/v1/billing", billingRouter)
app.use("/api/v1/internal", internalRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/support", supportRouter);


app.use("/",redirectRouter);

app.use((req : Request, res : Response, next : NextFunction) => {
    next(new AppError("Route not found",404));
 })

app.use(errorMiddleware);