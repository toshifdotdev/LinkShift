import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/api/auth";
import { ApiError } from "@/api/client";
import { devSlow } from "@/lib/dev-delay";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "./auth-layout";
import { cn } from "@/lib/utils";

const RULES = [
  { key: "len", label: "8–64 chars", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: "lower", label: "a–z", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "A–Z", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "0–9", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "!@#…", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const ruleState = RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const allValid = ruleState.every((r) => r.ok);
  const match = password === confirm;

  const missingToken = !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !allValid || !match) return;
    setSubmitting(true);
    setError(null);
    await devSlow();
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reset your password. The link may have expired.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (missingToken) {
    return (
      <AuthLayout
        kicker="Account recovery"
        title="Reset link required"
        description="Open the reset link from your email. It contains the security token this page needs."
        footer={
          <Link
            to="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Request a new link
          </Link>
        }
      />
    );
  }

  if (done) {
    return (
      <AuthLayout
        kicker="All set"
        title="Password reset"
        description="Your password has been updated. Log in with your new credentials."
        footer={
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to log in
          </Link>
        }
      >
        <Button size="lg" className="w-full" onClick={() => navigate("/login")}>
          Continue to log in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="Account recovery"
      title="Choose a new password"
      description="Pick something strong. The same rules apply as at signup."
      footer={
        <Link
          to="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Password requirements">
            {ruleState.map((r) => (
              <li
                key={r.key}
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wide uppercase transition-colors duration-200",
                  r.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-border bg-elevated text-fg-muted",
                )}
              >
                {r.label}
              </li>
            ))}
          </ul>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <FieldError>
            {confirm && !match ? "Passwords do not match." : null}
          </FieldError>
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          loading={submitting}
          loadingLabel="Resetting password…"
          disabled={!allValid || !match}
        >
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}

export { ResetPasswordPage };
