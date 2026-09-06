// Single source of truth for customer-facing email link construction.
// Verification links point at the BACKEND API (which verifies the token and
// then redirects the browser to the frontend); reset links point at the
// FRONTEND page, which submits the new password via the API.

export const buildEmailVerificationUrl = (backendOrigin: string, token: string): string =>
    `${backendOrigin}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;

export const buildPasswordResetUrl = (frontendOrigin: string, token: string): string =>
    `${frontendOrigin}/reset-password?token=${encodeURIComponent(token)}`;
