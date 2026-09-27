import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GOOGLE_AUTH_URL, register, resendVerification } from "@/api/auth";
import { useSession } from "@/auth/session";
import { ApiError } from "@/api/client";
import { devSlow } from "@/lib/dev-delay";
import { useSeo, ROUTE_SEO } from "@/lib/seo";
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
  useSeo(ROUTE_SEO["/register"]);
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
  const [startingGoogle, setStartingGoogle] = useState(false);

  const ruleState = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allValid = ruleState.every((r) => r.ok);

  
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

  function startGoogle() {
    if (startingGoogle || submitting) return;
    setStartingGoogle(true);
    window.location.assign(GOOGLE_AUTH_URL);
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
                    ? "border-success/30 bg-success-soft text-success"
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

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        loading={startingGoogle}
        loadingLabel="Connecting to Google"
        onClick={startGoogle}
      >
        {!startingGoogle && (
          <>
            <GoogleGlyph />
            Continue with Google
          </>
        )}
      </Button>

      <p className="mt-4 text-xs leading-relaxed text-fg-muted">
        By creating an account, you agree to our{" "}
        <Link
          to="/terms"
          className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-foreground"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          to="/privacy"
          className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-foreground"
        >
          Privacy Policy
        </Link>
        . We'll email you a verification link before your account activates.
      </p>
    </AuthLayout>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.32Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export { RegisterPage };
