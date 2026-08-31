import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Download, ImagePlus, QrCode, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listLinks } from "@/api/links";
import { downloadQrImage, fetchQrImage } from "@/api/qr";
import { getAccessToken } from "@/api/token";
import { ApiError } from "@/api/client";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { CodeChip } from "@/components/ui/code-chip";
import { EmptyState, ErrorState } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { RouteStrip } from "@/components/ui/route-strip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToaster } from "@/components/ui/toaster";
import { QrStudio } from "./qr-studio";
import { cn } from "@/lib/utils";
import { DEFAULT_SHORT_DOMAIN } from "@/lib/short-url";
import type { LinkItem } from "@/types/api";

const PAGE_SIZE = 50;

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

  /* The gallery grows with the account, so page through links instead of a
     fixed 100-item cap — an observer fetches the next page on scroll. */
  const links = useInfiniteQuery({
    queryKey: ["qr-gallery-links", debounced],
    queryFn: ({ signal, pageParam }) =>
      listLinks(
        { page: pageParam, limit: PAGE_SIZE, search: debounced || undefined, sort: "createdAt", order: "desc" },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined),
  });

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const all: LinkItem[] = [];
    for (const page of links.data?.pages ?? []) {
      for (const link of page.data) {
        if (!seen.has(link.id)) {
          seen.add(link.id);
          all.push(link);
        }
      }
    }
    return all;
  }, [links.data]);

  const totalRecords = links.data?.pages[0]?.pagination.totalRecords ?? 0;
  const hasLinks = totalRecords > 0;
  const partialError = links.isError && links.data !== undefined;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = links;

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || partialError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, partialError, rows.length]);

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
      <RouteStrip
        index="03"
        label="QR Codes"
        title="Every code, in your brand."
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
            <div key={i} className="ls-plate p-2.5">
              <Skeleton className="h-44 w-full rounded-md" />
              <Skeleton className="mt-2.5 h-3.5 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : links.isError && !links.data ? (
        <ErrorState
          title="Couldn't load your QR library"
          message={links.error instanceof Error ? links.error.message : undefined}
          onRetry={() => void links.refetch()}
        />
      ) : !hasLinks && !debounced ? (
        <EmptyState
          marquee="QR library"
          title="No links to decorate yet"
          description="QR codes belong to links. Create your first link and a matching, fully styled QR code is one click away."
          action={
            <Link to="/app/links">
              <Button variant="secondary" size="md">
                Go to Links
              </Button>
            </Link>
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
              {totalRecords} link{totalRecords === 1 ? "" : "s"}
            </p>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              marquee="No matches"
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
                  className="group ls-plate flex flex-col p-2.5 transition-colors hover:border-border-strong"
                >
                  <QrThumbnail linkId={link.id} version={galleryVersion} />

                  <div className="mt-2.5 min-w-0">
                    <p className="truncate text-[12px] font-medium text-foreground">
                      {link.name ?? "Untitled link"}
                    </p>
                    <CodeChip truncate prefix={`${link.domainHost || DEFAULT_SHORT_DOMAIN}/`} className="mt-1">
                      {link.shortId}
                    </CodeChip>
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
                        downloadingId === link.id && "motion-safe:animate-pulse motion-reduce:animate-none text-brand",
                      )}
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {partialError ? (
            <Banner
              tone="destructive"
              className="mt-4"
              action={
                <Button variant="outline" size="sm" onClick={() => void fetchNextPage()}>
                  Retry
                </Button>
              }
            >
              Couldn't load more links.
            </Banner>
          ) : hasNextPage || isFetchingNextPage ? (
            <div ref={sentinelRef} className="mt-4 flex items-center justify-center" aria-live="polite">
              <p className="font-mono text-[10px] tracking-[0.12em] text-fg-muted uppercase">
                {isFetchingNextPage ? "Loading more codes…" : "Scroll to load more"}
              </p>
            </div>
          ) : null}

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
