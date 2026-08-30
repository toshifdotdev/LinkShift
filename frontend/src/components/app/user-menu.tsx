import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { LogOut, Settings } from "lucide-react";
import { useSession } from "@/auth/session";
import { Avatar } from "./avatar";

const itemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-foreground";

function UserMenu({ onLogout, onSettings }: { onLogout: () => void; onSettings: () => void }) {
  const { user } = useSession();
  const plan = user?.plan.name ?? "FREE";

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
          <MenuPrimitive.Popup className="relative w-60 overflow-hidden rounded-lg border border-border bg-elevated p-1.5 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-150 origin-[var(--transform-origin)]">
            {/* The Mono Marquee: a 1px ember hairline drawn across the top of the popover */}
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-brand/60" />
            <div className="border-b border-border px-3 pt-4 pb-2.5">
              <p className="truncate text-[13px] font-medium text-foreground">{user?.name}</p>
              <p className="truncate font-mono text-[10px] tracking-[0.12em] text-fg-muted">
                {user?.email}
              </p>
              <p className="mt-2 inline-flex font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">
                <span className="mr-1.5 size-1 rounded-full bg-brand/80" aria-hidden="true" />
                {plan}
              </p>
            </div>
            <MenuPrimitive.Item className={itemClass} onClick={onSettings}>
              <Settings className="size-3.5" />
              Settings
            </MenuPrimitive.Item>
            <MenuPrimitive.Item
              className={
                "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-rose-300"
              }
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
