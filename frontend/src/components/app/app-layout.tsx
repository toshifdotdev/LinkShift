import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { APP_NAV } from "./nav-config";
import { useSession } from "@/auth/session";
import { Skeleton } from "@/components/ui/skeleton";

function usePageTitle(): string {
  const location = useLocation();
  const match = [...APP_NAV]
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) => location.pathname === n.to || location.pathname.startsWith(n.to + "/"));
  return match?.label ?? "Overview";
}

function AppLayout() {
  const location = useLocation();
  const { user } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar title={usePageTitle()} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet context={{ user }} />
          </motion.div>
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
