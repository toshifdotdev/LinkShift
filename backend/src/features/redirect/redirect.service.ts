import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { getCache, setCache, linkCacheKey } from "../../utils/cache";
import { completeTargetUrl, applyDeepLink } from "../../utils/completeRedirect";
import { checkRedirectLimit, hasDeepLinkAccess } from "../billing/billing.service";

export type CachedLink = {
    id: string;
    userId : string
    targetUrl: string;
    isActive: boolean;
    domainId: string;
    expiresAt: Date | null;
    passwordHash: string | null;
    deepLink: boolean;
    utmSource: string | null,
    utmMedium: string | null,
    utmCampaign: string | null,
    utmTerm: string | null,
    utmContent: string | null
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
    const cacheKey = linkCacheKey(host, shortId);

    const cachedLink = await getCache(cacheKey);

    let targetUrl : CachedLink | null = null;

    if(cachedLink) {
        const cached = JSON.parse(cachedLink);
        targetUrl = {
        ...cached,
        deepLink: cached.deepLink ?? false,
        expiresAt: cached.expiresAt
            ? new Date(cached.expiresAt)
            : null,
        };
    }

    if (!targetUrl) {
        /* Hot path: one Prisma call resolves the link AND its domain row
           (include), so the common cache-miss case no longer does a domain
           lookup + a link lookup back-to-back. */
        const linkWithDomain = await prisma.link.findFirst({
            where: {
                shortId,
                domain: { host },
            },
            include: { domain: true },
        });

        if (!linkWithDomain) {
            /* Slow path (no link). Disambiguate "no such domain" vs "no
               such link" with a single follow-up so the right branded
               page is shown. */
            const domain = await prisma.domain.findUnique({ where: { host } });
            if (!domain) {
                throw new AppError("Domain Not Found", 400);
            }
            throw new AppError("This short link doesn't exist.", 404);
        }

        if (!linkWithDomain.domain.verified) {
            throw new AppError("Domain is not verified.", 403);
        }

        targetUrl = {
            id: linkWithDomain.id,
            domainId: linkWithDomain.domainId,
            userId: linkWithDomain.userId,
            targetUrl: linkWithDomain.targetUrl,
            isActive: linkWithDomain.isActive,
            expiresAt: linkWithDomain.expiresAt,
            passwordHash: linkWithDomain.passwordHash,
            deepLink: linkWithDomain.deepLink,
            utmSource: linkWithDomain.utmSource,
            utmMedium: linkWithDomain.utmMedium,
            utmCampaign: linkWithDomain.utmCampaign,
            utmTerm: linkWithDomain.utmTerm,
            utmContent: linkWithDomain.utmContent,
        };

        await setCache(cacheKey, targetUrl, 86400);
    }

    if (!targetUrl) {
        throw new AppError("Link not found", 404);
    }

    if (!targetUrl.isActive) {
        throw new AppError("This link has been disabled by its owner.", 403)
    }
    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    await checkRedirectLimit(targetUrl.userId);

    if(targetUrl.passwordHash) {
        return {
            requiresPassword:true,
            linkId : targetUrl.id
        }
    }

    const result = await completeTargetUrl(targetUrl, req);

    let finalUrl = result.targetUrl;
    if (targetUrl.deepLink && (await hasDeepLinkAccess(targetUrl.userId))) {
        finalUrl = applyDeepLink(finalUrl, req);
    }

    return {
        requiresPassword : false,
        targetUrl : finalUrl
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

    let finalUrl = result.targetUrl;
    if (targetUrl.deepLink && (await hasDeepLinkAccess(targetUrl.userId))) {
        finalUrl = applyDeepLink(finalUrl, req);
    }

    return finalUrl;

}