import { Request } from "express";
import { extractVisitorInfo } from "../redirect/visitor.service";
import { getLocation } from "../../utils/geoIp";

export const getCurrencyFromRequest = async(req : Request) => {
    const { ipAddress } = extractVisitorInfo(req);

    if(!ipAddress) {
        return "USD";
    }

    const location = await getLocation(ipAddress);

    if(location.country === "India") {
        return "INR";
    }
    return "USD";
};