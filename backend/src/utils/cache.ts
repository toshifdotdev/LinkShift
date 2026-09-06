import { redisClient } from "../config/redis"

// All Redis access is failure-tolerant: a missing/degraded Redis must degrade
// features (caching) rather than break them (redirects, dashboards, tests).

let warned = false;
function warnOnce(action: string, err: unknown) {
    if (!warned) {
        console.warn(`[cache] redis ${action} failed — continuing without cache:`, err instanceof Error ? err.message : err);
        warned = true;
    }
}

export const getCache = async(key : string) => {
    try {
        return await redisClient.get(key);
    } catch (err) {
        warnOnce('GET', err);
        return null;
    }
}

export const setCache = async(key : string, data : unknown, ttl : number) => {
    try {
        await redisClient.set(key, JSON.stringify(data), {EX : ttl});
    } catch (err) {
        warnOnce('SET', err);
    }
}

export const deleteCache = async(key : string) => {
    try {
        await redisClient.del(key);
    } catch (err) {
        warnOnce('DEL', err);
    }
}


export const linkCacheKey = (host : string, shortId : string) =>
    `link:${host}:${shortId}`;
