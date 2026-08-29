import { createClient } from 'redis';
import { config } from './env';

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

const backoff = Math.max;
const reconnectStrategy = (retries: number) => {
    // (2^retries)*50ms capped at 5s + up to 200ms jitter — mirrors the
    // node-redis default shape but with a gentler cap.
    const delay = Math.min(Math.pow(2, retries) * 50, 5000);
    return delay + Math.floor(Math.random() * 200);
};

export const redisClient = createClient({
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
        if (config.node_env === 'production') {
            // Production failures must stay observable and actionable.
            console.error('[redis] unavailable — running without cache; auto-reconnecting with backoff.', err);
        } else {
            console.warn('[redis] unavailable — running without cache; auto-reconnecting in the background.');
        }
    }
});

redisClient.on('ready', () => {
    loggedDown = false;
    console.log('[redis] connected');
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        // With the reconnect strategy above, connect() keeps retrying and
        // normally never rejects — this catch only fires if retrying stops.
        if (config.node_env === 'production') {
            console.error('[redis] connect failed.', err);
        }
    }
}