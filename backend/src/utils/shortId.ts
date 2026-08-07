import { prisma } from "../config"
import { AppError } from "../errors/AppError"
import { nanoid } from 'nanoid';


const MAX_ATTEMPTS=6;  

export const getAvailableShortId = async (slug : string | undefined, domainId : string) => {
    if(slug) {
        const link = await prisma.link.findFirst({
            where : {
                shortId : slug,
                domainId
            }
        })
        if(link) {
            throw new AppError("Slug Already exists", 409)
        }
        return slug;
    }
 
    let attempts = 0; 

    while (attempts < MAX_ATTEMPTS) {
        const random = nanoid(7); 

        const exists = await prisma.link.findFirst({
            where : {
                shortId : random,
                domainId
            }
        })

        if(!exists)  {
            return random;
        }
        attempts++;
    }
    throw new AppError("Try Again", 409);
}