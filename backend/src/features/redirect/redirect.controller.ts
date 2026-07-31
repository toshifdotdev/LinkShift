import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { redirect as redirectService, unlockService } from "./redirect.service";
import { unlockData } from "./redirect.validation";

type RedirectParams = {
    shortId : string;
};


export const redirect = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const params = validated.params as RedirectParams;
    const { shortId } = params;

    const result = await redirectService(shortId, req);

    if (typeof result === "string") {
         res.redirect(result);
         return;
    }

     res.status(401).json(result);
     return;
})

export const unlockController = asyncHandler(async(req : Request, res : Response) => {
    const validated = req.validated!;
    const body = validated.body as unlockData;
    const params = req.params as RedirectParams;
    const { shortId } = params;

    const { password } = body;

    const targetUrl = await unlockService(shortId, password);

    return res.redirect(targetUrl!);
})