import { apiFetch } from "./client";

export type ContactTopic = "support" | "billing" | "privacy" | "abuse" | "other";
export type FeedbackCategory = "general" | "bug" | "idea";

export function sendContactMessage(body: {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}) {
  return apiFetch<{ success: true }>("/support/contact", { method: "POST", body });
}

export function sendFeedback(body: { category: FeedbackCategory; message: string }) {
  return apiFetch<{ success: true }>("/support/feedback", { method: "POST", body });
}
