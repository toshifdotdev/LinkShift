import { Request, Response, NextFunction} from "express";
import jwt from 'jsonwebtoken';
import { config } from "../config";
import { AppError } from "../errors/AppError";
import { CustomJwtPayload } from "../features/auth/auth.types";

export const authMiddleWare = (req : Request, res : Response, next : NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer') ? authHeader.split(' ')[1] : null;

    if(!token) {
        return next(new AppError("Token missing", 401));
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret as string) as CustomJwtPayload;

        // Guard against malformed payloads (e.g. legacy tokens signed with a
        // non-string `id`). Without this, downstream Prisma calls throw a
        // PrismaClientValidationError — a non-AppError — and the error
        // middleware returns a generic 500 "Internal Server Error" instead
        // of a meaningful 401.
        if (typeof decoded.id !== "string" || decoded.id.length === 0) {
            return next(new AppError("Invalid token", 401));
        }

        req.auth = {
            id    : decoded.id,
            email : decoded.email
        }
        return next();

    }catch(err) {
        if (err instanceof jwt.TokenExpiredError) {
            return next(new AppError("Token expired", 401));
        }

        if (err instanceof jwt.JsonWebTokenError) {
            return next(new AppError("Invalid token", 401));
        }
        return next(err);
    }
}