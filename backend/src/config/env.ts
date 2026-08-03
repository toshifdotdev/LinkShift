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
}

