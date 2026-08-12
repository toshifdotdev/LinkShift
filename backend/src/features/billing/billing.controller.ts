import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { CheckoutInput } from "./billing.validation";
import { checkoutService } from "./billing.service";

export const checkoutController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

    const validated = req.validated!;

    const body = validated.body as CheckoutInput;

    const { plan, billingCycle } = body;


    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await checkoutService(auth.id, plan, billingCycle);

    res.status(200).json({
        success : true,
        ...result
    })
})
