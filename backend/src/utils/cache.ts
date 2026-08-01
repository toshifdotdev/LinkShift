import { redisClient } from "../config/redis"

export const getCache = async(key : string) => {
    return await redisClient.get(key);
}

export const setCache = async(key : string, data : unknown, ttl : number) => {
    await redisClient.set(key, JSON.stringify(data), {EX : ttl});

}

export const deleteCache = async(key : string) => {
    await redisClient.del(key);
}