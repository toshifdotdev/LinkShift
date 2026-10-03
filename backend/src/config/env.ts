import * as dotenv from 'dotenv';
dotenv.config();

const DEV_FALLBACK_ORIGINS = ['http://localhost:5173'];

const parseOrigins = (value: string | undefined): string[] =>
    (value ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

/**
 * Resolve the CORS allow-list.
 *
 * Precedence: CORS_ORIGINS, then FRONTEND_URL, then the local dev origin.
 * A variable that is present but empty (e.g. `CORS_ORIGINS=`) counts as
 * unset, so it falls through to the next source instead of resolving to an
 * empty list that would silently reject every origin.
 *
 * This never throws. Resolving a value and deciding whether a deployment is
 * safe to serve traffic are different questions, and conflating them means
 * merely importing `config` fails on a setting that has nothing to do with the
 * caller. It used to throw here, which meant any test that set
 * NODE_ENV=production to exercise some unrelated guard died on this one
 * first. The production check now lives in `assertCorsOriginsConfigured`,
 * which the server runs before it starts listening.
 */
export const resolveCorsOrigins = (
    env: NodeJS.ProcessEnv = process.env,
): string[] => {
    const explicit = parseOrigins(env.CORS_ORIGINS);
    if (explicit.length > 0) {
        return explicit;
    }

    const frontend = parseOrigins(env.FRONTEND_URL);
    if (frontend.length > 0) {
        return frontend;
    }

    // In production this stays empty rather than falling back to a dev origin,
    // so the misconfiguration is visible to `assertCorsOriginsConfigured`
    // instead of being silently papered over with localhost.
    return env.NODE_ENV === 'production' ? [] : [...DEV_FALLBACK_ORIGINS];
};

/**
 * Fails the boot when a production deployment cannot serve the browser safely.
 *
 * An empty allow-list combined with `credentials: true` makes the API
 * unreachable from the frontend with no error anywhere, and a wildcard with
 * credentials enabled is unsafe. Both must stop the process before it accepts
 * traffic rather than after, which is why this runs in `server.ts` ahead of
 * `app.listen` and not inside `resolveCorsOrigins`.
 */
export const assertCorsOriginsConfigured = (
    env: NodeJS.ProcessEnv = process.env,
): void => {
    if (env.NODE_ENV !== 'production') return;

    const origins = resolveCorsOrigins(env);

    if (origins.length === 0) {
        throw new Error(
            'CORS misconfiguration: CORS_ORIGINS and FRONTEND_URL are both unset ' +
                'while NODE_ENV=production. Set CORS_ORIGINS to a comma-separated ' +
                'allow-list, e.g. CORS_ORIGINS=https://linkshift.in',
        );
    }

    if (origins.includes('*')) {
        throw new Error(
            'CORS misconfiguration: wildcard "*" is not permitted in production. ' +
                'List every allowed origin explicitly, e.g. CORS_ORIGINS=https://linkshift.in',
        );
    }
};

export const config = {
    port        : process.env.PORT,
    APP_URL     : process.env.APP_URL,
    jwtSecret   : process.env.JWT_SECRET,
    databaseUrl : process.env.DATABASE_URL,
    googleClientId : process.env.GOOGLE_CLIENT_ID,
    googleClientSecret : process.env.GOOGLE_CLIENT_SECRET,
    
    googleCallbackUrl : process.env.GOOGLE_CALLBACK_URL,
    resendApiKey : process.env.RESEND_API_KEY,
    
    
    supportEmail : process.env.SUPPORT_EMAIL,
    
    
    emailFrom : process.env.EMAIL_FROM,
    
    
    frontendUrl : process.env.FRONTEND_URL,
    
    
    
    corsOrigins : resolveCorsOrigins(),
    node_env : process.env.NODE_ENV,
    cloudinaryCloudName : process.env.CLOUDINARY_CLOUD_NAME ,
    cloudinaryApiKey : process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret : process.env.CLOUDINARY_API_SECRET,
    razorpayKeyId : process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret : process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret : process.env.RAZORPAY_WEBHOOK_SECRET,
    
    
    reconSecret : process.env.RECON_SECRET
}

/**
 * Fails the boot when production is missing credentials the server cannot
 * serve without. CORS was already guarded; these are the values whose absence
 * used to surface as a confusing runtime failure on the first request that
 * needed them (a JWT signed with `undefined`, a Prisma pool pointed nowhere)
 * instead of a clear boot error naming the missing variable.
 */
export const assertCriticalEnvConfigured = (
    env: NodeJS.ProcessEnv = process.env,
): void => {
    if (env.NODE_ENV !== 'production') return;

    const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
    const missing = required.filter((key) => !env[key]?.trim());

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables in production: ${missing.join(', ')}. ` +
                'Set them in the deployment environment before starting the server.',
        );
    }
};
