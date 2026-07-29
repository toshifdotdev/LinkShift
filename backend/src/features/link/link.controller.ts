import { NextFunction, Request, Response } from "express";
import { createLink  as createLinkService, getLinks as getLinksService, getLink as getLinkService, updateLink as updateLinkService, deleteLink as deleteLinkService} from "./link.service";
import { AppError } from "../../errors/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { queryData } from "./link.query.validation";

type linkIdParams = {
    id ?: string
}


export const createLink = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const { targetUrl, name} = req.body;

    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const createdLink = await createLinkService({
                                userId: user.id,
                                targetUrl,
                                name
                            });

    res.status(201).json({
        message : "Link Created",
        data : createdLink
        
    })
})

export const getLinks = asyncHandler(async(req : Request, res : Response, next : NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }

    const { links, pagination} = await getLinksService({userId : user.id,
                                        ...(req.query as unknown as queryData)
                                        });
   
    res.status(200).json({
        success: true,
        data: links,
        pagination
    });
                        
})

export const getLink = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }
    const { id } = req.params as {id : string};

    const link = await getLinkService(user.id, id);

    res.status(200).json({
        success: true,
        data: link
});

})

export const updateLink = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }
    const { name, isActive, targetUrl }= req.body;
    const { id } = req.params as {id : string};

    const updatedLink = await updateLinkService({userId : user.id, linkId : id ,name, isActive, targetUrl});
    
    res.status(200).json({
        success : true,
        data : updatedLink
    })
})


export const deleteLink = asyncHandler(async(req : Request<linkIdParams>, res : Response, next : NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new AppError("Unauthorized", 401));
    }
    const {id} = req.params as {id : string};

    await deleteLinkService({userId : user.id, linkId : id});

    res.status(200).json({
        success : true,
        "message": "Link deleted successfully."
    })
})