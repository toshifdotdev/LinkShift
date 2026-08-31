import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/theme/theme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ mode: ThemeMode; label: string; note: string; Icon: typeof Sun }> = [
  { mode: "light", label: "Light", note: "Paper & Ember", Icon: Sun },
  { mode: "dark", label: "Dark", note: "Ink & Ember", Icon: Moon },
  { mode: "system", label: "System", note: "Match device", Icon: Monitor },
];

function AppearanceSection() {
  const { mode, theme, setMode } = useTheme();

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="grid gap-2 sm:grid-cols-3"
      >
        {OPTIONS.map(({ mode: m, label, note, Icon }) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m)}
              className={cn(
                "relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border p-3.5 text-left transition-colors",
                active
                  ? "border-brand/60 bg-brand/[0.06]"
                  : "border-border bg-elevated/50 hover:border-border-strong",
              )}
            >
              {active && (
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />
              )}
              <Icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-fg-muted")} />
              <span className="min-w-0">
                <span className={cn("block text-[13.5px] font-medium", active ? "text-foreground" : "text-fg-secondary")}>
                  {label}
                </span>
                <span className="block font-mono text-[10px] tracking-[0.08em] text-fg-muted uppercase">
                  {note}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        Currently rendering the <span className="text-fg-secondary">{theme}</span> theme.
        {mode === "system"
          ? " System mode follows your device appearance and updates automatically."
          : " Your choice is saved on this device."}
      </p>
    </div>
  );
}

export { AppearanceSection };
