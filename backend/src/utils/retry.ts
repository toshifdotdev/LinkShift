
import { log } from "./logger";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500; 
const MAX_DELAY_MS = 4_000;

export type RetryableError = Error & { code?: string; http_code?: number };

function delay(attempt: number): Promise<void> {
    const exp = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
    return new Promise((r) => setTimeout(r, exp));
}

function shouldRetry(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    
    
    const anyErr = err as RetryableError;
    if (anyErr.http_code !== undefined) {
        if (anyErr.http_code >= 400 && anyErr.http_code < 500) return false;
    }
    return true;
}

export async function withRetry<T>(label: string, op: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            return await op();
        } catch (err) {
            lastErr = err;
            const retriable = shouldRetry(err);
            if (!retriable || attempt === MAX_ATTEMPTS) break;
            const ms = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
            log.warn("upload_retry", {
                label,
                attempt,
                delayMs: ms,
                error: (err as Error).message ?? String(err),
            });
            await delay(attempt);
        }
    }
    throw lastErr;
}
