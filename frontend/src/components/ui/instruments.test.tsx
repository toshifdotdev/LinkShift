import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Lamp } from "./lamp";
import { CodeChip } from "./code-chip";
import { KpiCell } from "./kpi-cell";
import { RouteStrip } from "./route-strip";
import { Waybill, WaybillRow } from "./waybill";
import { EmptyState, ErrorState } from "./empty";
import { Ledger, type LedgerColumn, type LedgerSort } from "./ledger";
import { Button } from "./button";

describe("Lamp", () => {
  it("pairs the dot with a word", () => {
    render(<Lamp tone="success">Active</Lamp>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("CodeChip", () => {
  it("dims the host and carries the slug", () => {
    render(<CodeChip prefix="lnk.sh/">spring-sale</CodeChip>);
    expect(screen.getByText("lnk.sh/")).toBeInTheDocument();
    expect(screen.getByText("spring-sale")).toBeInTheDocument();
  });
});

describe("KpiCell", () => {
  it("renders micro-label and tabular value", () => {
    render(<KpiCell label="Total clicks" value={5210} />);
    expect(screen.getByText("Total clicks")).toBeInTheDocument();
    expect(screen.getByText("5,210")).toBeInTheDocument();
  });

  it("applies a custom formatter", () => {
    render(<KpiCell label="CTR" value={64} format={(n) => `${n}%`} />);
    expect(screen.getByText("64%")).toBeInTheDocument();
  });

  it("settles on the new value after an update", async () => {
    const { rerender } = render(<KpiCell label="Clicks" value={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
    rerender(<KpiCell label="Clicks" value={128} />);
    await waitFor(() => expect(screen.getByText("128")).toBeInTheDocument(), {
      timeout: 2000,
    });
  });
});

describe("RouteStrip", () => {
  it("renders kicker, thesis, meta and action", () => {
    const onClick = vi.fn();
    render(
      <RouteStrip
        index="02"
        label="Routes"
        title="All links"
        description="Every route you have opened."
        meta={<Lamp tone="success">Active</Lamp>}
        action={<Button onClick={onClick}>New link</Button>}
      />,
    );
    expect(screen.getByText("02 · Routes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All links" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New link" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Waybill", () => {
  it("shows plan code, status and detail rows", () => {
    render(
      <Waybill
        code="PRO"
        name="Pro"
        current
        status={<Lamp tone="success">Active</Lamp>}
        action={<Button>Manage plan</Button>}
      >
        <WaybillRow label="Renews">Sep 14, 2026</WaybillRow>
      </Waybill>,
    );
    expect(screen.getByText("PRO")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Renews")).toBeInTheDocument();
    expect(screen.getByText("Sep 14, 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manage plan" })).toBeInTheDocument();
  });
});

describe("EmptyState / ErrorState", () => {
  it("renders the consolidated empty treatment", () => {
    render(
      <EmptyState
        marquee="No routes"
        title="Open your first route"
        description="Shorten a link to see it here."
        action={<Button>Create link</Button>}
      />,
    );
    expect(screen.getByText("No routes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open your first route" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create link" })).toBeInTheDocument();
  });

  it("renders the error treatment with retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="The desk could not be reached." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("The desk could not be reached.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

interface Row {
  id: string;
  slug: string;
  clicks: number;
}

const rows: Row[] = [
  { id: "1", slug: "spring-sale", clicks: 120 },
  { id: "2", slug: "launch", clicks: 982 },
];

const columns: LedgerColumn<Row>[] = [
  { id: "slug", header: "Route", sortable: true, cell: (r) => r.slug },
  {
    id: "clicks",
    header: "Clicks",
    sortable: true,
    align: "right",
    cardLabel: "Clicks",
    cell: (r) => r.clicks.toLocaleString("en-US"),
  },
];

describe("Ledger", () => {
  it("renders rows in table and card layouts", () => {
    render(<Ledger rows={rows} columns={columns} rowKey={(r) => r.id} />);
    // one occurrence per layout (table + mobile cards)
    expect(screen.getAllByText("spring-sale")).toHaveLength(2);
    expect(screen.getAllByText("982")).toHaveLength(2);
  });

  it("sorts asc then desc across controlled updates", () => {
    const onSortChange = vi.fn();
    function Harness() {
      const [sort, setSort] = useState<LedgerSort | null>(null);
      return (
        <Ledger
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          sort={sort}
          onSortChange={(next) => {
            onSortChange(next);
            setSort(next);
          }}
        />
      );
    }
    render(<Harness />);
    const sortClicks = screen.getAllByRole("button", { name: "Sort by Clicks" })[0];
    fireEvent.click(sortClicks);
    expect(onSortChange).toHaveBeenLastCalledWith({ id: "clicks", direction: "asc" });
    fireEvent.click(sortClicks);
    expect(onSortChange).toHaveBeenLastCalledWith({ id: "clicks", direction: "desc" });
    const header = screen.getAllByText("Clicks")[0].closest("th");
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("exposes aria-sort for the sorted column", () => {
    render(
      <Ledger
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        sort={{ id: "clicks", direction: "asc" }}
        onSortChange={() => {}}
      />,
    );
    const header = screen.getAllByText("Clicks")[0].closest("th");
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("fires onRowClick", () => {
    const onRowClick = vi.fn();
    render(<Ledger rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getAllByText("launch")[0]);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });
});
