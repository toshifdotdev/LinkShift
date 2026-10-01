import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Download, Upload } from "lucide-react";

import {
  commitLinkImport,
  previewLinkImport,
  type ImportLinkRow,
  type ImportResult,
} from "@/api/link-import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDomains } from "@/hooks/use-domains";
import { useToaster } from "@/components/ui/toaster";
import {
  autoMapColumns,
  buildImportRows,
  CsvError,
  IMPORT_TEMPLATE,
  parseCsv,
  type CsvMapping,
  type CsvParseResult,
  type MappedImportRow,
} from "@/lib/import-csv";
import { cn } from "@/lib/utils";

/**
 * Bulk link import.
 *
 * Two-phase on purpose. The file is parsed in the browser, then every row is
 * sent as a dry run so the server reports exactly what it would do — which
 * rows fail and why — before anything is written. The plan link ceiling
 * hard-stops the whole batch, so surfacing that after committing would leave
 * the user with a half-migrated site.
 *
 * Slugs are single path segments (`about`, not `blog/about`). A stored link is
 * matched on host plus one segment, so a nested old path has to be flattened by
 * whoever writes the file. The helper text says so rather than letting someone
 * discover it from a 404.
 */

const REJECTION_COPY: Record<string, string> = {
  DUPLICATE_IN_FILE: "Duplicate in file",
  SLUG_TAKEN: "Slug already used",
  LIMIT_REACHED: "Plan limit reached",
  INVALID_ROW: "Not a valid link",
};

type Step = "pick" | "mapped" | "review" | "done";

