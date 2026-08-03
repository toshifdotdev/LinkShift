import passport from "passport";

import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { config } from "../../config";
import { googleLogin } from "./auth.service";


passport.use(
    new GoogleStrategy({
        clientID : config.googleClientId!,
        clientSecret : config.googleClientSecret!,
        callbackURL : config.googleCallbackUrl!,
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
export default passport;