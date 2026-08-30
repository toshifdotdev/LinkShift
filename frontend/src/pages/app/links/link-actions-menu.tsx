import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Copy, ExternalLink, MoreHorizontal, Pencil, QrCode, Trash2 } from "lucide-react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useToaster } from "@/components/ui/toaster";
import { shortUrl } from "@/lib/short-url";
import type { LinkItem } from "@/types/api";

function LinkActionsMenu({
  link,
  onEdit,
  onDelete,
  onDeleted,
}: {
  link: LinkItem;
  onEdit: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
  /** lets the parent flash copy feedback on the row */
  onDeleted?: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToaster();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl(link.shortId));
      setCopied(true);
      toast({ title: "Copied", meta: `go.linkshift.in/${link.shortId}`, variant: "success" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access.", variant: "error" });
    }
  }

  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-fg-secondary outline-none transition-colors data-[highlighted]:bg-raised data-[highlighted]:text-foreground";

  return (
    <div className="flex items-center justify-end gap-1">
      {/* quick copy — the most frequent action */}
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy short link"}
        onClick={() => void handleCopy()}
        className="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-foreground"
      >
        {copied ? (
          <span className="font-mono text-[9px] tracking-wide text-emerald-400 uppercase">Copied</span>
        ) : (
          <Copy className="size-4" />
        )}
      </button>

      <MenuPrimitive.Root>
        <MenuPrimitive.Trigger
          aria-label={`Actions for ${link.name ?? link.shortId}`}
          className="flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/70 data-[popup-open]:bg-elevated data-[popup-open]:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </MenuPrimitive.Trigger>

        <MenuPrimitive.Portal>
          <MenuPrimitive.Positioner align="end" sideOffset={6}>
            <MenuPrimitive.Popup className="w-52 rounded-lg border border-border bg-elevated p-1.5 shadow-xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150 origin-[var(--transform-origin)]">
              <MenuPrimitive.Item
                className={itemClass}
                onClick={() => window.open(shortUrl(link.shortId), "_blank", "noopener")}
              >
                <ExternalLink className="size-3.5" />
                Open short link
              </MenuPrimitive.Item>
              <MenuPrimitive.Item className={itemClass} onClick={() => void handleCopy()}>
                <Copy className="size-3.5" />
                Copy short link
              </MenuPrimitive.Item>
              <MenuPrimitive.Item
                className={itemClass}
                onClick={() => navigate(`/app/analytics?link=${link.id}`)}
              >
                <BarChart3 className="size-3.5" />
                Analytics
              </MenuPrimitive.Item>
              <MenuPrimitive.Item
                className={itemClass}
                onClick={() => navigate(`/app/qr?link=${link.id}`)}
              >
                <QrCode className="size-3.5" />
                QR code
              </MenuPrimitive.Item>

              <MenuPrimitive.Separator className="my-1.5 h-px bg-border" />

              <MenuPrimitive.Item className={itemClass} onClick={() => onEdit(link)}>
                <Pencil className="size-3.5" />
                Edit
              </MenuPrimitive.Item>
              <MenuPrimitive.Item
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-destructive outline-none transition-colors data-[highlighted]:bg-destructive/10"
                onClick={() => onDelete(link)}
              >
                <Trash2 className="size-3.5" />
                Delete…
              </MenuPrimitive.Item>
            </MenuPrimitive.Popup>
          </MenuPrimitive.Positioner>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>
      {onDeleted ? null : null}
    </div>
  );
}

export { LinkActionsMenu };
