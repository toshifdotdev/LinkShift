import { prisma } from "../../config"
import { AppError } from "../../errors/AppError"

export const redirect = async(shortId : string) => {
    const targetUrl = await prisma.link.findUnique({
        where : {
            shortId
        }
    })

    if(!targetUrl) {
        throw new AppError("This short link doesn't exist.", 404);
    }
    
    if(!targetUrl.isActive) {
        throw new AppError("This link has been disabled by its owner.", 403)
    }

    return targetUrl.targetUrl;


}