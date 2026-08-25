import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { LogOut, Settings } from "lucide-react";
import { useSession } from "@/auth/session";
import { Avatar } from "./avatar";

function UserMenu({ onLogout, onSettings }: { onLogout: () => void; onSettings: () => void }) {
  const { user } = useSession();

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-elevated focus-visible:outline-2 focus-visible:outline-ring/70 data-[popup-open]:border-border data-[popup-open]:bg-elevated"
      >
        <Avatar src={user?.avatarUrl} name={user?.name} className="size-7 border border-border-strong" />
        <span className="hidden max-w-32 truncate text-[13px] text-fg-secondary sm:block">
          {user?.name ?? "…"}
        </span>
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={8}>
          <MenuPrimitive.Popup className="w-56 rounded-lg border border-border bg-elevated p-1.5 shadow-xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150 origin-[var(--transform-origin)]">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-[13px] font-medium text-foreground">{user?.name}</p>
              <p className="truncate font-mono text-[10px] text-fg-muted">{user?.email}</p>
            </div>
            <MenuPrimitive.Item
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-foreground"
              onClick={onSettings}
            >
              <Settings className="size-3.5" />
              Settings
            </MenuPrimitive.Item>
            <MenuPrimitive.Item
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="size-3.5" />
              Log out
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

export { UserMenu };
