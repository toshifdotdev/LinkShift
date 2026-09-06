import { CodeChip } from "@/components/ui/code-chip";
import { Lamp } from "@/components/ui/lamp";
import { Ledger, type LedgerColumn } from "@/components/ui/ledger";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import type { LinkItem } from "@/types/api";
import { LinkActionsMenu } from "./link-actions-menu";
import { formatDate, hostOf, isExpired } from "./utils";

function StatusLamp({ link }: { link: LinkItem }) {
  if (isExpired(link)) return <Lamp tone="warning">Expired</Lamp>;
  if (link.isActive) return <Lamp tone="success">Active</Lamp>;
  return <Lamp tone="dim">Inactive</Lamp>;
}

function LinksLedger({
  links,
  highlightId,
  onEdit,
  onDelete,
}: {
  links: LinkItem[];
  highlightId: string | null;
  onEdit: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
}) {
  const columns: LedgerColumn<LinkItem>[] = [
    {
      id: "link",
      header: "Link",
      cardLabel: "Link",
      cell: (link) => (
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="max-w-full truncate text-[13px] font-medium text-foreground">
            {link.name ?? "Untitled link"}
          </span>
          <CodeChip truncate prefix={`${link.domainHost || DEFAULT_SHORT_DOMAIN}/`}>
            {link.shortId}
          </CodeChip>
        </span>
      ),
    },
    {
      id: "destination",
      header: "Destination",
      cardLabel: "Goes to",
      cell: (link) => (
        <span className="block max-w-52 truncate font-mono text-[11px] text-fg-muted" title={link.targetUrl}>
          {hostOf(link.targetUrl)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cardLabel: "Status",
      cell: (link) => <StatusLamp link={link} />,
    },
    {
      id: "clicks",
      header: "Clicks",
      align: "right",
      cardLabel: "Clicks",
      cell: (link) => (
        <span className="font-mono text-sm tabular-nums text-foreground">
          {link.clicks.toLocaleString()}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      align: "right",
      cardLabel: "Created",
      cell: (link) => (
        <span className="font-mono text-[11px] text-fg-muted">{formatDate(link.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cardLabel: "Actions",
      cell: (link) => <LinkActionsMenu link={link} onEdit={onEdit} onDelete={onDelete} />,
    },
  ];

  return (
    <Ledger
      rows={links}
      columns={columns}
      rowKey={(link) => link.id}
      rowClassName={(link) =>
        highlightId === link.id
          ? "relative bg-brand/[0.04] after:absolute after:inset-y-1.5 after:left-0 after:w-px after:bg-brand"
          : undefined
      }
    />
  );
}

export { LinksLedger, StatusLamp };
