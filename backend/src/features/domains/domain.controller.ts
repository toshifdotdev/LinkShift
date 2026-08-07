import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../errors/AppError";
import { getDomains, addDomain, verifyDomain, updateDomainService, deleteDomainService } from "./domain.service";
import { addDomainData } from "./domain.validation";


type domainIdParams = {
    id : string
}

export const getDomainController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const domains = await getDomains(auth.id);

    res.status(200).json({
        success : true,
        data : domains
    })
})

export const addDomainController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const validated = req.validated!;

    const { body } = validated;
    const { host } = body as addDomainData;
    
    const result = await addDomain(auth.id, host);
    res.status(201).json({
        success : true,
        ...result
    })
})

export const verifyController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const validated = req.validated!;
    const {params} = validated; 
    const { id } = params as domainIdParams;

    const result = await verifyDomain(auth.id, id);
    
    res.status(200).json({
        success: true,
        message: result.alreadyVerified
            ? "Domain is already verified."
            : "Domain verified successfully."
    });

})

export const updateDomainController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const validated = req.validated!;

    const { body } = validated;
    const { params } = validated;
    const { host } = body as addDomainData;

    
    const { id } = params as domainIdParams;

    const result = await updateDomainService(auth.id, id, host)

     res.status(200).json({
        success : true,
        ...result
    }) 

})

export const deleteDomainController = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    if(!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const validated = req.validated!;
    const { id } = validated.params as domainIdParams;

    await deleteDomainService(auth.id, id)

    res.status(200).json({
        success: true,
        message: "Domain deleted successfully."
    });

})