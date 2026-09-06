import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useSeo, ROUTE_SEO } from "@/lib/seo";
import { Container } from "@/components/ui/container";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/api/client";
import { sendContactMessage, type ContactTopic } from "@/api/support";
import { LegalSections } from "@/pages/legal/legal-page";
import { findLegalDoc } from "@/pages/legal/legal-data";

const TOPICS: Array<{ value: ContactTopic; label: string }> = [
  { value: "support", label: "Product support" },
  { value: "billing", label: "Billing & refunds" },
  { value: "privacy", label: "Privacy request" },
  { value: "abuse", label: "Report abuse" },
  { value: "other", label: "Something else" },
];

interface FormState {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

type Status = "idle" | "submitting" | "success" | "error";

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.message.trim().length < 10)
    errors.message = "Message must be at least 10 characters.";
  else if (form.message.trim().length > 5000)
    errors.message = "Message cannot exceed 5000 characters.";
  return errors;
}

function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    topic: "support",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setStatus("submitting");
    setSubmitError(null);
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        message: form.message.trim(),
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setSubmitError(
        err instanceof ApiError && err.status === 429
          ? "Too many messages from this device. Please try again later."
          : err instanceof Error
            ? err.message
            : "Something went wrong sending your message.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="ls-marquee">Received</p>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-secondary">
          Your message is on its way to the team. Keep an eye on{" "}
          <span className="font-medium text-foreground">{form.email.trim()}</span>. Replies
          go to the address you provided.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => {
            setForm((prev) => ({ ...prev, message: "" }));
            setStatus("idle");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="rounded-lg border border-border bg-surface p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="contact-name">Name</FieldLabel>
          <Input
            id="contact-name"
            value={form.name}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={!!errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-email">Email</FieldLabel>
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
      </div>

      <Field className="mt-5">
        <FieldLabel>Topic</FieldLabel>
        <Select value={form.topic} onValueChange={(v) => set("topic", v as ContactTopic)}>
          <SelectTrigger aria-label="Topic" placeholder="Choose a topic" />
          <SelectContent>
            {TOPICS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="mt-5">
        <FieldLabel htmlFor="contact-message">Message</FieldLabel>
        <Textarea
          id="contact-message"
          rows={6}
          value={form.message}
          placeholder="What can we help with? For billing issues include the payment ID from your receipt."
          aria-invalid={!!errors.message}
          onChange={(e) => set("message", e.target.value)}
        />
        <FieldError>{errors.message}</FieldError>
      </Field>

      {status === "error" && submitError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-dashed border-destructive/50 bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive"
        >
          {submitError}
        </p>
      )}

      <Button type="submit" size="md" className="mt-6" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <>
            <Spinner className="size-3.5" />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-3.5" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}

function ContactPage() {
  useSeo(ROUTE_SEO["/contact"]);
  const doc = findLegalDoc("contact");

  return (
    <PublicShell>
      <Container>
        <div className="mx-auto max-w-2xl">
          <p className="ls-marquee">Contact</p>
          <h1 className="font-display mt-6 text-balance text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-medium tracking-[-0.015em]">
            {doc?.title ?? "Contact"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
            {doc?.intro ?? "How to reach the humans behind LinkShift."}
          </p>

          <div className="mt-10">
            <ContactForm />
          </div>

          {doc && <LegalSections doc={doc} />}
        </div>
      </Container>
    </PublicShell>
  );
}

export { ContactPage };
