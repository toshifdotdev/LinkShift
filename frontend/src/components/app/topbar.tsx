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
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-sm">
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

        <div className="relative flex min-w-0 items-center pl-3">
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand/70"
          />
          <p className="truncate pl-3 text-[13.5px] font-medium tracking-tight text-foreground">
            {title}
          </p>
        </div>

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
