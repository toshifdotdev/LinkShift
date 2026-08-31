import { motion } from "framer-motion";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";
import { APP_NAV } from "./nav-config";
import { useSession } from "@/auth/session";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

function useActiveNav() {
  const location = useLocation();
  return (
    [...APP_NAV]
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/")) ??
    APP_NAV[0]
  );
}

function AppLayout() {
  const location = useLocation();
  const { user } = useSession();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      {/* MobileNav is a fixed, full-viewport overlay — it must render OUTSIDE the
          header so `backdrop-blur` on the header cannot become its containing
          block (which would confine the overlay to the 56px header box). */}
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar
          nav={useActiveNav()}
          navOpen={navOpen}
          onOpenNav={() => setNavOpen(true)}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <ErrorBoundary resetKey={location.pathname}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet context={{ user }} />
            </motion.div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** Shell-shaped loading state shown while /users/me resolves. */
function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface p-5 lg:block">
        <Skeleton className="h-7 w-36" />
        <div className="mt-8 space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-md" />
          ))}
        </div>
      </div>
      <div className="lg:pl-64">
        <div className="flex h-14 items-center border-b border-border px-4 sm:px-6">
          <Skeleton className="h-4 w-28" />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-2 h-4 w-80" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="mt-6 h-64 rounded-lg" />
        </main>
      </div>
    </div>
  );
}

export { AppLayout, AppShellSkeleton };
