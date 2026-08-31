import { Resend } from "resend";
import { config, prisma } from "../config";
import { generateRandomToken, hashToken } from "./token";
import { buildEmailVerificationUrl, buildPasswordResetUrl } from "./emailUrls";
import { log } from "./logger";

export const resend = new Resend(config.resendApiKey);

interface SendEmailData {
    to : string,
    subject : string,    
    html : string,
    
}

export type EmailDeliveryResult = { delivered: boolean };

export const sendEmail = async(data : SendEmailData) => {
    await resend.emails.send({
        // Must be a verified sender on this Resend account. Production requires
        // a domain you own (see EMAIL_FROM in .env.example / ENVIRONMENT.md).
        from : config.emailFrom!,
        to : data.to,
        subject : data.subject,
        html : data.html
    })
}

/**
 * Provider outages must not surface as 500s mid-auth-flow. Delivery failures
 * are logged here (never the recipient address) and reported to the caller
 * via the result so it can degrade appropriately: registration rolls the
 * account back, while reset/resend keep their enumeration-neutral response.
 */
const sendEmailSafely = async(data : SendEmailData) : Promise<EmailDeliveryResult> => {
    try {
        await sendEmail(data);
        return { delivered: true };
    } catch (err) {
        log.error("email_send_failed", {
            subject: data.subject,
            error: err instanceof Error ? err.message : String(err),
        });
        return { delivered: false };
    }
}

export const sendPasswordResetEmail = async(email : string, token : string) : Promise<EmailDeliveryResult> => {
    // Points at the FRONTEND origin — the reset page submits the new password
    // through the API. (FRONTEND_URL must be the SPA origin, not the OAuth path.)
    const resetLink = buildPasswordResetUrl(config.frontendUrl!, token);

    const html = `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Your LinkShift Password</h2>
            <p>You recently requested to reset your password for your LinkShift account.</p>
            <p>Click the button below to set a new password:</p>
            <div style="margin: 30px 0;text-align:center">
                <a href="${resetLink}" style="display: inline-block; background-color: #2081E2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            Reset Password
        </a>
            </div>
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            <p style="color: #666; font-size: 14px;">This link is valid for 15 minutes.</p>
        </div>
    `;

    return sendEmailSafely({
        to : email,
        subject : "LinkShift - Reset Your Password",
        html : html
    })
}


export const sendVerificationEmail = async (userId: string, email: string, name : string | null) : Promise<EmailDeliveryResult> => {
    // delete previous verification token -- to prevent error 
    await prisma.emailVerification.deleteMany({
        where : {
            userId
        }
    })

    const generatedToken = generateRandomToken();

    const hashedToken = hashToken(generatedToken);

    await prisma.emailVerification.create({
        data : {
            userId,
            tokenHash : hashedToken,
            expiresAt : new Date(Date.now() + 30 * 60 * 1000)
        }
    })

    // Points at the BACKEND verify-email route, which validates the token and
    // then redirects the browser to the frontend login page.
    const verificationUrl = buildEmailVerificationUrl(config.APP_URL!, generatedToken);
    const displayName = name ?? "there";

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify Your LinkShift Account</h2>
            <p>Hi ${displayName},</p>
            <p>Welcome to LinkShift! Please verify your email address to activate your account and get started.</p>
            <div style="margin: 30px 0; text-align: center;">
                <a href="${verificationUrl}" style="display: inline-block; background-color: #2081E2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    Verify Email Address
                </a>
            </div>
            <p>If you did not create an account with LinkShift, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 14px;">This link is valid for 15 minutes.</p>
        </div>
    `;

    return sendEmailSafely({
        to : email,
        subject : "LinkShift - Verify Your Email",
        html : html
    });
}