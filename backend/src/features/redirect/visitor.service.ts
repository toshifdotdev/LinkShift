import axios from "axios";
import { Request } from "express";
import { UAParser } from "ua-parser-js";


export const extractVisitorInfo = async(req : Request) => {
    const uaString = req.headers['user-agent'];
    const parser = new UAParser(uaString);
    const clientInfo = parser.getResult();

    // using x-forwared-for  to bypass the reverse-proxy(e.g. nginx ip) amd get original one 
    const rawIp =  (req.headers['x-forwarded-for'] as string) || req.ip;
    const ipAddress = rawIp ? rawIp.split(',')[0].trim() : undefined;



    // TODO:
    // Will enable Geo-IP lookup later.
    // Currently disabled cuz external API calls increases
    // redirect latency. Will replace this
    // (cached GeoLite database or background job).

    // let country: string | undefined = undefined;
    // let city: string | undefined = undefined;

    // if (ipAddress && !ipAddress.includes('127.0.0.1') && !ipAddress.includes('::1')) {
    //     try {
    //         const response = await axios.get(`http://ip-api.com/${ipAddress}`);
            
    //         if (response.data && response.data.status === 'success') {
    //             country = response.data.country || undefined;
    //             city = response.data.city || undefined;
    //         }
    //     } catch {
           
    //         }
    // }

    return {
        device: clientInfo.device.type || undefined,      
        browser: clientInfo.browser.name || undefined,    
        os: clientInfo.os.name || undefined,           
        ipAddress: ipAddress || undefined,
    } 
}