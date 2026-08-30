import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register, resendVerification } from "@/api/auth";
import { useSession } from "@/auth/session";
import { ApiError } from "@/api/client";
import { devSlow } from "@/lib/dev-delay";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToaster } from "@/components/ui/toaster";
import { AuthLayout } from "./auth-layout";
import { cn } from "@/lib/utils";

const RULES = [
  { key: "len", label: "8–64 characters", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: "lower", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToaster();
  const { isAuthenticated } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const ruleState = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allValid = ruleState.every((r) => r.ok);

  /* Already signed in → the app, not the signup form. */
  if (isAuthenticated) return <Navigate to="/app" replace />;

  async function handleResend() {
    if (!sentTo || resending) return;
    setResending(true);
    try {
      await resendVerification(sentTo);
      toast({ title: "Verification email sent", description: sentTo, variant: "success" });
    } catch (err) {
      toast({
        title: "Could not resend",
        description: err instanceof ApiError ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !allValid) return;
    setSubmitting(true);
    setError(null);
    await devSlow();
    try {
      const res = await register({ name: name.trim(), email: email.trim(), password });
      setSentTo(res.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- post-register: verification-required state (real contract:
          register creates the account and emails a link; no session) ---- */
  if (sentTo) {
    return (
      <AuthLayout
        kicker="Almost there"
        title="Check your inbox"
        description={`We sent a verification link to ${sentTo}. Click it to activate your account, then log in.`}
        footer={
          <>
            Already verified?{" "}
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            loading={resending}
            onClick={() => void handleResend()}
          >
            Resend verification email
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate("/login")}>
            Go to log in
          </Button>
          <p className="mt-1 text-center text-xs text-fg-muted">
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setEmail("");
              }}
              className="text-fg-secondary underline-offset-4 hover:text-foreground hover:underline"
            >
              Re-enter your details
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="Get started"
      title="Create your account"
      description="Your first link is thirty seconds away."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </Field>
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
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
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
          <FieldError>
            {password && !allValid ? "Password does not meet all requirements yet." : null}
          </FieldError>
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          loading={submitting}
          loadingLabel="Creating account…"
          disabled={!allValid}
        >
          Create account
        </Button>
      </form>

      <p className="mt-4 text-xs leading-relaxed text-fg-muted">
        We'll email you a verification link before your account activates.
      </p>
    </AuthLayout>
  );
}

export { RegisterPage };
