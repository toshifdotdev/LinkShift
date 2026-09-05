import path from "path";
import { Reader } from "@maxmind/geoip2-node";

const dbPath = path.join(
    process.cwd(),
    "GeoLite2-City.mmdb"
);

// GeoIP is enrichment only: a missing/corrupt MMDB must degrade to
// "unknown location" — without this catch, the rejected open() becomes an
// unhandled rejection and can take the whole process down at startup.
const readerPromise = Reader.open(dbPath).catch((err) => {
    console.warn(
        "[geoip] database unavailable — location enrichment disabled:",
        err instanceof Error ? err.message : err
    );
    return null;
});

export const getLocation = async (ip: string) => {
    try {
        const reader = await readerPromise;
        if (!reader) {
            return {
                country: undefined,
                city: undefined
            };
        }
        const city = reader.city(ip);

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