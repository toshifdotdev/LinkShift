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
 * In production the resolved list must be non-empty and must not be a
 * wildcard: a wildcard (or an empty list) combined with
 * `credentials: true` is unsafe, and an empty list disables the API without
 * any visible error. Both cases fail at boot instead.
 */
export const resolveCorsOrigins = (
    env: NodeJS.ProcessEnv = process.env,
): string[] => {
    const explicit = parseOrigins(env.CORS_ORIGINS);
    const origins =
        explicit.length > 0
            ? explicit
            : parseOrigins(env.FRONTEND_URL);

    if (env.NODE_ENV !== 'production') {
        return origins.length > 0 ? origins : [...DEV_FALLBACK_ORIGINS];
    }

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

    return origins;
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
