import path from "path";
import { Reader } from "@maxmind/geoip2-node";

const dbPath = path.join(
    process.cwd(),
    "GeoLite2-City.mmdb"
);

const readerPromise = Reader.open(dbPath);

export const getLocation = async (ip: string) => {
    try {
        const reader = await readerPromise;
        const city = reader.city(ip);
    

        console.log("city" , city)

        return {
            country: city.country?.names?.en,
            city: city.city?.names?.en
        };

    } catch {
        return {
            country: undefined,
            city: undefined
        };

    }
}