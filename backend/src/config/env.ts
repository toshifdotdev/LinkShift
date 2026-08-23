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
    // Origin of the frontend SPA. Used for email links and post-verification
    // redirects — must NOT be confused with the OAuth callback URL above.
    frontendUrl : process.env.FRONTEND_URL,
    node_env : process.env.NODE_ENV,
    cloudinaryCloudName : process.env.CLOUDINARY_CLOUD_NAME ,
    cloudinaryApiKey : process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret : process.env.CLOUDINARY_API_SECRET,
    razorpayKeyId : process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret : process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecret : process.env.RAZORPAY_WEBHOOK_SECRET
}
