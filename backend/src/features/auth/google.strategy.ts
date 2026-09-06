import passport from "passport";

import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { config } from "../../config";
import { googleLogin } from "./auth.service";
import { oauthStateStore } from "./oauthState";
import { log } from "../../utils/logger";






const googleConfigured = Boolean(
    config.googleClientId && config.googleClientSecret && config.googleCallbackUrl
);

if (googleConfigured) {
    passport.use(
        new GoogleStrategy({
            clientID : config.googleClientId!,
            clientSecret : config.googleClientSecret!,
            callbackURL : config.googleCallbackUrl!,
       
            store : oauthStateStore,
        },
            async (accessToken : string, refreshToken : string, profile : Profile, done : VerifyCallback) => {
                try {
                    const authResponse = await googleLogin(profile);
                    done(null, authResponse);
                }
                catch(err) {
                    done(err as Error, false);
                }
            }
        )
    )
} else if (config.node_env === "production") {
    throw new Error(
        "Google OAuth is not configured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL are required in production."
    );
} else {
    log.warn("google_oauth_disabled", {
        reason: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL not set",
    });
}

export default passport;
