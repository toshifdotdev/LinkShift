import express, { NextFunction, Request, Response } from 'express';
import authRouter from './features/auth/auth.routes';
import qrRouter from './features/qr/qr.routes';
import redirectRouter from './features/redirect/redirect.routes';
import dashRouter from './features/dashboard/dashboard.routes'
import linkRouter from './features/link/link.routes'
import domainRouter from './features/domains/domain.routes'
import billingRouter from './features/billing/billing.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { AppError } from './errors/AppError';
import { razorpayWebhookController } from './features/billing/billing.controller';
import cors from "cors";

export const app = express();

app.set('trust proxy', true);

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.post(
    "/api/v1/billing/webhook", 
    express.raw({ type: "application/json" }), 
    razorpayWebhookController
);

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status : "Ok."
    });
});

app.use("/api/v1/auth",authRouter);
app.use("/api/v1/qr",qrRouter);
app.use("/api/v1/links", linkRouter);

app.get("/favicon.ico", (_, res) => {
    res.sendStatus(204);
});

app.use("/r",redirectRouter);
app.use("/api/v1/dashboard",dashRouter);
app.use("/api/v1/domains", domainRouter);
app.use("/api/v1/billing", billingRouter)

app.use((req : Request, res : Response, next : NextFunction) => {
    next(new AppError("Route not found",404));
 })

app.use(errorMiddleware);