import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ListLinksParams } from "@/api/links";
import { useTags } from "@/hooks/use-tags";

const SORT_OPTIONS = [
  { label: "Newest first", sort: "createdAt" as const, order: "desc" as const },
  { label: "Oldest first", sort: "createdAt" as const, order: "asc" as const },
  { label: "Name A→Z", sort: "name" as const, order: "asc" as const },
  { label: "Name Z→A", sort: "name" as const, order: "desc" as const },
  { label: "Most clicks", sort: "clicks" as const, order: "desc" as const },
  { label: "Least clicks", sort: "clicks" as const, order: "asc" as const },
];

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform);
}

function LinksToolbar({
  search,
  onSearch,
status,
  onStatus,
  tag,
  onTag,
  sort,
  order,
  onSort,
}: {
  search: string;
  onSearch: (v: string) => void;
status: ListLinksParams["status"];
    onStatus: (v: ListLinksParams["status"]) => void;
    /** Currently applied tag filter, if any. */
    tag?: string;
    onTag: (v: string | undefined) => void;
    sort: NonNullable<ListLinksParams["sort"]>;
  order: NonNullable<ListLinksParams["order"]>;
  onSort: (sort: NonNullable<ListLinksParams["sort"]>, order: NonNullable<ListLinksParams["order"]>) => void;
}) {
  const current = SORT_OPTIONS.find((o) => o.sort === sort && o.order === order);
  const [mac, setMac] = useState(false);
  const tagsQuery = useTags();
  const tags = tagsQuery.data ?? [];
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMac(isMac());
  }, []);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <Segmented
        ariaLabel="Filter by status"
        value={status ?? "all"}
        onValueChange={(v) => onStatus(v === "all" ? undefined : (v as "active" | "inactive"))}
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Only rendered once the owner actually has tags. An empty dropdown
            would be a control that cannot do anything. */}
        {tags.length > 0 && (
          <Select
            value={tag ?? "all"}
            onValueChange={(v) => onTag(v === "all" ? undefined : v)}
          >
            <SelectTrigger aria-label="Filter by tag" className="h-9 w-full sm:w-48">
              {tag ? `Tag: ${tag}` : "All tags"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  {t.name}
                  {t.linkCount > 0 && (
                    <span className="ml-auto pl-2 font-mono text-[10px] text-fg-muted tabular-nums">
                      {t.linkCount}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, URL, or slug"
            aria-label="Search links"
            className="h-9 w-full pl-9 pr-12 sm:w-72"
          />
          
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 select-none items-center rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-fg-muted sm:flex"
          >
            {mac ? "⌘" : "Ctrl"} K
          </span>
        </div>

        <Select
          value={`${sort}:${order}`}
          onValueChange={(v) => {
            const [nextSort, nextOrder] = v.split(":") as [
              NonNullable<ListLinksParams["sort"]>,
              NonNullable<ListLinksParams["order"]>,
            ];
            onSort(nextSort, nextOrder);
          }}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Sort links">
            {current?.label ?? "Newest first"}
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.label} value={`${o.sort}:${o.order}`}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { LinksToolbar, SORT_OPTIONS };
