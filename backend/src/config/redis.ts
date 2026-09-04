import { createClient } from 'redis';
import { config } from './env';
import { log } from '../utils/logger';

/**
 * Redis is a required infrastructure dependency, but it must degrade
 * gracefully while unavailable during local development.
 *
 * - reconnectStrategy: exponential backoff with jitter, capped at 5s per
 *   attempt. Retries forever (never "gives up"), so Redis recovers
 *   automatically when it becomes available — no restart required.
 * - disableOfflineQueue: commands are never queued while the client is
 *   offline — they reject immediately (fail fast). cache.ts catches that
 *   and degrades to a cache-miss, so redirects and dashboards never hang
 *   just because Redis is down.
 */

const reconnectStrategy = (retries: number) => {
    // (2^retries)*50ms capped at 5s + up to 200ms jitter — mirrors the
    // node-redis default shape but with a gentler cap.
    const delay = Math.min(Math.pow(2, retries) * 50, 5000);
    return delay + Math.floor(Math.random() * 200);
};

export const redisClient = createClient({
    // REDIS_URL (e.g. a managed Redis) when provided; omitted → the client's
    // own default (redis://localhost:6379) so local development is unchanged.
    ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}),
    socket: { reconnectStrategy },
    disableOfflineQueue: true,
});

let loggedDown = false;

redisClient.on('error', (err) => {
    // Log the transition to "down" once. The socket emits an 'error' on
    // EVERY reconnect retry; logging each one floods the terminal when
    // Redis is unavailable locally. A single transition line keeps the
    // state visible without the noise; the next 'ready' logs recovery.
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
        // With the reconnect strategy above, connect() keeps retrying and
        // normally never rejects — this catch only fires if retrying stops.
        if (config.node_env === 'production') {
            log.error('redis_connect_failed', { error: (err as Error)?.message ?? String(err) });
        }
    }
}