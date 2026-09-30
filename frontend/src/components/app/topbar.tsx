import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout as logoutApi } from "@/api/auth";
import { useLogout } from "@/auth/session";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";
import type { AppNavItem } from "./nav-config";

function Topbar({
  nav,
  navOpen,
  onOpenNav,
}: {
  nav: AppNavItem;
  navOpen: boolean;
  onOpenNav: () => void;
}) {
  const navigate = useNavigate();
  const logout = useLogout();

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // clearing local session regardless
    }
    logout();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2.5 px-5 lg:px-8">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          onClick={onOpenNav}
          className="flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <p className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="font-mono text-[10px] tabular-nums text-fg-muted">{nav.index}</span>
          <span className="min-w-0 truncate font-medium text-foreground">{nav.label}</span>
        </p>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu
            onLogout={() => void handleLogout()}
            onSettings={() => navigate("/app/settings")}
          />
        </div>
      </div>
    </header>
  );
}

export { Topbar };
