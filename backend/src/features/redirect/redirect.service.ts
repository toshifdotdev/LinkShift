import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { extractVisitorInfo } from "./visitor.service";
import { getLocation } from "../../utils/geoIp";
import { redisClient } from "../../config/redis";

type CachedLink = {
    id: string;
    targetUrl: string;
    isActive: boolean;
    expiresAt: Date | null;
    passwordHash: string | null;
};



export const redirect = async(shortId : string, req : Request) => {
    const cacheKey = `link:${shortId}`;
    const cachedLink = await redisClient.get(cacheKey);
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
        targetUrl = await prisma.link.findUnique({
            where : {
                shortId
            }
        })


        if(!targetUrl) {
            throw new AppError("This short link doesn't exist.", 404);
        }

        const cacheData = {
            id : targetUrl.id,
            targetUrl: targetUrl.targetUrl,
            isActive: targetUrl.isActive,
            expiresAt: targetUrl.expiresAt,
            passwordHash : targetUrl.passwordHash 
        };

        await redisClient.set(cacheKey, JSON.stringify(cacheData), {EX : 86400});
    }

    if (!targetUrl) {
        throw new AppError("Link not found", 404);
    }

    if(!targetUrl.isActive) {
            throw new AppError("This link has been disabled by its owner.", 403)
        }

    if (targetUrl.expiresAt && new Date(targetUrl.expiresAt) < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    if(targetUrl.passwordHash) {
        return {
            requiresPassword:true
        }
    }

    const { device, browser, os, ipAddress } = extractVisitorInfo(req);

    let location = ipAddress
    ? await getLocation(ipAddress)
    : undefined;


    try {
        await prisma.scan.create({
            data : {
                device,
                browser,
                os,
                city : location?.city ?? null,
                country : location?.country ?? null,
                ipAddress : ipAddress ?? null,
                linkId : targetUrl.id
            }
        })
    }catch(err) {
        console.error("Failed to save analytics:", err);
    }

    return targetUrl.targetUrl;
}



export const unlockService = async(shortId : string, password : string) => {
    const targetUrl = await prisma.link.findUnique({
        where : {
            shortId
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

    return targetUrl.targetUrl;

}