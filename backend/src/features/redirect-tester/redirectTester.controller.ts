import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { previewRedirect } from "./redirectTester.service";
import { ZodError } from "zod";

export const testRedirect = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const auth = req.auth;

        if (!auth) {
            return next(new AppError("Unauthorized", 401));
        }

        try {
            const preview = await previewRedirect(auth.id, req.body);

            res.status(200).json({
                success: true,
                data: preview,
            });
        } catch (err) {
            // The service parses the body itself so the route-level `validate`
            // middleware cannot reject a preview before the controller runs.
            // Surface the field-level message here rather than a bare 500.
            if (err instanceof ZodError) {
                const first = err.issues[0];
                return next(
                    new AppError(first?.message ?? "That preview request is not valid.", 400)
                );
            }
            throw err;
        }
    }
);
