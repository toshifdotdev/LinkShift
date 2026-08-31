import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsPanel } from "./tabs";
import { Segmented } from "./segmented";
import { Switch } from "./switch";
import { Checkbox } from "./checkbox";
import { Radio, RadioGroup, RadioGrid } from "./radio";
import { Select, SelectTrigger, SelectContent, SelectItem } from "./select";
import { Pagination } from "./pagination";
import { Banner } from "./banner";

describe("Tabs", () => {
  it("switches panels when a tab is clicked", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">Panel A</TabsPanel>
        <TabsPanel value="b">Panel B</TabsPanel>
      </Tabs>,
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Beta" }));
    expect(screen.getByText("Panel B")).toBeInTheDocument();
    expect(screen.queryByText("Panel A")).not.toBeInTheDocument();
  });

  it("marks the active tab with aria-selected", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
        <TabsPanel value="a">A</TabsPanel>
        <TabsPanel value="b">B</TabsPanel>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "false");
  });
});

describe("Segmented", () => {
  const options = [
    { value: "day", label: "24h" },
    { value: "week", label: "7d" },
    { value: "month", label: "30d" },
  ];

  it("reports the chosen value", () => {
    const onValueChange = vi.fn();
    render(<Segmented defaultValue="day" onValueChange={onValueChange} options={options} ariaLabel="Range" />);
    fireEvent.click(screen.getByRole("tab", { name: "7d" }));
    expect(onValueChange).toHaveBeenCalledWith("week");
  });

  it("reflects controlled selection", () => {
    render(<Segmented value="month" options={options} ariaLabel="Range" />);
    expect(screen.getByRole("tab", { name: "30d" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("Switch", () => {
  it("toggles on click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reflects checked state", () => {
    render(<Switch aria-label="Enabled" checked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("is inert when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Enabled" disabled onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(control);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Checkbox", () => {
  it("toggles on click", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Agree" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("exposes mixed state as aria-checked=mixed", () => {
    render(<Checkbox aria-label="Some" checked="mixed" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
  });

  it("is inert when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Agree" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("RadioGroup / RadioGrid", () => {
  it("selects a radio", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup defaultValue="a" onValueChange={onValueChange} ariaLabel="Choice">
        <Radio value="a" />
        <Radio value="b" />
      </RadioGroup>,
    );
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("RadioGrid renders options and selects them", () => {
    const onValueChange = vi.fn();
    render(
      <RadioGrid
        ariaLabel="Size"
        defaultValue="256"
        onValueChange={onValueChange}
        options={[
          { value: "256", label: "Small", hint: "256px" },
          { value: "512", label: "Medium", hint: "512px" },
        ]}
        columns={2}
      />,
    );
    fireEvent.click(screen.getByText("Medium"));
    expect(onValueChange).toHaveBeenCalledWith("512");
  });
});

describe("Select", () => {
  it("opens and reports the chosen item", async () => {
    const onValueChange = vi.fn();
    render(
      <Select defaultValue="newest" onValueChange={onValueChange}>
        <SelectTrigger placeholder="Sort">Newest first</SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="clicks">Most clicks</SelectItem>
        </SelectContent>
      </Select>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    const item = await screen.findByRole("option", { name: "Most clicks" });
    fireEvent.pointerDown(item);
    fireEvent.click(item);
    expect(onValueChange).toHaveBeenCalledWith("clicks");
  });

  it("shows the selected label supplied by the page", () => {
    render(
      <Select defaultValue="clicks">
        <SelectTrigger placeholder="Sort">Most clicks</SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="clicks">Most clicks</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Most clicks");
  });
});

describe("Pagination", () => {
  it("navigates pages and exposes the current one", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={5} pageCount={10} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Go to page 5" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(6);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: "Go to page 1" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables the edges", () => {
    render(<Pagination page={1} pageCount={3} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} pageCount={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("windows large ranges with gaps", () => {
    render(<Pagination page={5} pageCount={20} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 20" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 12" })).not.toBeInTheDocument();
  });
});

describe("Banner", () => {
  it("renders message and dismisses", () => {
    const onDismiss = vi.fn();
    render(
      <Banner tone="info" onDismiss={onDismiss}>
        Verification email sent.
      </Banner>,
    );
    expect(screen.getByText("Verification email sent.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("uses alert role for destructive tone", () => {
    render(<Banner tone="destructive">Payment failed.</Banner>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("uses status role for neutral tones", () => {
    render(<Banner tone="success">Saved.</Banner>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
