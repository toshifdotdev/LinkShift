import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { dashboardService, getAnalytics, getActivity, getChartData } from "./dashboard.service";
import { queryDaysInput } from "../link/link.validation";
import { exportLinkAnalytics } from "./csv.service";

type linkIdParams = {
    id : string
}

export const dashboardController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!
    const { days }= validated.query as queryDaysInput;
    
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }


    const stats = await dashboardService(auth.id, days);

    res.status(200).json({
        success : true,
        data : stats
    })
})

export const analyticsController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;
    const { days }= validated.query as queryDaysInput;

    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = params;

    const analytics = await getAnalytics(auth.id, id, days);

    res.status(200).json({
        success : true,
        analytics
    })
})

export const activityController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!
    const { days }= validated.query as queryDaysInput;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const activity = await getActivity(auth.id, days);

    res.status(200).json({
        success : true,
        data : activity
    })
})

export const chartController = asyncHandler(async(req : Request, res : Response, next : NextFunction) =>  {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;
    const { days }= validated.query as queryDaysInput;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = params;

    const activity = await getChartData(auth.id, id, days);

    res.status(200).json({
        success : true,
        data : activity
    })
})


export const csvExportController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const validated = req.validated!;
    const { id } = validated.params as linkIdParams;
    const { days } = validated.query as queryDaysInput;

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="link-${id}-analytics.csv"`
    );

    
    const totalRows = await exportLinkAnalytics(
        (chunk) => res.write(chunk),
        auth.id,
        id,
        days
    );

    res.end();
    void totalRows;
})