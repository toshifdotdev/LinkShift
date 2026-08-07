import express, { NextFunction, Request, Response } from 'express';
import authRouter from './features/auth/auth.routes';
import qrRouter from './features/qr/qr.routes';
import redirectRouter from './features/redirect/redirect.routes';
import dashRouter from './features/dashboard/dashboard.routes'
import linkRouter from './features/link/link.routes'
import domainRouter from './features/domains/domain.routes'
import { errorMiddleware } from './middleware/error.middleware';
import { AppError } from './errors/AppError';


export const app = express();
app.set('trust proxy', true);
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
app.use("/uploads", express.static("uploads"));




app.use((req : Request, res : Response, next : NextFunction) => {
    next(new AppError("Route not found",404));
 })

app.use(errorMiddleware);