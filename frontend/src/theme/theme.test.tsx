import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/theme/theme";

function installMatchMedia(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("light") ? prefersLight : !prefersLight,
      media: query,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })),
  );
  return listeners;
}

function Probe() {
  const { theme, mode, setMode } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode("light")}>to-light</button>
      <button onClick={() => setMode("dark")}>to-dark</button>
      <button onClick={() => setMode("system")}>to-system</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("applies the resolved theme to <html> and persists explicit choices", () => {
    installMatchMedia(false); // system prefers dark
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    // system mode resolves to dark
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => screen.getByText("to-light").click());
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("ls:theme")).toBe("light");

    act(() => screen.getByText("to-dark").click());
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("ls:theme")).toBe("dark");
  });

  it("follows the OS preference when mode is system", () => {
    installMatchMedia(true); // system prefers light
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
