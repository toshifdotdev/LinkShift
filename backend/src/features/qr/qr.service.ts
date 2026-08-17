import { config, prisma } from "../../config"
import { AppError } from "../../errors/AppError";
import { createLinkQr } from './qr.validation';
import { generateQrImage } from '../../utils/generateQr';
import { uploadImage } from "../../utils/uploadImage";
import { buildQrResponse } from "../../utils/buildQrResponse";
import { deleteImage } from "../../utils/deleteImage";
import { checkQrLimit } from "../billing/billing.service";

export const qrService = async(data : createLinkQr) => {

    await checkQrLimit(data.userId);
    
    const currentLink =  await prisma.link.findFirst({
        where : {
            id : data.linkId,
            userId : data.userId
        }
    })
    

    if(!currentLink) {
        throw new AppError("Link not found",404);
    }

    const shortUrl = `${config.APP_URL}/r/${currentLink.shortId}`;

    const foregroundColor = data.foregroundColor ?? "#000000";
    const backgroundColor = data.backgroundColor ?? "#FFFFFF";
    const margin = data.margin ?? 2;
    const pattern = data.pattern ?? "square";
    const eyeStyle = data.eyeStyle ?? "square";
    const eyeBallStyle = data.eyeBallStyle ?? "square";
    const logoUrl = data.logoUrl;
    const logoPublicId = data.logoPublicId ?? null;

    const existingQr = await prisma.qr.findFirst({
        where : {
            linkId : currentLink.id,
            foregroundColor,
            backgroundColor,
            margin,
            pattern,
            eyeBallStyle,
            eyeStyle,
            logoUrl,
            logoPublicId
        }
    })

    if(existingQr) {
        return buildQrResponse(existingQr, currentLink.shortId)
    }

    
    try {
        const qrImageData = await generateQrImage({ margin, foregroundColor, backgroundColor, userId : currentLink.userId,shortUrl, logoUrl , pattern, eyeStyle, eyeBallStyle});
        
        const qr = await prisma.qr.create({
            data: {
                imageUrl : qrImageData.url,
                imagePublicId : qrImageData.publicId,
                margin,
                foregroundColor,
                backgroundColor,
                pattern,
                eyeBallStyle,
                eyeStyle,
                logoUrl,
                logoPublicId,
                linkId : currentLink.id
            }
        })

        return buildQrResponse(qr, currentLink.shortId)

    } catch(err) {
        console.error(err);

        throw new AppError(
            "Failed to generate QR",
            500
        );
        
    }
}


export const qrDownloadService = async(userId : string, qrId : string) => {
    const existingQr = await prisma.qr.findFirst({
        where : {
            id : qrId,
            link : {
                userId
            }
        }
    })

    if(!existingQr) {
        throw new AppError("Qr Not Found.", 404);
    }

    return {
        imageUrl : existingQr.imageUrl,
    }
}

export const uploadQrLogoService = async(userId : string, file : Express.Multer.File) => {
    const user = await prisma.user.findUnique({
        where : {
            id : userId
        },

    })

    if(!user) {
        throw new AppError("User not found", 404);
    }

    const uploaded = await uploadImage(file, `qrs/${user.id}/logos`);

    return {
        logUrl : uploaded.url,
        logoPublicId : uploaded.publicId
    }
}

export const deleteQrService = async(userId : string, qrId : string) => {
    const qr = await prisma.qr.findFirst({
        where: {
            id: qrId,
            link: {
                userId
            }
        }
    });

    if(!qr) {
        throw new AppError("Qr not found", 404);
    }

    await deleteImage(qr.imagePublicId);

    await prisma.qr.delete({
        where : {
            id : qr.id
        }
    })
    return;
}