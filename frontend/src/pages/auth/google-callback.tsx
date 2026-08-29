import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "@/api/token";
import { Logo } from "@/components/brand/logo";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Landing point for the Google OAuth handoff.
 *
 * Contract: the backend's Google callback redirects the browser here with
 * `?accessToken=…`. The access token is stored, the session is primed, and
 * the user lands in /app. If the token is missing, the page renders a brief
 * "signing in…" affordance and waits (the redirect cannot realistically
 * arrive without a token — the controller always sets one).
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
            Signing you in…
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
            One moment while your workspace loads.
          </p>
        </div>
      </div>
    </main>
  );
}

export { GoogleCallbackPage };
