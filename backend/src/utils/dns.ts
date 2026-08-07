import dns from "node:dns/promises";
import { AppError } from "../errors/AppError";

export const verifyCname = async(host : string) => {
    try {
    const records: string[] = await dns.resolveCname(host);

    if (!records.includes("go.linkshift.in")) {
        throw new AppError("Domain is not pointing to LinkShift.", 400);
    }
    } catch(err) {
        if (err instanceof AppError) {
            throw err;
        }
        throw new AppError("Unable to resolve DNS records.", 400);
    }   
}