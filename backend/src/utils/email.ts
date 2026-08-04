import { Resend } from "resend";
import { config } from "../config";

export const resend = new Resend(config.resendApiKey);

interface SendEmailData {
    to : string,
    subject : string,    
    html : string,
    
}


export const sendEmail = async(data : SendEmailData) => {
    await resend.emails.send({
        from : "onboarding@resend.dev",
        to : data.to,
        subject : data.subject,
        html : data.html
    })
}

export const sendPasswordResetEmail = async(email : string, token : string) => {
    const resetLink = `${config.frontendUrl}/reset-password?token=${token}`;

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

    await sendEmail({
        to : email,
        subject : "LinkShift - Reset Your Password",
        html : html
    })

}