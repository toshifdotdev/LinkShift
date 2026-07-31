import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { redirect as redirectService, unlockService } from "./redirect.service";

type RedirectParams = {
    shortId?: string;
};


export const redirect = asyncHandler(async(req : Request<RedirectParams>, res : Response) => {
    const { shortId } = req.params as {shortId : string};

    const result = await redirectService(shortId, req);

    if (typeof result === "string") {
         res.redirect(result);
         return;
    }

     res.status(401).json(result);
     return;
})

export const unlockController = asyncHandler(async(req : Request<RedirectParams>, res : Response) => {
    const { shortId } = req.params as {shortId : string};
    const { password } = req.body;

    const targetUrl = await unlockService(shortId, password);

    return res.redirect(targetUrl!);
})