import { prisma } from "../config"
import { AppError } from "../errors/AppError"
import { nanoid } from 'nanoid';


const MAX_ATTEMPTS=6;  

/**
 * `client` lets a caller run the same allocation inside a transaction.
 * Defaults to the global client, so existing single-create callers are
 * unchanged. A bulk import passes its transaction client here, because using
 * the global client mid-transaction would query outside it and could read
 * pre-transaction state.
 */
export const getAvailableShortId = async (slug : string | undefined, domainId : string, client : Pick<typeof prisma, "link"> = prisma) => {
    if(slug) {
        const link = await client.link.findFirst({
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

        const exists = await client.link.findFirst({
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