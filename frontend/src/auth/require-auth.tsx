import { AlertTriangle, RotateCw } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAccessToken } from "@/api/token";
import { useLogout, useSession } from "@/auth/session";
import { AppShellSkeleton } from "@/components/app/app-layout";
import { Button } from "@/components/ui/button";


function RequireAuth() {
  const location = useLocation();
  const { isLoading, isAuthenticated, hasError, refetch } = useSession();
  const logout = useLogout();

  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoading) return <AppShellSkeleton />;
  if (isAuthenticated) return <Outlet />;

  if (hasError) {
    return <BootstrapErrorState onRetry={() => void refetch()} onSignOut={logout} />;
  }

  
  return null;
}

function BootstrapErrorState({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase">
          Session check failed
        </p>
        <div className="mt-4 flex justify-center">
          <span className="flex size-10 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
        </div>
        <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-foreground">
          We couldn't load your workspace.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
          Your session is signed in, but the server didn't return your account. Try again,
          or sign out and back in to refresh the session.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onRetry} size="md" className="w-full">
            <RotateCw className="size-4" />
            Try again
          </Button>
          <Button onClick={onSignOut} variant="secondary" size="md" className="w-full">
            Sign out and back in
          </Button>
        </div>
      </div>
    </main>
  );
}

export { RequireAuth };
