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
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          onClick={onOpenNav}
          className="flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <p className="ls-marquee min-w-0 truncate">
          {nav.index} · {nav.label}
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
