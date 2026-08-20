import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { CancelSubscriptionInput, ChangePlanInput, SubscriptionInput, SubscriptionVerificationInput } from "./billing.validation";
import { cancelSubscriptionService, changePlanService, getPlansService, getSubscriptionService, razorpayWebhookService, subscriptionService, verifySubscriptionService } from "./billing.service";
import { getCurrencyFromRequest } from "./billing.utils";

// export const checkoutController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
//     const auth = req.auth;

//     const validated = req.validated!;

//     const body = validated.body as CheckoutInput;

//     const { plan, billingCycle } = body;

//     if(!auth) {
//         return next(new AppError("Unauthorized", 401));
//     }

//     const result = await checkoutService(auth.id, plan, billingCycle);

//     res.status(200).json({
//         success : true,
//         ...result
//     })
// })

// export const verifyPaymentController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
//     const validated = req.validated!;
//     const body  = validated.body as PaymentVerificationInput;
//     const auth = req.auth;
//     if (!auth) {
//         return next(new AppError("Unauthorized", 401));
//     }

//     const result = await verifyPaymentService(auth.id, body);

//     res.status(200).json({
//         success : true,
//         result
//     })

// })

export const getPlansController = asyncHandler(async(req : Request, res : Response) => {
    const currency = await getCurrencyFromRequest(req);

    const plans = await getPlansService(currency);

    res.status(200).json({
        success : true,
        currency,
        plans
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

    const currency = await getCurrencyFromRequest(req);
    
    const auth = req.auth;
    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await subscriptionService(auth.id, plan, billingCycle, currency);

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
    const currency = await getCurrencyFromRequest(req);

    const auth = req.auth;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const result = await changePlanService(auth.id, body.plan, body.billingCycle, currency);

        res.status(200).json({
            success: true,
            result,
        });
})

export const getSubscriptionController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const subscription = await getSubscriptionService(auth.id);

        res.status(200).json({
            success: true,
            subscription,
        });
})

