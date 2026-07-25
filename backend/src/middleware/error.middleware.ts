// TODO:
// Replace inline HTML with a proper EJS error page
// after the frontend theme and mascot are finalized.




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
            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });
    }

        if(err instanceof AppError) {
            return res.status(err.statusCode).send(`
                        <h1>404</h1>
                        <p>${err.message}</p>
                        `);
        }
        else {
           return res.status(500).send(`
                        <h1>404</h1>
                        <p>Internal Server Error</p>
                        `);

        }
    }


           


