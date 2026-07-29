import path from "path";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { qrService, qrDownloadService} from "./qr.service";

type linkIdParams = {
    id ?: string
}

type qrIdParams = {
    id ?: string
}

export const qrController = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;
    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = req.params as {id : string};
    const { 
        foregroundColor, 
        backgroundColor, 
        margin, 
        pattern, 
        eyeStyle, 
        eyeBallStyle, 
        logoUrl
        } = req.body;

    const qr = await qrService({
        userId : user.id,
        linkId : id,
        foregroundColor,
        backgroundColor,
        margin,
        pattern,
        eyeStyle,
        eyeBallStyle,
        logoUrl
    });

    res.status(200).json({
        success : true,
        data : qr
    })
})


export const qrDownloader = asyncHandler(async(req : Request<qrIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;
    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = req.params as {id : string};

    const data = await qrDownloadService(user.id, id);

    const filePath = path.join(process.cwd(), data.imageUrl);

    return res.download(filePath, `${id}.png`, (err) => {
                    if (err && !res.headersSent) {
                        return next(
                            new AppError("QR image not found",404)
                        );
                    }
            }) 

            // return things coming from data
})