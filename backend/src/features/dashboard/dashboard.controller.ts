import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { dashboardService, getAnalytics, getActivity, getChartData } from "./dashboard.service";

type linkIdParams = {
    id : string
}

export const dashboardController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const stats = await dashboardService(auth.id);

    res.status(200).json({
        success : true,
        data : stats
    })
})

export const analyticsController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;

    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = params;

    const analytics = await getAnalytics(auth.id, id);

    res.status(200).json({
        success : true,
        analytics
    })
})

export const activityController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const activity = await getActivity(auth.id);

    res.status(200).json({
        success : true,
        data : activity
    })
})

export const chartController = asyncHandler(async(req : Request, res : Response, next : NextFunction) =>  {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = params;

    const activity = await getChartData(auth.id, id);

    res.status(200).json({
        success : true,
        data : activity
    })
})