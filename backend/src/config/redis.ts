import { createClient } from 'redis';

export const redisClient = createClient();

redisClient.on('error',(err) => {
    console.error('Redis Client Error', err)
})

redisClient.on("ready", () => {
    console.log("Redis Ready");
});

export const connectRedis = async() => {
    try {
        await redisClient.connect();
    }
    catch(err) {
        console.error("Failed to connect to Redis.",err)
    }
}