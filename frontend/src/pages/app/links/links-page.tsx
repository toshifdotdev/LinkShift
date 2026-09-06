import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteLink, listLinks, type ListLinksParams } from "@/api/links";
import { Button } from "@/components/ui/button";
import { CodeChip } from "@/components/ui/code-chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { Lamp } from "@/components/ui/lamp";
import { Pagination } from "@/components/ui/pagination";
import { RouteStrip } from "@/components/ui/route-strip";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { FlashSweep } from "@/components/ui/motion";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import { CreateLinkDialog } from "./create-link-dialog";
import { EditLinkDialog } from "./edit-link-dialog";
import { LinksLedger } from "./links-ledger";
import { LinksToolbar } from "./links-toolbar";
import type { LinkItem } from "@/types/api";

const PAGE_SIZE = 10;

function LinksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const [searchParams, setSearchParams] = useSearchParams();

  
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? undefined) as ListLinksParams["status"];
  const sort = (searchParams.get("sort") ?? "createdAt") as NonNullable<ListLinksParams["sort"]>;
  const order = (searchParams.get("order") ?? "desc") as NonNullable<ListLinksParams["order"]>;

  const [searchInput, setSearchInput] = useState(search);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  
  useEffect(() => {
    if (debouncedSearch === search) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function patchParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace: true });
  }

  const listQuery = useQuery({
    queryKey: ["links", { page, limit: PAGE_SIZE, search, status, sort, order }],
    queryFn: ({ signal }) =>
      listLinks({ page, limit: PAGE_SIZE, search, status, sort, order }, signal),
  });

  const links = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination ?? null;
  const hasAnyLinks = (listQuery.data?.pagination.totalRecords ?? 0) > 0;

  
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [deleting, setDeleting] = useState<LinkItem | null>(null);

  function flashHighlight(id: string) {
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2600);
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: async () => {
      toast({ title: "Link deleted", meta: deleting ? `${deleting.domainHost || DEFAULT_SHORT_DOMAIN}/${deleting.shortId}` : undefined, variant: "success" });
      await queryClient.invalidateQueries({ queryKey: ["links"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      setDeleting(null);
    },
    onError: (err) => {
      toast({
        title: "Couldn't delete link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    },
  });

  function handleCreated(link: LinkItem) {
    
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
    setSearchInput("");
    flashHighlight(link.id);
    toast({
      title: "Link created",
      meta: `${link.domainHost || DEFAULT_SHORT_DOMAIN}/${link.shortId}`,
      variant: "success",
    });
  }

  function handleSaved(link: LinkItem) {
    toast({ title: "Changes saved", meta: `${link.domainHost || DEFAULT_SHORT_DOMAIN}/${link.shortId}`, variant: "success" });
    flashHighlight(link.id);
  }

  const createButton = (
    <Button size="md" onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      New link
    </Button>
  );

  return (
    <>
      <RouteStrip
        index="02"
        label="Links"
        title="Every route you own, on one ledger."
        description="Create, inspect, and manage your short links from a single desk."
        action={createButton}
        meta={
          !listQuery.isPending && !listQuery.isError ? (
            <Lamp tone="neutral">{pagination?.totalRecords ?? 0} links on file</Lamp>
          ) : undefined
        }
      />

      <div className="mt-8">
        {listQuery.isPending ? (
          <div className="ls-plate overflow-hidden">
            <div className="border-b border-border-subtle px-5 py-3">
              <p className="ls-marquee">Ledger</p>
            </div>
            <div className="p-5">
              <SkeletonRows rows={6} />
            </div>
          </div>
        ) : listQuery.isError ? (
          <ErrorState
            title="Couldn't load your links"
            message={listQuery.error instanceof Error ? listQuery.error.message : undefined}
            onRetry={() => void listQuery.refetch()}
          />
        ) : !hasAnyLinks ? (
          <EmptyState
            marquee="First link"
            title="Your first link is thirty seconds away."
            description="LinkShift turns long URLs into trackable short links with matching QR codes. Make your first one below."
            action={createButton}
          />
        ) : (
          <>
            <div className="mb-5">
              <LinksToolbar
                search={searchInput}
                onSearch={setSearchInput}
                status={status}
                onStatus={(v) => patchParams((n) => (v ? n.set("status", v) : n.delete("status")))}
                sort={sort}
                order={order}
                onSort={(s, o) =>
                  patchParams((n) => {
                    n.set("sort", s);
                    n.set("order", o);
                    n.delete("page");
                  })
                }
              />
            </div>

            {links.length === 0 ? (
              <EmptyState
                marquee="Filtered"
                title="No links match"
                description="Nothing matches the current search and filters."
                action={
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setSearchInput("");
                      setSearchParams({}, { replace: true });
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="ls-plate relative overflow-hidden">
                <span aria-hidden="true" className="ls-stripe" />
                <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
                  <p className="ls-marquee">Ledger</p>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                    {pagination?.totalRecords ?? 0} total
                  </span>
                </header>
                <div className="relative">
                  {highlightId && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    >
                      <FlashSweep trigger={highlightId} className="block h-px" />
                    </div>
                  )}
                  <LinksLedger
                    links={links}
                    highlightId={highlightId}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
                </div>
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <p className="font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
                  {pagination.totalRecords} links
                </p>
                <Pagination
                  page={page}
                  pageCount={pagination.totalPages}
                  onPageChange={(p) => patchParams((n) => n.set("page", String(p)))}
                />
              </div>
            )}
          </>
        )}
      </div>

      <CreateLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {editing && (
        <EditLinkDialog
          key={editing.id}
          link={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this link?"
        description={
          deleting ? (
            <>
              <CodeChip prefix={`${deleting.domainHost || DEFAULT_SHORT_DOMAIN}/`}>{deleting.shortId}</CodeChip>{" "}
              stops resolving immediately. Its QR codes and full scan history are removed for good.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete link"
        cancelLabel="Keep link"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
        if (deleting) void deleteMutation.mutateAsync(deleting.id);
      }}
      />
    </>
  );
}

export { LinksPage };
