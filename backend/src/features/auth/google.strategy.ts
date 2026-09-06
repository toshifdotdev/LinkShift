import passport from "passport";

import { Strategy as GoogleStrategy, Profile, VerifyCallback } from "passport-google-oauth20";
import { config } from "../../config";
import { googleLogin } from "./auth.service";
import { oauthStateStore } from "./oauthState";
import { log } from "../../utils/logger";

// The Google strategy is registered only when its configuration exists.
// Constructing it eagerly with missing credentials used to crash every
// import of the app (hermetic unit tests/CI never carry Google secrets).
//
// Semantics:
// - credentials present  → strategy registered; behavior identical to before
// - credentials missing,
//   production           → fail fast at startup: a production deployment must
//                          not boot with a silently disabled sign-in method
// - credentials missing,
//   dev/test/CI          → warn and skip registration; hitting /auth/google
//                          then fails per-request with a clean redirect to
//                          /login?error=google (handled by errorMiddleware)
const googleConfigured = Boolean(
    config.googleClientId && config.googleClientSecret && config.googleCallbackUrl
);

if (googleConfigured) {
    passport.use(
        new GoogleStrategy({
            clientID : config.googleClientId!,
            clientSecret : config.googleClientSecret!,
            callbackURL : config.googleCallbackUrl!,
            // Stateless CSRF state: passport's default stores need login sessions,
            // which this flow runs without.
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
