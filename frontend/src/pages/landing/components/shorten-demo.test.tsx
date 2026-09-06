import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/components/ui/toaster", () => ({
  useToaster: () => ({ toast: vi.fn() }),
}));

import { ShortenDemo } from "./shorten-demo";

function renderDemo() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShortenDemo />
    </QueryClientProvider>,
  );
}

function type(value: string) {
  const input = screen.getByLabelText("URL to shorten");
  fireEvent.change(input, { target: { value } });
  return input;
}

beforeEach(() => {
  /* Only the timers the demo schedules itself — leave rAF/Date real so
     framer-motion keeps running naturally in jsdom. */
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ShortenDemo input", () => {
  it("never lets the self-typing demo clobber a value the user is typing", () => {
    renderDemo();

    // auto-demo has started typing its own prefix ("http" after the first tick)
    act(() => {
      vi.advanceTimersByTime(30);
    });

    // user takes over mid-auto-type, right after the protocol
    const input = type("https://l");

    // any demo tick that was still queued must not rewrite the input
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(input).toHaveValue("https://l");
  });

  it("preserves both slashes of a fully typed https:// URL", () => {
    renderDemo();
    act(() => {
      vi.advanceTimersByTime(30);
    });

    const input = type("https://example.com/very-long-path?q=1");
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(input).toHaveValue("https://example.com/very-long-path?q=1");
  });

  it("preserves the protocol of a pasted http:// URL", () => {
    renderDemo();
    act(() => {
      vi.advanceTimersByTime(30);
    });

    const input = type("http://example.org/page");
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(input).toHaveValue("http://example.org/page");
  });

  it("typing https:// keystroke-by-keystroke then a yields exactly https://a", () => {
    renderDemo();
    act(() => {
      vi.advanceTimersByTime(30);
    });

    const input = screen.getByLabelText("URL to shorten");
    let value = "";
    for (const ch of "https://") {
      value += ch;
      fireEvent.change(input, { target: { value } });
    }
    expect(input).toHaveValue("https://");

    fireEvent.change(input, { target: { value: "https://a" } });
    expect(input).toHaveValue("https://a");

    // no queued demo writer may rewrite it afterwards
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(input).toHaveValue("https://a");
  });

  it("turns mono ligatures off so the second slash renders visibly", () => {
    renderDemo();
    const input = screen.getByLabelText("URL to shorten");
    /* jsdom cannot render the JetBrains Mono "//" ligature that made a
       correct "https://" value look like "https:/"; pin the utility that
       disables it in the browser. */
    expect(input.className).toContain("[font-variant-ligatures:none]");
  });

  it("the shift preview echoes the user's URL verbatim", () => {
    renderDemo();
    act(() => {
      vi.advanceTimersByTime(30);
    });

    type("https://example.com/notes/long-read");
    fireEvent.click(screen.getByRole("button", { name: /shorten/i }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("https://example.com/notes/long-read")).toBeInTheDocument();
  });
});
