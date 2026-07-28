import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { qrService } from "./qr.service";

type linkIdParams = {
    id ?: string
}

export const qrController = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;
    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = req.params as {id : string};
    const { foregroundColor, backgroundColor, margin } = req.body;

    const qr = await qrService({
        userId : user.id,
        linkId : id,
        foregroundColor,
        backgroundColor,
        margin
    });

    res.status(200).json({
        success : true,
        data : qr
    })
})