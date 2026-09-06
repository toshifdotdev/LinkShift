import { NavLink } from "react-router-dom";
import { APP_NAV } from "./nav-config";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/auth/session";
import { Avatar } from "./avatar";
import type { VariantProps } from "class-variance-authority";
import { Lamp, lampVariants } from "@/components/ui/lamp";
import { cn } from "@/lib/utils";

type LampTone = VariantProps<typeof lampVariants>["tone"];

function planTone(planName: string): LampTone {
  if (planName === "PRO") return "ember";
  if (planName === "CREATOR") return "neutral";
  return "dim";
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
              {/* The Ember Rail: a 1px left hairline that only the active item shows */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-2 bottom-2 left-0 w-px bg-brand transition-[transform,opacity] duration-300 ease-out",
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
                  isActive ? "text-fg-secondary" : "",
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
      <p className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">
        Current plan
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
          {plan.charAt(0) + plan.slice(1).toLowerCase()}
        </p>
        <Lamp tone={planTone(plan)}>{plan}</Lamp>
      </div>
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
        <Logo to="/" />
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
