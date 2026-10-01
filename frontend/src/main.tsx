import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { ToastProvider } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/auth/session";
import { ThemeProvider } from "@/theme/theme";
import { AppWithCrashGuard } from "@/components/app/app-with-crash-guard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <SessionProvider>
              <ToastProvider>
                <TooltipProvider>
                  <AppWithCrashGuard />
                </TooltipProvider>
              </ToastProvider>
            </SessionProvider>
          </BrowserRouter>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
