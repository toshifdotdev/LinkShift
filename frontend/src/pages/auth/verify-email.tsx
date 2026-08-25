import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resendVerification } from "@/api/auth";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToaster } from "@/components/ui/toaster";
import { AuthLayout } from "./auth-layout";

/**
 * Verification outcomes land here. The backend redirects to
 * `/verify-email?error=expired` when a token fails; successful
 * verifications redirect to `/login?verified=true` instead.
 * Direct visits (no params) get the resend form.
 */
function VerifyEmailPage() {
  const [params] = useSearchParams();
  const expired = params.get("error") === "expired";
  const { toast } = useToaster();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await resendVerification(email.trim());
      toast({
        title: "Verification email sent",
        description: "If an account exists for that address, a new link is on its way.",
        variant: "success",
      });
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the email.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = expired ? "This link has expired" : "Verify your email";
  const description = expired
    ? "Verification links expire for your security. Enter your email and we'll send a fresh one."
    : "Open the verification link from your inbox to activate your account — or request a new email below.";

  return (
    <AuthLayout
      kicker={expired ? "Link expired" : "Almost there"}
      title={title}
      description={description}
      footer={
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleResend} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? "Sending" : "Resend verification email"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export { VerifyEmailPage };
