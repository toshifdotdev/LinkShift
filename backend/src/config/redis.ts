import { createClient } from 'redis';
import { config } from './env';
import { log } from '../utils/logger';



const reconnectStrategy = (retries: number) => {
    
    
    const delay = Math.min(Math.pow(2, retries) * 50, 5000);
    return delay + Math.floor(Math.random() * 200);
};

export const redisClient = createClient({
    
    
    ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}),
    socket: { reconnectStrategy },
    disableOfflineQueue: true,
});

let loggedDown = false;

redisClient.on('error', (err) => {
    
    
    
    
    if (!loggedDown) {
        loggedDown = true;
        const isProd = config.node_env === 'production';
        log[isProd ? 'error' : 'warn']('redis_unavailable', {
            mode: isProd ? 'with_backoff' : 'background',
            error: (err as Error)?.message ?? String(err),
        });
    }
});

redisClient.on('ready', () => {
    loggedDown = false;
    log.info('redis_connected', {});
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        
        
        if (config.node_env === 'production') {
            log.error('redis_connect_failed', { error: (err as Error)?.message ?? String(err) });
        }
    }
}