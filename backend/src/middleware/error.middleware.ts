import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const errorMiddleware = (err : unknown, req : Request, res : Response, next : NextFunction) => {
    if(req.path.startsWith('/api')) {

            if (err instanceof AppError) {
                return res.status(err.statusCode).json({
                    success: false,
                    message: err.message
                });
            }
            // Log the real exception so a 500 is debuggable from the server
            // terminal — generic "Internal Server Error" is useless on its own.
            console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> 500:`, err);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
    }

        if(err instanceof AppError) {
            return res.status(err.statusCode).send(`
                        <h1>${err.statusCode}</h1>
                        <p>${err.message}</p>
                        `);
        }
        else {
           return res.status(500).send(`
                        <h1>500</h1>
                        <p>Internal Server Error</p>
                        `);

        }
    }