export function ImportLinksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToaster();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({
    urlColumn: null,
    slugColumn: null,
    nameColumn: null,
  });
  const [domainId, setDomainId] = useState<string>("");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [committed, setCommitted] = useState<ImportResult | null>(null);

  const { data: domains = [] } = useDomains({ enabled: open });

  // Only verified domains can serve a redirect, so offering an unverified one
  // would produce links that 403 on the first click.
  const usableDomains = useMemo(
    () => domains.filter((domain) => domain.verified),
    [domains]
  );

  const rows: MappedImportRow[] = useMemo(() => {
    if (!parsed) return [];
    try {
      return buildImportRows(parsed, mapping);
    } catch {
      return [];
    }
  }, [parsed, mapping]);

  const reset = useCallback(() => {
    setStep("pick");
    setFileName("");
    setParseError(null);
    setParsed(null);
    setMapping({ urlColumn: null, slugColumn: null, nameColumn: null });
    setPreview(null);
    setCommitted(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const close = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const payload = useCallback((): ImportLinkRow[] => {
    return rows.map(({ targetUrl, slug, name }) => ({
      targetUrl,
      ...(slug ? { slug } : {}),
      ...(name ? { name } : {}),
    }));
  }, [rows]);

  const previewMutation = useMutation({
    mutationFn: () => previewLinkImport(domainId, payload()),
    onSuccess: (result) => {
      setPreview(result);
      setStep("review");
    },
    onError: (error) =>
      setParseError(error instanceof Error ? error.message : "Import failed."),
  });

  const commitMutation = useMutation({
    mutationFn: () => commitLinkImport(domainId, payload()),
    onSuccess: (result) => {
      setCommitted(result);
      setStep("done");
      // The links list and dashboard totals both changed.
      void queryClient.invalidateQueries({ queryKey: ["links"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (error) =>
      setParseError(error instanceof Error ? error.message : "Import failed."),
  });

  const onFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setFileName(file.name);
      try {
        const text = await file.text();
        const result = parseCsv(text);
        setParsed(result);
        setMapping(autoMapColumns(result.header));
        setStep("mapped");
      } catch (error) {
        setParsed(null);
        setParseError(
          error instanceof CsvError ? error.message : "That file could not be read."
        );
      }
    },
    []
  );

  const targetDomain = usableDomains.find((d) => d.id === domainId);
  const autoDomainId = targetDomain?.id ?? usableDomains[0]?.id ?? "";
  const effectiveDomainId = domainId || autoDomainId;

  const canPreview =
    Boolean(effectiveDomainId) && rows.length > 0 && !previewMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Import links from a file</DialogTitle>
        <DialogDescription>
          Move an existing set of addresses onto a domain you own. Every row is
          checked first, so you see what would happen before anything is created.
        </DialogDescription>

        {step === "pick" && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload aria-hidden="true" className="size-3.5" />
                Choose CSV file
              </Button>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(IMPORT_TEMPLATE)}`}
                download="linkshift-import-template.csv"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 font-mono text-[10px] tracking-[0.1em] uppercase transition-colors hover:border-brand/60"
              >
                <Download aria-hidden="true" className="size-3.5" />
                Template
              </a>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
              }}
            />

            <p className="text-xs text-fg-secondary">
              Columns: <code className="font-mono">slug</code>,{" "}
              <code className="font-mono">url</code>, and an optional{" "}
              <code className="font-mono">name</code>. A slug is one path segment,
              so flatten nested paths yourself — <code className="font-mono">blog-about</code>,
              not <code className="font-mono">blog/about</code>.
            </p>

            {parseError && <ImportError message={parseError} />}
          </div>
        )}

        {step === "mapped" && parsed && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-fg-secondary">
              <span className="font-mono text-xs text-fg-muted">{fileName}</span>{" "}
              · {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} read
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <ColumnPicker
                label="Destination URL"
                required
                header={parsed.header}
                value={mapping.urlColumn}
                onChange={(urlColumn) => setMapping((m) => ({ ...m, urlColumn }))}
              />
              <ColumnPicker
                label="Slug"
                header={parsed.header}
                value={mapping.slugColumn}
                onChange={(slugColumn) => setMapping((m) => ({ ...m, slugColumn }))}
              />
              <ColumnPicker
                label="Name"
                header={parsed.header}
                value={mapping.nameColumn}
                onChange={(nameColumn) => setMapping((m) => ({ ...m, nameColumn }))}
              />
            </div>

            {usableDomains.length === 0 ? (
              <ImportError message="Connect and verify a domain before importing. Links need somewhere to live." />
            ) : (
              <label className="block space-y-1.5">
                <span className="text-xs text-fg-secondary">
                  Import onto domain
                </span>
                <select
                  value={effectiveDomainId}
                  onChange={(event) => setDomainId(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {usableDomains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.host}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {parseError && <ImportError message={parseError} />}

            <DialogFooter>
              <Button variant="ghost" onClick={reset}>
                Choose another file
              </Button>
              <Button
                variant="primary"
                disabled={!canPreview}
                onClick={() =>
                  previewMutation.mutate(undefined, {
                    onSuccess: () => undefined,
                  })
                }
              >
                {previewMutation.isPending ? "Checking…" : `Check ${rows.length} rows`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && preview && (
          <div className="mt-5 space-y-4">
            {preview.summary.blocked ? (
              <ImportError message={preview.summary.blocked} />
            ) : (
              <p className="text-sm text-fg-secondary">
                {preview.summary.created} of {preview.summary.total} rows are ready.
                {preview.summary.rejected > 0 && (
                  <>
                    {" "}
                    {preview.summary.rejected} will be skipped.
                  </>
                )}
              </p>
            )}

            {preview.summary.rejected > 0 && (
              <ul className="max-h-56 divide-y divide-border-subtle overflow-auto rounded-md border border-border">
                {preview.results
                  .filter((result) => result.outcome === "rejected")
                  .map((result) => (
                    <li
                      key={result.row}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <span className="font-mono text-[10px] text-fg-muted">
                        row {result.row}
                      </span>
                      <span className="flex-1 text-xs text-fg-secondary">
                        <span className="font-medium text-foreground">
                          {REJECTION_COPY[result.code ?? "INVALID_ROW"] ?? "Rejected"}
                        </span>
                        {result.reason ? ` — ${result.reason}` : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            )}

            {parseError && <ImportError message={parseError} />}

            <DialogFooter>
              <Button variant="ghost" onClick={reset}>
                Start over
              </Button>
              <Button
                variant="primary"
                disabled={
                  Boolean(preview.summary.blocked) ||
                  preview.summary.created === 0 ||
                  commitMutation.isPending
                }
                onClick={() => commitMutation.mutate()}
              >
                {commitMutation.isPending
                  ? "Creating…"
                  : `Create ${preview.summary.created} links`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && committed && (
          <div className="mt-5 space-y-4">
            <p className="flex items-center gap-2 text-sm">
              <Check aria-hidden="true" className="size-4 text-success" />
              {committed.summary.created} link
              {committed.summary.created === 1 ? "" : "s"} created
              {committed.summary.rejected > 0 &&
                `, ${committed.summary.rejected} skipped`}
              .
            </p>

            {committed.results.filter((r) => r.outcome === "rejected").length > 0 && (
              <ul className="max-h-48 divide-y divide-border-subtle overflow-auto rounded-md border border-border">
                {committed.results
                  .filter((result) => result.outcome === "rejected")
                  .map((result) => (
                    <li key={result.row} className="px-3 py-2.5">
                      <span className="font-mono text-[10px] text-fg-muted">
                        row {result.row}
                      </span>{" "}
                      <span className="text-xs text-fg-secondary">
                        {result.reason}
                      </span>
                    </li>
                  ))}
              </ul>
            )}

            <DialogFooter>
              <Button
                variant="primary"
                onClick={() => {
                  toast({ title: "Links imported", description: "They are live now." });
                  close();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-fg-secondary"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 size-3.5 shrink-0 text-destructive"
      />
      {message}
    </p>
  );
}

function ColumnPicker({
  label,
  header,
  value,
  onChange,
  required = false,
}: {
  label: string;
  header: string[];
  value: number | null;
  onChange: (next: number | null) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-fg-secondary">
        {label}
        {required ? " (required)" : " (optional)"}
      </span>
      <select
        value={value === null || value < 0 ? "" : String(value)}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className={cn(
          "h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
        )}
      >
        <option value="">Not mapped</option>
        {header.map((name, index) => (
          <option key={`${name}-${index}`} value={String(index)}>
            {name || `column ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
