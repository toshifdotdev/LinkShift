import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "@/api/auth";
import { ApiError } from "@/api/client";
import { devSlow } from "@/lib/dev-delay";
import { useSeo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "./auth-layout";

function ForgotPasswordPage() {
  useSeo({ title: "Forgot password — LinkShift", robots: "noindex,nofollow" });
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    await devSlow();
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout
        kicker="Check your inbox"
        title="Reset link sent"
        description={`If an account exists for ${email.trim()}, a reset link is on its way. It expires, so use it promptly.`}
        footer={
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to log in
          </Link>
        }
      >
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => setSent(false)}
        >
          Use a different email
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="Account recovery"
      title="Forgot your password?"
      description="Enter your email and we'll send a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          loading={submitting}
          loadingLabel="Sending reset link…"
        >
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}

export { ForgotPasswordPage };
