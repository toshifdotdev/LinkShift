import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";



type LedgerSortDirection = "asc" | "desc";

interface LedgerSort {
  id: string;
  direction: LedgerSortDirection;
}

interface LedgerColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right";
  className?: string;
  headerClassName?: string;
  
  cardLabel?: ReactNode;
}

interface LedgerProps<T> {
  rows: T[];
  columns: LedgerColumn<T>[];
  rowKey: (row: T) => string;
  sort?: LedgerSort | null;
  onSortChange?: (sort: LedgerSort) => void;
  density?: "comfortable" | "compact";
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

function Ledger<T>({
  rows,
  columns,
  rowKey,
  sort = null,
  onSortChange,
  density = "comfortable",
  onRowClick,
  rowClassName,
  className,
}: LedgerProps<T>) {
  const handleSort = (column: LedgerColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const direction: LedgerSortDirection =
      sort?.id === column.id && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ id: column.id, direction });
  };

  const rowPad = density === "compact" ? "py-1.5" : "py-3";

  return (
    <div data-slot="ledger" className={className}>
      
      <div className="hidden md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {columns.map((column) => {
                const sorted = sort?.id === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      sorted
                        ? sort!.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "sticky top-0 z-10 border-b border-border bg-surface px-3 py-2 text-left font-mono text-[10px] font-medium tracking-[0.14em] text-fg-muted uppercase",
                      column.align === "right" && "text-right",
                      column.headerClassName,
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        aria-label={`Sort by ${typeof column.header === "string" ? column.header : column.id}`}
                        className={cn(
                          "group inline-flex cursor-pointer items-center gap-1 tracking-[0.14em] uppercase transition-colors duration-150 hover:text-foreground",
                          sorted && "text-foreground",
                        )}
                      >
                        {column.header}
                        <ChevronDown
                          aria-hidden="true"
                          className={cn(
                            "size-3 transition-transform duration-150",
                            sorted
                              ? "text-brand"
                              : "text-fg-muted/60 opacity-0 group-hover:opacity-100",
                            sorted && sort!.direction === "asc" && "rotate-180",
                          )}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border-subtle transition-colors duration-100 last:border-0 hover:bg-elevated/60",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-3 align-middle text-foreground",
                      rowPad,
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "rounded-lg border border-border bg-surface px-4 py-3",
              onRowClick && "cursor-pointer",
              rowClassName?.(row),
            )}
          >
            {columns.map((column) => (
              <div key={column.id} className="flex items-center justify-between gap-3 py-1">
                <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  {column.cardLabel ?? column.header}
                </span>
                <span className={cn("min-w-0 text-right text-[13px] text-foreground", column.className)}>
                  {column.cell(row)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Ledger };
export type { LedgerColumn, LedgerSort, LedgerSortDirection };
