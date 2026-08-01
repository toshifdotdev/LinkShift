import { redisClient } from "../config/redis"

export const getCache = async(cachedKey : string) => {
    return await redisClient.get(cachedKey);
}

export const setCache = async(cacheKey : string, cacheData : string, TTL : number) => {
    await redisClient.set(cacheKey, cacheData, {EX : TTL});

}

export const deleteCache = async(cachedKey : string) => {
    await redisClient.del(cachedKey);
}