import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    port        : process.env.PORT,
    APP_URL     : process.env.APP_URL,
    jwtSecret   : process.env.JWT_SECRET,
    databaseUrl : process.env.DATABASE_URL,
    googleClientId : process.env.GOOGLE_CLIENT_ID,
    googleClientSecret : process.env.GOOGLE_CLIENT_SECRET,
    // Full backend URL that Google redirects to after OAuth.
    googleCallbackUrl : process.env.GOOGLE_CALLBACK_URL,
    resendApiKey : process.env.RESEND_API_KEY,
    // Inbox that receives contact-form and in-app feedback submissions.
    // Optional — falls back to EMAIL_FROM so a fresh deploy still works.
    supportEmail : process.env.SUPPORT_EMAIL,
    // Verified Resend sender identity. Production MUST use a domain you own —
    // onboarding@resend.dev only delivers to your own account email.
    emailFrom : process.env.EMAIL_FROM,
    // Origin of the frontend SPA. Used for email links and post-verification
    // redirects — must NOT be confused with the OAuth callback URL above.
    frontendUrl : process.env.FRONTEND_URL,
    // Allowed CORS origins for the API. Defaults to FRONTEND_URL so a single
    // env var covers both use cases; set CORS_ORIGINS (comma-separated) when
    // more than one origin needs access (e.g. staging + production).
    corsOrigins : (process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL ?? "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    node_env : process.env.NODE_ENV,
    cloudinaryCloudName : process.env.CLOUDINARY_CLOUD_NAME ,
    cloudinaryApiKey : process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret : process.env.CLOUDINARY_API_SECRET,
    razorpayKeyId : process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret : process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret : process.env.RAZORPAY_WEBHOOK_SECRET,
    // Shared secret for the internal reconciliation trigger endpoint
    // (x-recon-secret header). Unset → the endpoint rejects everything.
    reconSecret : process.env.RECON_SECRET
}
