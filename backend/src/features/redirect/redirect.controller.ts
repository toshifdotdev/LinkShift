import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { redirect as redirectService } from "./redirect.service";

type RedirectParams = {
    shortId?: string;
};


export const redirect = asyncHandler(async(req : Request<RedirectParams>, res : Response) => {
    const { shortId } = req.params as {shortId : string};

    const targetUrl = await redirectService(shortId);

    return res.redirect(targetUrl);
})