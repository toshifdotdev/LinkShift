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
    const payload = {
        
        
        from : config.emailFrom!,
        to : data.to,
        subject : data.subject,
        html : data.html
    };

    
    
    
    const { data: result, error } = await resend.emails.send(payload);

    if (error) {
        throw new Error(`Resend send failed [${error.name}]: ${error.message}`);
    }

    return result;
}


export const sendEmailSafely = async(data : SendEmailData) : Promise<EmailDeliveryResult> => {
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