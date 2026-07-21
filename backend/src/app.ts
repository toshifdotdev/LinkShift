import express from 'express';
import authRouter from './features/auth/auth.routes';
import qrRouter from './features/qr/qr.routes';
import redirectRouter from './features/redirect/redirect.routes';
import { errorMiddleware } from './middleware/error.middleware';

export const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status : "Ok."
    });
});

app.use("/api/v1/auth",authRouter);
app.use("/api/v1/qr",qrRouter);
app.use("/r",redirectRouter);

app.use(errorMiddleware);