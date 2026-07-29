import { config, prisma } from "../../config"
import { AppError } from "../../errors/AppError";
import { createLinkQr } from './qr.validation';
import { generateQrImage } from '../../utils/generateQr';



export const qrService = async(data : createLinkQr) => {
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

    const existingQr = await prisma.qr.findFirst({
        where : {
            linkId : currentLink.id,
            foregroundColor,
            backgroundColor,
            margin,
            pattern,
            eyeBallStyle,
            eyeStyle,
            logoUrl 
        }
    })

    if(existingQr) {
        return {
            id : existingQr.id,
            imageUrl : existingQr.imageUrl,
            shortId: currentLink.shortId
            
        };
    }

    const qr = await prisma.qr.create({
        data : {
            linkId : currentLink.id,
            imageUrl : "PENDING"
        }
    })

    
    try {
        const imageUrl = await generateQrImage({ margin, foregroundColor, backgroundColor, qrId: qr.id, shortUrl, logoUrl , pattern, eyeStyle, eyeBallStyle});
        
        const updatingQr = await prisma.qr.update({
            where : {
                id : qr.id
            },
            data: {
                imageUrl,
                margin,
                foregroundColor,
                backgroundColor,
                pattern,
                eyeBallStyle,
                eyeStyle,
                logoUrl
            }
        })

        return {
            id : updatingQr.id,
            imageUrl : updatingQr.imageUrl,
            shortId: currentLink.shortId
        };

    } catch(err) {
        await prisma.qr.delete({
            where: {
                id: qr.id
            }
        });

        console.log(err);

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
        id : existingQr.id,
        imageUrl : existingQr.imageUrl,
        foregroundColor : existingQr.foregroundColor,
        backgroundColor : existingQr.backgroundColor,
        margin : existingQr.margin
    }
}