import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { login, GOOGLE_AUTH_URL } from "@/api/auth";
import { setAccessToken } from "@/api/token";
import { ApiError } from "@/api/client";
import { devSlow } from "@/lib/dev-delay";
import { useSeo, ROUTE_SEO } from "@/lib/seo";
import { useSession } from "@/auth/session";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/banner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthLayout } from "./auth-layout";

function LoginPage() {
  useSeo(ROUTE_SEO["/login"]);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(location.search);
  const justVerified = params.get("verified") === "true";
  const googleFailed = params.get("error") === "google";
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [startingGoogle, setStartingGoogle] = useState(false);

  /* Clear one-shot query flags once their banners have been seen. */
  useEffect(() => {
    if (!justVerified && !googleFailed) return;
    const url = googleFailed ? "/login?error=google" : "/login";
    window.history.replaceState({}, "", url);
  }, [justVerified, googleFailed]);

  function startGoogle() {
    if (startingGoogle || submitting) return;
    setStartingGoogle(true);
    window.location.assign(GOOGLE_AUTH_URL);
  }

  /* Already signed in → straight to the app. */
  if (isAuthenticated) return <Navigate to="/app" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    await devSlow();
    try {
      const res = await login({ email: email.trim(), password });
      setAccessToken(res.accessToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      kicker="Welcome back"
      title="Log in to LinkShift"
      description="Pick up where your links left off."
      footer={
        <>
          New to LinkShift?{" "}
          <Link
            to="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {googleFailed && !justVerified && (
        <Banner tone="destructive" className="mb-5">
          Google sign-in failed. Try again or continue with email.
        </Banner>
      )}

      {justVerified && (
        <Banner tone="success" className="mb-5">
          Email verified. Your account is live. Log in to continue.
        </Banner>
      )}

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
        <Field>
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              to="/forgot-password"
              className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg-secondary hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && <FieldError>{error}</FieldError>}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          loading={submitting}
          loadingLabel="Logging in…"
        >
          Log in
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

      <p className="mt-5 text-center text-xs leading-relaxed text-fg-muted">
        By continuing you agree to our{" "}
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
        .
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

export { LoginPage };
