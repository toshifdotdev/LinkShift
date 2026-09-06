import { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { config } from "../../config";
import { AppError } from "../../errors/AppError";
import { sendEmailSafely } from "../../utils/email";
import { contactSchema, feedbackSchema } from "./support.validation";

const escapeHtml = (s: string): string =>
    s.replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#39;");

const messageHtml = (s: string): string =>
    escapeHtml(s).replace(/\n/g, "<br/>");

function supportInbox(): string | null {
    return config.supportEmail ?? config.emailFrom ?? null;
}

export const contactController = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, topic, message } = req.validated!.body as z.infer<typeof contactSchema>;

    const to = supportInbox();
    if (!to) {
        return next(new AppError("Contact service is not configured. Please email us directly.", 503));
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New contact message — ${escapeHtml(topic)}</h2>
            <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
            <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
            <hr/>
            <p>${messageHtml(message)}</p>
            <hr/>
            <p style="color: #666; font-size: 12px;">Submitted via the LinkShift contact page. Reply directly to ${escapeHtml(email)}.</p>
        </div>
    `;

    const { delivered } = await sendEmailSafely({
        to,
        subject: `LinkShift contact — ${topic} — ${name}`,
        html,
    });

    if (!delivered) {
        return next(new AppError("We couldn't send your message right now. Please try again in a moment.", 503));
    }

    res.json({ success: true });
};

export const feedbackController = async (req: Request, res: Response, next: NextFunction) => {
    const { category, message } = req.validated!.body as z.infer<typeof feedbackSchema>;

    const to = supportInbox();
    if (!to) {
        return next(new AppError("Feedback service is not configured.", 503));
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Product feedback — ${escapeHtml(category)}</h2>
            <p><strong>User:</strong> ${escapeHtml(req.auth!.email)} (id ${escapeHtml(req.auth!.id)})</p>
            <hr/>
            <p>${messageHtml(message)}</p>
            <hr/>
            <p style="color: #666; font-size: 12px;">Submitted from the LinkShift dashboard.</p>
        </div>
    `;

    const { delivered } = await sendEmailSafely({
        to,
        subject: `LinkShift feedback — ${category}`,
        html,
    });

    if (!delivered) {
        return next(new AppError("We couldn't send your feedback right now. Please try again in a moment.", 503));
    }

    res.json({ success: true });
};
