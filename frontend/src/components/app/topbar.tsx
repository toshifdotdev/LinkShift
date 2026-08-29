import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout as logoutApi } from "@/api/auth";
import { useLogout } from "@/auth/session";
import { UserMenu } from "./user-menu";

function Topbar({
  title,
  navOpen,
  onOpenNav,
}: {
  title: string;
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-sm">
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

        <p className="truncate text-sm font-medium text-foreground">{title}</p>

        <div className="ml-auto flex items-center gap-2">
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
