import { NavLink } from "react-router-dom";
import { APP_NAV } from "./nav-config";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/auth/session";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

function planTone(planName: string): string {
  if (planName === "PRO") return "text-brand";
  if (planName === "CREATOR") return "text-foreground";
  return "text-fg-secondary";
}

function planAccent(planName: string): string {
  if (planName === "PRO") return "from-brand/40 to-brand/0";
  if (planName === "CREATOR") return "from-fg-secondary/30 to-fg-secondary/0";
  return "from-border to-border/0";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-1 flex-col gap-0.5 px-3">
      {APP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/app"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-md py-2 pr-3 pl-4 text-sm transition-colors duration-150",
              isActive
                ? "bg-elevated/80 text-foreground"
                : "text-fg-secondary hover:bg-elevated/40 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* The Ember Stripe: a 2px left rail that only the active item shows */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-brand transition-[transform,opacity] duration-300 ease-out",
                  isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[0.16em] transition-colors duration-150",
                  isActive ? "text-brand" : "text-fg-muted",
                )}
              >
                {item.index}
              </span>
              <item.icon
                className={cn(
                  "size-4 transition-colors duration-150",
                  isActive ? "text-brand" : "",
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function renewalCountdown(currentPeriodEnd: string | null | undefined): string | null {
  if (!currentPeriodEnd) return null;
  const ms = new Date(currentPeriodEnd).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 day until renewal";
  return `${days} days until renewal`;
}

function PlanCard() {
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  const renewal = renewalCountdown(user?.subscription?.currentPeriodEnd);
  return (
    <div className="relative mx-3 mb-3 overflow-hidden rounded-lg border border-border bg-elevated/60 p-3.5">
      {/* The plan accent gradient — visible only on CREATOR/PRO. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          planAccent(plan),
        )}
      />
      <p className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">
        Current plan
      </p>
      <p className={cn("font-display mt-1 text-lg font-semibold tracking-tight", planTone(plan))}>
        {plan.charAt(0) + plan.slice(1).toLowerCase()}
      </p>
      {renewal && (
        <p className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-fg-muted">
          {renewal}
        </p>
      )}
      <NavLink
        to="/pricing"
        className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-brand uppercase transition-colors hover:text-brand-hover"
      >
        {plan === "FREE" ? "Upgrade" : "Manage plan"}
        <span aria-hidden="true">→</span>
      </NavLink>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  headerAction,
}: {
  onNavigate?: () => void;
  headerAction?: React.ReactNode;
}) {
  const { user } = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-6">
        <Logo to="/app" />
        {headerAction}
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto">
        <PlanCard />
        <div className="flex items-center gap-3 border-t border-border px-4 py-3.5">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name}
            className="size-8 shrink-0 border border-border-strong text-[11px]"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {user?.name ?? "…"}
            </p>
            <p className="truncate font-mono text-[10px] text-fg-muted">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}

export { Sidebar, SidebarContent };
