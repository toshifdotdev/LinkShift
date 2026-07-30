import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { dashboardService, getAnalytics, getActivity} from "./dashboard.service";

type linkIdParams = {
    id ?: string
}

export const dashboardController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const user = req.user;
    if(!user) {
        return next(new AppError("Unauthorized", 401));
    }
    const stats = await dashboardService(user.id);

    res.status(200).json({
        success : true,
        data : stats
    })
})

export const analyticsController = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;
    if(!user) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = req.params as { id : string};

    const analytics = await getAnalytics(user.id, id);

    res.status(200).json({
        success : true,
        analytics
    })
})

export const activityController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const user = req.user;
    if(!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const activity = await getActivity(user.id);

    res.status(200).json({
        success : true,
        data : activity
    })

})