import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { CancelSubscriptionInput, ChangePlanInput, CheckoutInput, PaymentVerificationInput, SubscriptionInput, SubscriptionVerificationInput } from "./billing.validation";
import { cancelSubscriptionService, changePlanService, checkoutService, getPlansService, razorpayWebhookService, subscriptionService, verifyPaymentService, verifySubscriptionService } from "./billing.service";

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


export const getPlansController = asyncHandler(async(req : Request, res : Response) => {

    const plans = await getPlansService();

    res.status(200).json({
        success : true,
        plans
    })

})


export const verifyPaymentController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;
    const body  = validated.body as PaymentVerificationInput;
    const auth = req.auth;
    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await verifyPaymentService(auth.id, body);

    res.status(200).json({
        success : true,
        result
    })

})

export const razorpayWebhookController = asyncHandler(async(req : Request, res : Response) => {
     const signature = req.headers["x-razorpay-signature"];

     if (typeof signature !== "string") {
       res.status(400).json({
        success: false,
        message: "Missing Razorpay signature"
      });
      return;
    }

    const result = await razorpayWebhookService(signature, req.body);

   res.status(200).json({
      status: true,
      message: "Razorpay signature verified",
      result,
    });
})

export const subscriptionController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;
    const body = validated.body as SubscriptionInput;
    const { plan, billingCycle} = body;
    const auth = req.auth;
    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await subscriptionService(auth.id, plan, billingCycle);

    res.status(200).json({
        success : true,
        result
    })
})

export const verifySubscriptionController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;
    const body = validated.body as SubscriptionVerificationInput;

    const auth = req.auth;
    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await verifySubscriptionService(auth.id, body);

    res.status(200).json({
        success : true,
        result
    })
})

export const cancelSubscriptionController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;
    const body = validated.body as CancelSubscriptionInput;

    const auth = req.auth;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await cancelSubscriptionService(auth.id, body.cancelAtPeriodEnd)

    res.status(200).json({
        success: true,
        result,
    });

})


export const changePlanController =  asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;
    const body = validated.body as ChangePlanInput;

    const auth = req.auth;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await changePlanService(auth.id, body.plan, body.billingCycle);

        res.status(200).json({
            success: true,
            result,
        });
})