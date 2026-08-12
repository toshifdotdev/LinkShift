import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
    port        : process.env.PORT,
    APP_URL     : process.env.APP_URL,
    jwtSecret   : process.env.JWT_SECRET,
    databaseUrl : process.env.DATABASE_URL,
    googleClientId : process.env.GOOGLE_CLIENT_ID,
    googleClientSecret : process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl : process.env.FRONTEND_URL,
    resendApiKey : process.env.RESEND_API_KEY,
    frontendUrl : process.env.FRONTEND_URL,
    node_env : process.env.NODE_ENV,
    cloudinaryCloudName : process.env.CLOUDINARY_CLOUD_NAME ,
    cloudinaryApiKey : process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret : process.env.CLOUDINARY_API_SECRET,
    razorpayKeyId : process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret : process.env.RAZORPAY_KEY_SECRET
}
