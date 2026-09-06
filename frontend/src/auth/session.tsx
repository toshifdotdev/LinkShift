import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getMe } from "@/api/users";
import { ApiError, UNAUTHORIZED_EVENT } from "@/api/client";
import { clearAccessToken, getAccessToken } from "@/api/token";
import type { MeUser } from "@/types/api";

interface SessionValue {
  user: MeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  hasError: boolean;
  refetch: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (getAccessToken() ? (await getMe()).data : null),
    staleTime: 60_000,
    retry: false,
  });

  
  useEffect(() => {
    const onUnauthorized = () => {
      queryClient.setQueryData(["me"], null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      if (!location.pathname.startsWith("/login")) {
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient, navigate, location.pathname]);

  const value = useMemo<SessionValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isPending,
      isAuthenticated: !!meQuery.data,
      
      
      
      
      hasError:
        meQuery.isError &&
        !(meQuery.error instanceof ApiError && meQuery.error.status === 401),
      refetch: () => void meQuery.refetch(),
    }),
    [meQuery],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}

function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(() => {
    clearAccessToken();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [queryClient, navigate]);
}

export { SessionProvider, useSession, useLogout };
