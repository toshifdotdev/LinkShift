import { NextFunction, Request, Response } from "express";
import { createLink  as createLinkService} from "./link.service";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";

export const createLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const { targetUrl, name} = req.body;

    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const createdLink = await createLinkService({
                                userId: user.id,
                                targetUrl,
                                name
                            });

    res.status(201).json({
        message : "Link Created",
        data : createdLink
        
    })
})