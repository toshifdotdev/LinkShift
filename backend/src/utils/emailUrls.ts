




export const buildEmailVerificationUrl = (backendOrigin: string, token: string): string =>
    `${backendOrigin}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;

export const buildPasswordResetUrl = (frontendOrigin: string, token: string): string =>
    `${frontendOrigin}/reset-password?token=${encodeURIComponent(token)}`;
