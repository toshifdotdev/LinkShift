import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "@/api/token";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Landing point for the Google OAuth handoff.
 *
 * The backend callback currently responds with JSON; the frontend handoff
 * (redirect with `?accessToken=`) is pending one backend line — see the
 * phase report. This page is ready for that contract: it stores the token,
 * primes the session query and enters /app. Without a token it shows a
 * graceful fallback instead of raw JSON confusion.
 */
function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const accessToken = params.get("accessToken");

  useEffect(() => {
    if (!accessToken) return;
    setAccessToken(accessToken);
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    navigate("/app", { replace: true });
  }, [accessToken, queryClient, navigate]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="px-5 pt-6 sm:px-8">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm text-center">
          <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase">
            Google sign-in
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {accessToken ? "Signing you in…" : "Handoff not configured"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
            {accessToken
              ? "One moment while your workspace loads."
              : "The backend returned the Google session as raw JSON instead of redirecting here with a token. This needs a one-line backend change — see the phase report."}
          </p>
          {!accessToken && (
            <Button variant="secondary" size="lg" className="mt-8 w-full" onClick={() => navigate("/login")}>
              Back to log in
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

export { GoogleCallbackPage };
