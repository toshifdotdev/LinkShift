import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAccessToken } from "@/api/token";
import { useSession } from "@/auth/session";
import { AppShellSkeleton } from "@/components/app/app-layout";

/**
 * Guards the /app subtree. Token absence short-circuits to /login; a
 * present token waits on the /users/me query before rendering the shell.
 */
function RequireAuth() {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useSession();

  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoading) return <AppShellSkeleton />;
  if (!isAuthenticated) return null; // 401 event is routing to /login

  return <Outlet />;
}

export { RequireAuth };
