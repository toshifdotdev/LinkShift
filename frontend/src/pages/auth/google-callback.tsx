import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setAccessToken } from "@/api/token";
import { useSeo } from "@/lib/seo";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Landing point for the Google OAuth handoff.
 *
 * Contract: the backend's Google callback redirects the browser here with the
 * access token in the URL FRAGMENT (`#accessToken=…`) — fragments are never
 * sent to any server, keeping the token out of history submissions and access
 * logs. The access token is stored, the session is primed, and the user lands
 * in /app. If the token is missing (interrupted login, stale or tampered
 * handoff) we render a clean recovery state with a way back to sign-in
 * instead of spinning forever.
 */
function GoogleCallbackPage() {
  useSeo({ title: "Google sign-in — LinkShift", robots: "noindex,nofollow" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // The fragment is not part of the router location — read it from the real
  // window location; navigating away below also drops it from the address bar.
  const accessToken = new URLSearchParams(
    window.location.hash.replace(/^#/, ""),
  ).get("accessToken");

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
          <p className="ls-marquee justify-center">Google sign-in</p>
          {accessToken ? (
            <>
              <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Signing you in…
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                One moment while your workspace loads.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Sign-in didn&apos;t finish
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-fg-secondary">
                We couldn&apos;t complete the handoff from Google. This can
                happen if the sign-in was interrupted or the link expired. No
                changes were made to your account.
              </p>
              <Link to="/login" className="mt-6 inline-flex">
                <Button size="lg">Back to sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export { GoogleCallbackPage };
