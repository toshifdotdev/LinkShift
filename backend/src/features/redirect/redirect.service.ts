import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { getCache, setCache } from "../../utils/cache";
import { completeTargetUrl } from "../../utils/completeRedirect";

export type CachedLink = {
    id: string;
    userId : string
    targetUrl: string;
    isActive: boolean;
    domainId: string;
    expiresAt: Date | null;
    passwordHash: string | null;
};

type RedirectResult =
    | {
        requiresPassword: false;
        targetUrl: string;
    }
    | {
        requiresPassword: true;
        linkId: string;
    };



export const redirect = async(shortId : string, host : string, req : Request) : Promise<RedirectResult> => {
    const cacheKey = `link:${host}:${shortId}`;

    const cachedLink = await getCache(cacheKey);

    const domain = await prisma.domain.findUnique({
            where : {
                host
            }
        })


    if(!domain) {
        throw new AppError("Domain Not Found", 400);
    }

    if (!domain.verified) {
        throw new AppError(
            "Domain is not verified.",
            403
        );
    }

    let targetUrl : CachedLink | null = null;

    if(cachedLink) {
        const cached = JSON.parse(cachedLink);
        targetUrl = {
        ...cached,
        expiresAt: cached.expiresAt
            ? new Date(cached.expiresAt)
            : null,
        };
    }


    else {
        targetUrl = await prisma.link.findFirst({
            where : {
                shortId,
                domainId : domain.id
                
            }
        })

        if(!targetUrl) {
            throw new AppError("This short link doesn't exist.", 404);
        }

        const cacheData = {
            id : targetUrl.id,
            domainId : targetUrl.domainId,
            userId : targetUrl.userId,
            targetUrl: targetUrl.targetUrl,
            isActive: targetUrl.isActive,
            expiresAt: targetUrl.expiresAt,
            passwordHash : targetUrl.passwordHash 
        };

        await setCache(cacheKey, cacheData, 86400);
    }

    if (!targetUrl) {
        throw new AppError("Link not found", 404);
    }

    if(targetUrl.passwordHash) {
        return {
            requiresPassword:true,
            linkId : targetUrl.id
        }
    }

    const result = await completeTargetUrl(targetUrl, req);

    return {
        requiresPassword : false,
        targetUrl : result.targetUrl
    }
}



export const unlockService = async(shortId : string, password : string, host : string, req : Request) => {
    const domain = await prisma.domain.findFirst({
            where : {
                host 
            }
    })

    if(!domain) {
        throw new AppError("Domain Not Found", 400);
    }

    const targetUrl = await prisma.link.findFirst({
        where : {
            shortId,
            domainId : domain.id
            
        }
    })

    if(!targetUrl) {
        throw new AppError("This short link doesn't exist.", 404);
    }


    if (!targetUrl.passwordHash) {
        throw new AppError("This link is not password protected.",400);
    }

    const comparePass = await bcrypt.compare(password, targetUrl.passwordHash);

    if(!comparePass) {
        throw new AppError("Incorrect Password", 401);
    }

    const result = await completeTargetUrl(targetUrl, req);

    return result.targetUrl;

}