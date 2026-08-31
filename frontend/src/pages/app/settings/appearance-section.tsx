import { Monitor, Moon, Sun } from "lucide-react";
import { RadioGrid } from "@/components/ui/radio";
import { useTheme, type ThemeMode } from "@/theme/theme";

const OPTIONS: Array<{ mode: ThemeMode; label: string; note: string; Icon: typeof Sun }> = [
  { mode: "light", label: "Light", note: "Paper & Ember", Icon: Sun },
  { mode: "dark", label: "Dark", note: "Ink & Ember", Icon: Moon },
  { mode: "system", label: "System", note: "Match device", Icon: Monitor },
];

function AppearanceSection() {
  const { mode, theme, setMode } = useTheme();

  return (
    <div>
      <RadioGrid
        value={mode}
        onValueChange={(v) => setMode(v as ThemeMode)}
        ariaLabel="Theme"
        columns={3}
        options={OPTIONS.map(({ mode: m, label, note, Icon }) => ({
          value: m,
          label,
          hint: note,
          icon: <Icon className="size-4" aria-hidden="true" />,
        }))}
      />

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
