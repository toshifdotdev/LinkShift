import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listTags = vi.fn();
const createLink = vi.fn();
const updateLink = vi.fn();

vi.mock("@/api/tags", async (orig) => {
  const actual = await orig<typeof import("@/api/tags")>();
  return { ...actual, listTags: (...a: unknown[]) => listTags(...a) };
});
vi.mock("@/api/links", async (orig) => {
  const actual = await orig<typeof import("@/api/links")>();
  return {
    ...actual,
    createLink: (...a: unknown[]) => createLink(...a),
    updateLink: (...a: unknown[]) => updateLink(...a),
  };
});

import { TagPicker } from "./tag-picker";
import { normaliseTagName, isValidTagName, MAX_TAG_NAME_LENGTH } from "@/lib/tag-constants";

function wrap(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  listTags.mockReset().mockResolvedValue([
    { id: "t1", name: "launch", linkCount: 3 },
    { id: "t2", name: "q3-campaign", linkCount: 0 },
  ]);
});

afterEach(() => vi.restoreAllMocks());

describe("tag names: client mirrors the server rule", () => {
  it("normalises to lower case so a chip matches the filter", () => {
    expect(normaliseTagName("  Launch  ")).toBe("launch");
  });

  it("rejects empty and over-long names before a round trip", () => {
    expect(isValidTagName("   ")).toBe(false);
    expect(isValidTagName("x".repeat(MAX_TAG_NAME_LENGTH))).toBe(true);
    expect(isValidTagName("x".repeat(MAX_TAG_NAME_LENGTH + 1))).toBe(false);
  });
});

describe("TagPicker", () => {
  it("adds a tag on Enter without submitting anything", () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/type a tag/i);
    fireEvent.change(input, { target: { value: "Launch" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Enter commits the tag rather than submitting the surrounding dialog,
    // which would create the link before the owner finished typing.
    expect(onChange).toHaveBeenCalledWith(["launch"]);
  });

  it("offers existing tags that are not yet applied", async () => {
    wrap(<TagPicker value={[]} onChange={vi.fn()} />);

    expect(await screen.findByText("+ launch")).toBeInTheDocument();
    expect(screen.getByText("+ q3-campaign")).toBeInTheDocument();
  });

  it("hides an already-applied tag from the suggestions", async () => {
    wrap(<TagPicker value={["launch"]} onChange={vi.fn()} />);

    expect(await screen.findByText("+ q3-campaign")).toBeInTheDocument();
    expect(screen.queryByText("+ launch")).not.toBeInTheDocument();
  });

  it("adds a suggestion on click", async () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={[]} onChange={onChange} />);

    fireEvent.click(await screen.findByText("+ launch"));

    expect(onChange).toHaveBeenCalledWith(["launch"]);
  });

  it("refuses a duplicate regardless of casing", async () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={["launch"]} onChange={onChange} />);

    const input = await screen.findByPlaceholderText(/add another/i);
    fireEvent.change(input, { target: { value: "LAUNCH" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // "LAUNCH" and "launch" are one tag server-side, so accepting this would
    // attach the same tag twice.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows applied tags as removable chips", async () => {
    wrap(<TagPicker value={["launch", "q3"]} onChange={vi.fn()} />);

    expect(await screen.findByText("launch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove tag q3/i })).toBeInTheDocument();
  });

  it("removes a tag when its chip is clicked", async () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={["launch", "q3"]} onChange={onChange} />);

    fireEvent.click(await screen.findByRole("button", { name: /remove tag q3/i }));

    expect(onChange).toHaveBeenCalledWith(["launch"]);
  });

  it("drops the last chip on Backspace when the field is empty", async () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={["launch", "q3"]} onChange={onChange} />);

    const input = await screen.findByPlaceholderText(/add another/i);
    fireEvent.keyDown(input, { key: "Backspace" });

    expect(onChange).toHaveBeenCalledWith(["launch"]);
  });

  it("ignores a name over the length limit instead of sending it", () => {
    const onChange = vi.fn();
    wrap(<TagPicker value={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/type a tag/i);
    fireEvent.change(input, { target: { value: "x".repeat(MAX_TAG_NAME_LENGTH + 5) } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("stays usable when the tag list fails to load", async () => {
    // Losing the suggestions must not lose the field. Tags are still typed
    // and created on save.
    listTags.mockRejectedValue(new Error("offline"));
    wrap(<TagPicker value={[]} onChange={vi.fn()} />);

    const input = await screen.findByPlaceholderText(/type a tag/i);
    fireEvent.change(input, { target: { value: "offline-tag" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByPlaceholderText(/type a tag/i)).toBeInTheDocument());
  });
});