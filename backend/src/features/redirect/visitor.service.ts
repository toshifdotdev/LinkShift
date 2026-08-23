import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const extractVisitorInfo = (req : Request) => {
    const uaString = req.headers['user-agent'];
    const parser = new UAParser(uaString);
    const clientInfo = parser.getResult();

    const ipAddress = req.ip?.trim() || undefined;

    return {
        device: clientInfo.device.type || undefined,      
        browser: clientInfo.browser.name || undefined,    
        os: clientInfo.os.name || undefined,           
        ipAddress: ipAddress || undefined,
    } 
}