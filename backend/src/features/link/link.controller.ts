import { NextFunction, Request, Response } from "express";
import { createLink  as createLinkService, getLinks as getLinksService, getLink as getLinkService, updateLink as updateLinkService, deleteLink as deleteLinkService} from "./link.service";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { queryData } from "./link.query.validation";
import { CreateLinkData, updateData } from "./link.validation";
import { deleteCache } from "../../utils/cache";

type linkIdParams = {
    id : string
}


export const createLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const validated = req.validated!;

    const { targetUrl, name, expiresAt, password, slug, domainId} = validated.body as CreateLinkData;

    const auth = req.auth;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const createdLink = await createLinkService({
                                userId: auth.id,
                                targetUrl,
                                name,
                                expiresAt,
                                password,
                                slug,
                                domainId
                            });
    
    await deleteCache(`dashboard:${auth.id}`);

    res.status(201).json({
        message : "Link Created",
        data : createdLink
        
    })
})

export const getLinks = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;

    const query = validated.query as queryData;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }

    const { links, pagination} = await getLinksService({userId : auth.id,
                                        ...query
                                        });
   
    res.status(200).json({
        success: true,
        data: links,
        pagination
    });
                        
})

export const getLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = params;

    const link = await getLinkService(auth.id, id);

    res.status(200).json({
        success: true,
        data: link
});

})

export const updateLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const body = validated.body as updateData;
    const params = validated.params as linkIdParams;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const { name, isActive, targetUrl, expiresAt, password, domainId, slug } = body;
    const { id } = params;

    const updatedLink = await updateLinkService({userId : auth.id, linkId : id ,name, isActive, targetUrl, expiresAt, password, domainId, slug});

    await deleteCache(`dashboard:${auth.id}`)
    
    res.status(200).json({
        success : true,
        data : updatedLink
    })
})


export const deleteLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const auth = req.auth;
    const validated = req.validated!;
    const params = validated.params as linkIdParams;

    if (!auth) {
        return next(new AppError("Unauthorized", 401));
    }
    const {id} = params;

    await deleteLinkService({userId : auth.id, linkId : id});

    res.status(200).json({
        success : true,
        "message": "Link deleted successfully."
    })
})