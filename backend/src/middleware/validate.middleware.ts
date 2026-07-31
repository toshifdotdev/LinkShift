import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

import { z } from "zod";


export const validate = <T extends z.ZodTypeAny>(schema : T, location : "body" | "params" | "query" ) => {
    return (req : Request, res : Response, next : NextFunction) => {
        const parsed = schema.safeParse(req[location]);
        if (!parsed.success) {
            const errorMessage = parsed.error.issues[0]?.message ?? "Bad Request";
            return next(new AppError(errorMessage, 400));
        }
        if (!req.validated) {
            req.validated = {};
        }
        req.validated[location] = parsed.data;
        next();
    }
}
