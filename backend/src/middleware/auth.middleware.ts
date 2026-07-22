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
        req.user = {
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