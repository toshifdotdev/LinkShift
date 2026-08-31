import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/theme/theme";

const OPTIONS: Array<{ mode: ThemeMode; label: string; Icon: typeof Sun }> = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

/** Small topbar control: an icon trigger that opens the theme chooser. */
function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const ActiveIcon = OPTIONS.find((o) => o.mode === mode)?.Icon ?? Moon;

  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-foreground";

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        aria-label="Theme"
        className="flex size-9 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/70 data-[popup-open]:bg-elevated data-[popup-open]:text-foreground"
      >
        <ActiveIcon className="size-[18px]" />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={8} className="z-50">
          <MenuPrimitive.Popup className="relative w-44 overflow-hidden rounded-lg border border-border bg-elevated p-1.5 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-150 origin-[var(--transform-origin)]">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-brand/60" />
            <div className="border-b border-border px-3 pt-3.5 pb-2">
              <p className="font-mono text-[9px] tracking-[0.18em] text-fg-muted uppercase">
                Theme
              </p>
            </div>
            {OPTIONS.map(({ mode: m, label, Icon }) => (
              <MenuPrimitive.Item
                key={m}
                className={itemClass}
                onClick={() => setMode(m)}
              >
                <Icon className="size-3.5" />
                {label}
                {mode === m && <Check className="ml-auto size-3.5 text-brand" />}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

export { ThemeToggle };
