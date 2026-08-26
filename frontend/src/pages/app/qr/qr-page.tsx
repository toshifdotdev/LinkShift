import { useQuery } from "@tanstack/react-query";
import { Download, ImagePlus, QrCode, Search } from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listLinks } from "@/api/links";
import { downloadQrImage, fetchQrImage } from "@/api/qr";
import { getAccessToken } from "@/api/token";
import { ApiError } from "@/api/client";
import { PageHeader, EmptyState, ErrorState } from "@/components/app/page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { QrStudio } from "./qr-studio";
import { cn } from "@/lib/utils";

/* ---- authenticated QR thumbnail (blob-based; <img> can't send headers) ---- */
function QrThumbnail({ linkId, version }: { linkId: string; version: number }) {
  const img = useQuery({
    queryKey: ["qr-img", linkId, version],
    queryFn: ({ signal }) => fetchQrImage(linkId, getAccessToken() ?? "", signal),
    staleTime: Infinity,
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });

  if (img.isPending) {
    return <Skeleton className="h-44 w-full rounded-md" />;
  }
  if (img.error instanceof ApiError && img.error.status === 404) {
    return (
      <div className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background/40">
        <ImagePlus className="size-4 text-fg-muted" aria-hidden="true" />
        <p className="font-mono text-[9px] tracking-[0.14em] text-fg-muted uppercase">No QR yet</p>
      </div>
    );
  }
  if (img.isError) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-md border border-destructive/30 bg-destructive/5">
        <p className="font-mono text-[9px] tracking-[0.14em] text-destructive uppercase">Load failed</p>
      </div>
    );
  }
  return (
    <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-md bg-white p-2">
      <img src={img.data.url} alt="" className="max-h-full max-w-full object-contain" />
    </div>
  );
}

function QrPage() {
  const { toast } = useToaster();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [galleryVersion, setGalleryVersion] = useState(0);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioLink, setStudioLink] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const links = useQuery({
    queryKey: ["qr-gallery-links", debounced],
    queryFn: ({ signal }) =>
      listLinks({ page: 1, limit: 100, search: debounced || undefined, sort: "createdAt", order: "desc" }, signal),
  });

  const rows = links.data?.data ?? [];
  const hasLinks = (links.data?.pagination.totalRecords ?? 0) > 0;

  function openStudio(linkId?: string) {
    setStudioLink(linkId ?? null);
    setStudioOpen(true);
  }

  async function handleDownload(linkId: string, shortId: string) {
    if (downloadingId) return;
    setDownloadingId(linkId);
    try {
      await downloadQrImage(linkId, shortId, getAccessToken() ?? "");
      toast({ title: "QR downloaded", description: `linkshift-${shortId}.png`, variant: "success" });
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof ApiError && err.status === 404 ? "Generate a QR code first." : err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="QR Codes"
        description="Design, generate and manage QR codes for your links — every code stays in sync with its destination."
        action={
          <Button size="md" onClick={() => openStudio()}>
            <QrCode className="size-4" />
            New QR code
          </Button>
        }
      />

      {links.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Loading QR codes">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-2.5">
              <Skeleton className="h-44 w-full rounded-md" />
              <Skeleton className="mt-2.5 h-3.5 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : links.isError ? (
        <ErrorState
          title="Couldn't load your QR library"
          message={links.error instanceof Error ? links.error.message : undefined}
          onRetry={() => void links.refetch()}
        />
      ) : !hasLinks ? (
        <EmptyState
          icon={<QrCode className="size-5" />}
          title="No links to decorate yet"
          description="QR codes belong to links. Create your first link and a matching, fully styled QR code is one click away."
          action={
            <a
              href="/app/links"
              className="inline-flex h-9 items-center rounded-md border border-brand/40 bg-brand/[0.09] px-4 font-mono text-[11px] font-medium tracking-[0.08em] text-foreground uppercase transition-colors hover:border-brand/75 hover:bg-brand/[0.16]"
            >
              Go to Links
            </a>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search links…"
                aria-label="Search links for QR codes"
                className="h-9 pl-9"
              />
            </div>
            <p className="hidden font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase sm:block">
              {rows.length} link{rows.length === 1 ? "" : "s"}
            </p>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No links match"
              description="Nothing matches that search."
              action={
                <Button variant="outline" size="md" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {rows.map((link) => (
                <article
                  key={link.id}
                  className="group flex flex-col rounded-lg border border-border bg-surface p-2.5 transition-colors hover:border-border-strong"
                >
                  <QrThumbnail linkId={link.id} version={galleryVersion} />

                  <div className="mt-2.5 min-w-0">
                    <p className="truncate text-[12px] font-medium text-foreground">
                      {link.name ?? "Untitled link"}
                    </p>
                    <p className="truncate font-mono text-[10px]">
                      <span className="text-fg-muted">go.linkshift.in/</span>
                      <span className="text-brand">{link.shortId}</span>
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-border pt-2.5">
                    <Button variant="secondary" size="sm" className="h-7 flex-1 px-2 text-[11px]" onClick={() => openStudio(link.id)}>
                      Studio
                    </Button>
                    <button
                      type="button"
                      aria-label={`Download QR for ${link.name ?? link.shortId}`}
                      disabled={downloadingId === link.id}
                      onClick={() => void handleDownload(link.id, link.shortId)}
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-foreground",
                        downloadingId === link.id && "animate-pulse text-brand",
                      )}
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {hasLinks && rows.length > 0 && (
            <p className="mt-4 border-t border-border pt-3.5 font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
              Thumbnails show each link's latest code · studio saves create a new version
            </p>
          )}
        </>
      )}

      <QrStudio
        open={studioOpen}
        onOpenChange={setStudioOpen}
        initialLinkId={studioLink}
        onSaved={() => setGalleryVersion((v) => v + 1)}
      />
    </>
  );
}

export { QrPage };
