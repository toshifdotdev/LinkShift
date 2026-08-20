import { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { qrService, qrDownloadService, uploadQrLogoService, deleteQrService} from "./qr.service";
import { createLinkQr } from "./qr.validation";

type linkIdParams = {
    id : string
}

type qrIdParams = {
    id : string
}


export const qrController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const body = validated.body as createLinkQr;
    const params = validated.params as linkIdParams;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = params;
    const { 
        foregroundColor, 
        backgroundColor, 
        margin, 
        pattern, 
        eyeStyle, 
        eyeBallStyle, 
        logoUrl,
        logoPublicId
        } = body;

    const qr = await qrService({
        userId : auth.id,
        linkId : id,
        foregroundColor,
        backgroundColor,
        margin,
        pattern,
        eyeStyle,
        eyeBallStyle,
        logoUrl,
        logoPublicId
    });

    res.status(200).json({
        success : true,
        data : qr
    })
})


export const qrDownloader = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = params;

    const data = await qrDownloadService(auth.id, id);

    const downloadUrl = data.imageUrl.replace("/upload/", "/upload/fl_attachment:LinkShift_QR/");
    
    return res.redirect(downloadUrl);

})

export const uploadQrLogoController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;

     if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    if (!req.file) {
        throw new AppError("Image is required.", 400);
    }


    const result = await uploadQrLogoService(auth.id, req.file);

    res.status(200).json({
        success : true,
        ...result
    })

})

export const deleteQrController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const { id } = validated.params as qrIdParams;;

    await deleteQrService(auth.id, id);

    res.status(200).json({
        success: true,
        message: "QR deleted successfully."
    });
})