import { Request } from "express";
import { prisma } from "../../config"
import * as bcrypt from 'bcrypt';
import { AppError } from "../../errors/AppError"
import { extractVisitorInfo } from "./visitor.service";


type RedirectParams = {
    shortId?: string;
}; 

export const redirect = async(shortId : string, req : Request<RedirectParams>) => {
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

    if (targetUrl.expiresAt && targetUrl.expiresAt < new Date()) {
        throw new AppError("This link has expired.",410);
    }

    if(targetUrl.passwordHash) {
        return {
            requiresPassword:true
        }
    }

    const { device, browser, os, ipAddress } = await extractVisitorInfo(req);

    try {
        await prisma.scan.create({
            data : {
                device,
                browser,
                os,
                ipAddress,
                linkId : targetUrl.id
            }
        })
    }catch(err) {
        console.error(err);
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