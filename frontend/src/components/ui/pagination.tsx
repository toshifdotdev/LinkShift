import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Pagination — mono numerals; the current page carries the ember rail
 * (the Rail language reserved for *current*).
 */

type WindowItem = number | "gap";

function buildWindow(page: number, pageCount: number): WindowItem[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: WindowItem[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pageCount - 1, page + 1);
  if (lo > 2) items.push("gap");
  for (let p = lo; p <= hi; p++) items.push(p);
  if (hi < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}

const navButton =
  "flex size-8 cursor-pointer items-center justify-center rounded-md border border-border text-fg-secondary transition-colors duration-150 hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-40 max-lg:size-11";
const pageButton =
  "relative flex size-8 cursor-pointer items-center justify-center rounded-md font-mono text-xs text-fg-secondary transition-colors duration-150 hover:bg-elevated hover:text-foreground max-lg:size-11";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" data-slot="pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={navButton}
      >
        <ChevronLeft className="size-3.5" aria-hidden="true" />
      </button>
      {buildWindow(page, pageCount).map((item, i) =>
        item === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="flex size-8 items-center justify-center font-mono text-xs text-fg-muted"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Go to page ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              pageButton,
              item === page &&
                "text-foreground after:absolute after:inset-x-1.5 after:bottom-1 after:h-px after:bg-brand",
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={navButton}
      >
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </button>
    </nav>
  );
}

export { Pagination };
