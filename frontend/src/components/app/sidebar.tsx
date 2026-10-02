import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { APP_NAV_GROUPS } from "./nav-config";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/auth/session";
import { Avatar } from "./avatar";
import type { VariantProps } from "class-variance-authority";
import { Lamp, lampVariants } from "@/components/ui/lamp";
import { rowEntry, staggerDelay } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

type LampTone = VariantProps<typeof lampVariants>["tone"];

function planTone(planName: string): LampTone {
  if (planName === "PRO") return "ember";
  if (planName === "CREATOR") return "neutral";
  return "dim";
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const reduce = useReducedMotion();
  let rowIndex = 0;
  return (
    <nav aria-label="Application" className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-2">
      {APP_NAV_GROUPS.map(({ group, items }) => (
        <div key={group}>
          <div className="flex items-center gap-3 px-4 pb-3">
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-fg-muted">
              {group}
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-border-subtle" />
          </div>
          <ul className="space-y-1">
            {items.map((item) => {
              const delay = staggerDelay(rowIndex++);
              return (
                <motion.li key={item.to} {...rowEntry(delay, reduce, 4)}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/app"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 rounded-md py-2 pr-3 pl-4 text-[13px] transition-colors duration-150",
                        isActive
                          ? "bg-elevated text-foreground font-medium"
                          : "text-fg-secondary hover:bg-elevated/50 hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Accent spine — the 1px ember rail (DESIGN.md law 2) */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute top-1.5 bottom-1.5 left-0 w-px rounded-full bg-brand transition-[transform,opacity] duration-300 ease-out",
                            isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                          )}
                        />
                        <span
                          className={cn(
                            "font-mono text-[10px] tracking-[0.16em] tabular-nums transition-colors duration-150",
                            isActive ? "text-brand" : "text-fg-muted",
                          )}
                        >
                          {item.index}
                        </span>
                        <item.icon
                          className={cn(
                            "size-4 shrink-0 transition-colors duration-150",
                            isActive ? "text-brand" : "text-fg-muted/70 group-hover:text-fg-secondary",
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="ml-auto h-1 w-1 shrink-0 rounded-full bg-brand"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.li>
              );
            })}
          </ul>
        </div>
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
    <div className="relative mx-3 mb-3 overflow-hidden rounded-lg border border-border bg-elevated/50 p-4">
      <p className="font-mono text-[9px] font-medium tracking-[0.2em] text-fg-muted uppercase">
        Current plan
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="font-display text-xl leading-none font-semibold tracking-tight text-foreground">
          {plan.charAt(0) + plan.slice(1).toLowerCase()}
        </p>
        <Lamp tone={planTone(plan)}>{plan}</Lamp>
      </div>
      {renewal && (
        <p className="mt-3 font-mono text-[10px] tracking-[0.12em] text-fg-muted tabular-nums">
          {renewal}
        </p>
      )}
      <NavLink
        to="/pricing"
        className="group mt-4 flex items-center gap-2 border-t border-border-subtle pt-3 font-mono text-[10px] font-medium tracking-[0.14em] text-brand uppercase transition-colors hover:text-brand-hover"
      >
        {plan === "FREE" ? "Upgrade" : "Manage plan"}
        <ArrowRight
          aria-hidden="true"
          className="size-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        />
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
      <div className="flex items-center justify-between border-b border-border-subtle px-5 pt-5 pb-4">
        <Logo to="/" />
        {headerAction}
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto">
        <PlanCard />
        <div className="flex items-center gap-3 border-t border-border px-4 py-4">
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
