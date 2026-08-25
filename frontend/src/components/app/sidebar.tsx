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
                ? "bg-elevated text-foreground"
                : "text-fg-secondary hover:bg-elevated/60 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* ember rail — same spine language as the button system */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-brand transition-[transform,opacity] duration-200",
                  isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[10px] tracking-wider transition-colors",
                  isActive ? "text-brand" : "text-fg-muted",
                )}
              >
                {item.index}
              </span>
              <item.icon className={cn("size-4", isActive ? "text-brand" : "")} aria-hidden="true" />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function PlanCard() {
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";
  return (
    <div className="mx-3 mb-3 rounded-lg border border-border bg-elevated/60 p-3.5">
      <p className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">Current plan</p>
      <p className={cn("font-display mt-1 text-lg font-semibold tracking-tight", planTone(plan))}>
        {plan.charAt(0) + plan.slice(1).toLowerCase()}
      </p>
      <NavLink
        to="/pricing"
        className="mt-2 inline-block font-mono text-[10px] tracking-[0.14em] text-brand uppercase transition-colors hover:text-brand-hover"
      >
        {plan === "FREE" ? "Upgrade →" : "Manage →"}
      </NavLink>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-6">
        <Logo to="/app" />
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
