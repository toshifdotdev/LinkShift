import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const extractVisitorInfo = (req : Request) => {
    const uaString = req.headers['user-agent'];
    const parser = new UAParser(uaString);
    const clientInfo = parser.getResult();

    // using x-forwared-for  to bypass the reverse-proxy(e.g. nginx ip) and get original one 
    const rawIp =  (req.headers['x-forwarded-for'] as string) || req.ip;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : undefined;

    return {
        device: clientInfo.device.type || undefined,      
        browser: clientInfo.browser.name || undefined,    
        os: clientInfo.os.name || undefined,           
        ipAddress: ipAddress || undefined,
    } 
}