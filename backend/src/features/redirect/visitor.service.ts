import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const extractVisitorInfo = (req : Request) => {
    const uaString = req.headers['user-agent'];
    const parser = new UAParser(uaString);
    const clientInfo = parser.getResult();

    const ipAddress = req.ip?.trim() || undefined;

    
    const rawReferrer = (req.headers.referer ?? req.headers.referrer) as string | undefined;

    return {
        device: clientInfo.device.type || undefined,      
        browser: clientInfo.browser.name || undefined,    
        os: clientInfo.os.name || undefined,           
        ipAddress: ipAddress || undefined,
        referrer: rawReferrer?.trim().slice(0, 2048) || undefined,
    } 
}