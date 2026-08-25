import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ListLinksParams } from "@/api/links";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Active", value: "active" as const },
  { label: "Inactive", value: "inactive" as const },
];

const SORT_OPTIONS = [
  { label: "Newest first", sort: "createdAt" as const, order: "desc" as const },
  { label: "Oldest first", sort: "createdAt" as const, order: "asc" as const },
  { label: "Name A→Z", sort: "name" as const, order: "asc" as const },
  { label: "Name Z→A", sort: "name" as const, order: "desc" as const },
  { label: "Most clicks", sort: "clicks" as const, order: "desc" as const },
  { label: "Least clicks", sort: "clicks" as const, order: "asc" as const },
];

function LinksToolbar({
  search,
  onSearch,
  status,
  onStatus,
  sort,
  order,
  onSort,
}: {
  search: string;
  onSearch: (v: string) => void;
  status: ListLinksParams["status"];
  onStatus: (v: ListLinksParams["status"]) => void;
  sort: NonNullable<ListLinksParams["sort"]>;
  order: NonNullable<ListLinksParams["order"]>;
  onSort: (sort: NonNullable<ListLinksParams["sort"]>, order: NonNullable<ListLinksParams["order"]>) => void;
}) {
  const current = SORT_OPTIONS.find((o) => o.sort === sort && o.order === order);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* status tabs */}
      <div
        role="radiogroup"
        aria-label="Filter by status"
        className="inline-flex items-center rounded-md border border-border bg-surface p-1"
      >
        {STATUS_TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onStatus(tab.value)}
              className={cn(
                "relative h-7 cursor-pointer rounded-sm px-3 text-[12px] font-medium transition-colors",
                active
                  ? "border border-border-strong bg-raised text-foreground"
                  : "text-fg-muted hover:text-fg-secondary",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, URL or slug…"
            aria-label="Search links"
            className="h-9 w-full pl-9 sm:w-64"
          />
        </div>

        {/* sort */}
        <select
          aria-label="Sort links"
          value={`${sort}:${order}`}
          onChange={(e) => {
            const [nextSort, nextOrder] = e.target.value.split(":") as [
              NonNullable<ListLinksParams["sort"]>,
              NonNullable<ListLinksParams["order"]>,
            ];
            onSort(nextSort, nextOrder);
          }}
          className="h-9 cursor-pointer rounded-md border border-input bg-surface px-3 text-sm text-foreground transition-colors hover:border-border-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-ring/40"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.label} value={`${o.sort}:${o.order}`}>
              {current?.sort === o.sort && current?.order === o.order ? o.label : o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export { LinksToolbar, SORT_OPTIONS };
