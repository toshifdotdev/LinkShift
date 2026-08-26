import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Lock, RefreshCcw, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createQr, deleteQr, downloadQrImage, uploadQrLogo, type QrConfig } from "@/api/qr";
import { listLinks } from "@/api/links";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { getAccessToken } from "@/api/token";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UpgradeHint } from "@/pages/app/links/upgrade-hint";
import { QrPreview } from "./qr-preview";
import { LogoCrop } from "./logo-crop";
import { QR_PRESETS } from "./presets";
import { cn } from "@/lib/utils";
import type { QrResponse } from "@/types/api";
import { shortUrl } from "@/lib/short-url";

const DEFAULT_CONFIG: QrConfig = {
  foregroundColor: "#0D0D0D",
  backgroundColor: "#FFFFFF",
  margin: 2,
  pattern: "square",
  eyeStyle: "square",
  eyeBallStyle: "square",
};

const PATTERNS = [
  { value: "square", label: "Square" },
  { value: "dots", label: "Dots" },
  { value: "rounded", label: "Rounded" },
] as const;

const EYE_STYLES = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
  { value: "extraRounded", label: "Rounded" },
] as const;

const EYE_BALLS = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
] as const;

/** relative luminance contrast ratio — warns below scannable comfort */
function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
    const [r, g, b] = [0, 2, 4].map((i) => {
      const v = Number.parseInt(full.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(hexA);
  const l2 = lum(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function QrStudio({
  open,
  onOpenChange,
  initialLinkId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** when opened from a library card, the link is locked to this one */
  initialLinkId?: string | null;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [linkSearch, setLinkSearch] = useState("");
  const linksQuery = useQuery({
    queryKey: ["links", { picker: linkSearch }],
    queryFn: ({ signal }) =>
      listLinks({ page: 1, limit: 50, search: linkSearch || undefined, sort: "createdAt", order: "desc" }, signal),
    enabled: open,
  });

  const [linkId, setLinkId] = useState<string | null>(initialLinkId ?? null);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setLinkId(initialLinkId ?? null), 0);
    return () => window.clearTimeout(t);
  }, [open, initialLinkId]);

  const selectedLink = useMemo(
    () => linksQuery.data?.data.find((l) => l.id === linkId) ?? null,
    [linksQuery.data, linkId],
  );

  const plan = user?.plan.name ?? "FREE";
  const canBrand = plan === "CREATOR" || plan === "PRO";

  /* ONE canonical design object — drives preview, payload, and save. */
  type StudioDesign = QrConfig & { frame: "none" | "clean" | "double" | "accent" | "label" | "branded" };
  const [design, setDesign] = useState<StudioDesign>({ ...DEFAULT_CONFIG, frame: "none" });
  const [logo, setLogo] = useState<{ url: string; publicId: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [savedQr, setSavedQr] = useState<QrResponse | null>(null);
  const [savedLinkId, setSavedLinkId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [lockMsg, setLockMsg] = useState<string | null>(null);

  /* payload = exact design + logo refs */
  const payload = { ...design, logoUrl: logo?.url, logoPublicId: logo?.publicId };

  const save = useMutation({
    mutationFn: () => createQr(linkId!, payload),
    onSuccess: async (res) => {
      setSavedQr(res.data);
      setSavedLinkId(linkId);
      await queryClient.invalidateQueries({ queryKey: ["qr-gallery"] });
      onSaved?.();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteQr(savedQr!.id),
    onSuccess: async () => {
      setSavedQr(null);
      await queryClient.invalidateQueries({ queryKey: ["qr-gallery"] });
      onSaved?.();
    },
  });

  const uploadingRef = useRef(false);
  async function handleLogo(file: File) {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploadingLogo(true);
    setLogoError(null);
    try {
      /* LogoCrop already outputs a cropped, upload-ready square PNG */
      const res = await uploadQrLogo(file);
      setLogo({ url: res.logUrl, publicId: res.logoPublicId });
      setCropSrc(null); // clear the crop only after a successful upload
    } catch (err) {
      /* keep cropSrc — the user can retry Apply without re-picking */
      setLogoError(
        err instanceof ApiError ? err.message : "Logo upload failed — please try again.",
      );
    } finally {
      uploadingRef.current = false;
      setUploadingLogo(false);
    }
  }

  const contrast = contrastRatio(design.foregroundColor, design.backgroundColor);
  const lowContrast = contrast < 2.5;

  function close() {
    onOpenChange(false);
    setSavedQr(null);
    setLinkId(initialLinkId ?? null);
    setDesign({ ...DEFAULT_CONFIG, frame: "none" });
    setLogo(null);
    setLinkSearch("");
  }

  const quotaError = save.error instanceof ApiError && save.error.status === 403 ? save.error : null;

  /* ---- success panel ---- */
  if (savedQr) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>QR code saved</DialogTitle>
          <p className="mt-1 text-sm text-fg-secondary">
            Persisted and live for <span className="font-mono text-brand">{shortUrl(savedQr.shortId)}</span>
          </p>

          <div className="mt-5 flex justify-center rounded-lg border border-border bg-surface p-5">
            <img src={savedQr.imageUrl} alt="Generated QR code" className="max-h-[320px] w-auto max-w-full rounded-md object-contain" />
          </div>

          <div className="mt-5 grid gap-2">
            <Button
              size="lg"
              className="w-full"
              loading={downloading}
              loadingLabel="Downloading…"
              onClick={() => {
                if (!savedLinkId || !savedQr) return;
                setDownloading(true);
                downloadQrImage(savedLinkId, savedQr.shortId, getAccessToken() ?? "", design.frame)
                  .finally(() => setDownloading(false));
              }}
            >
              Download PNG
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setDesign({ ...DEFAULT_CONFIG, frame: "none" });
                  setSavedQr(null);
                }}
              >
                <RefreshCcw className="size-4" />
                New version
              </Button>
              <Button
                variant="destructive"
                size="lg"
                loading={remove.isPending}
                loadingLabel="Deleting…"
                onClick={() => void remove.mutateAsync()}
              >
                Delete
              </Button>
            </div>
            <Button variant="ghost" onClick={close}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ---- designer ---- */
  const segBtn = (active: boolean) =>
    cn(
      "relative h-8 cursor-pointer rounded-sm px-2.5 text-[12px] font-medium transition-colors",
      active
        ? "border border-border-strong bg-raised text-foreground"
        : "text-fg-muted hover:text-fg-secondary",
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-lg">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle>QR Studio</DialogTitle>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_320px]">
          {/* controls */}
          <div className="flex flex-col gap-5">
            {/* link picker */}
            <Field>
              <FieldLabel>
                {initialLinkId ? "Linked to" : "Choose a link"}
              </FieldLabel>
              {initialLinkId ? (
                selectedLink && (
                  <p className="rounded-md border border-border bg-elevated/60 px-3.5 py-2.5 text-[13px]">
                    {selectedLink.name ?? "Untitled link"}
                    <span className="ml-2 font-mono text-[11px] text-brand">
                      /{selectedLink.shortId}
                    </span>
                  </p>
                )
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-muted" />
                    <Input
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Search your links…"
                      className="h-9 pl-9"
                    />
                  </div>
                  <div className="mt-2 max-h-44 divide-y divide-border overflow-y-auto rounded-md border border-border">
                    {linksQuery.isPending && (
                      <p className="px-3.5 py-3 text-xs text-fg-muted">Loading links…</p>
                    )}
                    {linksQuery.data?.data.length === 0 && (
                      <p className="px-3.5 py-3 text-xs text-fg-muted">
                        No links found — create one in Links first.
                      </p>
                    )}
                    {linksQuery.data?.data.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLinkId(l.id)}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-elevated/60",
                          linkId === l.id && "bg-elevated",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] text-foreground">
                            {l.name ?? "Untitled link"}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-fg-muted">
                            /{l.shortId}
                          </span>
                        </span>
                        {linkId === l.id && <Check className="size-4 shrink-0 text-brand" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Field>

            {/* presets */}
            <Field>
              <FieldLabel>Presets</FieldLabel>
              <div className="grid grid-cols-4 gap-2">
                {QR_PRESETS.map((p) => {
                  const active =
                    design.foregroundColor === p.config.foregroundColor &&
                    design.backgroundColor === p.config.backgroundColor &&
                    design.margin === p.config.margin &&
                    design.pattern === p.config.pattern &&
                    design.eyeStyle === p.config.eyeStyle &&
                    design.eyeBallStyle === p.config.eyeBallStyle &&
                    design.frame === (p.frame ?? "none");
                  const locked = !!p.frame && !canBrand;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          setLockMsg(`The "${p.name}" preset includes a frame — Creator and Pro plans only.`);
                          return;
                        }
                        setLockMsg(null);
                        setDesign({ ...DEFAULT_CONFIG, ...p.config, frame: p.frame ?? "none" });
                      }}
                      className={cn(
                        "group relative cursor-pointer rounded-md border p-2 transition-colors",
                        locked
                          ? "border-border opacity-60"
                          : active
                            ? "border-brand/60 bg-brand/[0.06]"
                            : "border-border hover:border-border-strong",
                      )}
                      aria-pressed={active}
                    >
                      <PresetThumb
                        fg={p.config.foregroundColor}
                        bg={p.config.backgroundColor}
                        pattern={p.config.pattern}
                        frame={p.frame ?? "none"}
                      />
                      <span className="mt-1.5 block text-center text-[10px] text-fg-secondary">
                        {p.name}
                        {locked && <span className="ml-1 text-brand">🔒</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* colors */}
            <Field>
              <FieldLabel>Colors</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2">
                  <input
                    type="color"
                    value={design.foregroundColor}
                    onChange={(e) => setDesign((d) => ({ ...d, foregroundColor: e.target.value }))}
                    className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label="Foreground color"
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] text-fg-muted uppercase">Code</span>
                    <span className="block font-mono text-[11px] text-foreground">
                      {design.foregroundColor}
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2">
                  <input
                    type="color"
                    value={design.backgroundColor}
                    onChange={(e) => setDesign((d) => ({ ...d, backgroundColor: e.target.value }))}
                    className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label="Background color"
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] text-fg-muted uppercase">Background</span>
                    <span className="block font-mono text-[11px] text-foreground">
                      {design.backgroundColor}
                    </span>
                  </span>
                </label>
              </div>
              {lowContrast && (
                <FieldHint>
                  Contrast ratio {contrast.toFixed(1)}:1 — scanners prefer ≥ 3:1 between code and
                  background.
                </FieldHint>
              )}
            </Field>

            {/* pattern */}
            <Field>
              <FieldLabel>Pattern</FieldLabel>
              <div role="radiogroup" aria-label="Pattern style" className="flex gap-2">
                {PATTERNS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={design.pattern === p.value}
                    onClick={() => setDesign((d) => ({ ...d, pattern: p.value }))}
                    className={segBtn(design.pattern === p.value)}
                  >
                    <PatternGlyph kind={p.value} active={design.pattern === p.value} />
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* eyes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Corner style</FieldLabel>
                <div role="radiogroup" aria-label="Corner square style" className="flex flex-wrap gap-2">
                  {EYE_STYLES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={design.eyeStyle === p.value}
                      onClick={() => setDesign((d) => ({ ...d, eyeStyle: p.value }))}
                      className={segBtn(design.eyeStyle === p.value)}
                    >
                      <EyeGlyph kind={p.value} active={design.eyeStyle === p.value} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field>
                <FieldLabel>Eye center</FieldLabel>
                <div role="radiogroup" aria-label="Eye ball style" className="flex gap-2">
                  {EYE_BALLS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={design.eyeBallStyle === p.value}
                      onClick={() => setDesign((d) => ({ ...d, eyeBallStyle: p.value }))}
                      className={segBtn(design.eyeBallStyle === p.value)}
                    >
                      <EyeBallGlyph kind={p.value} active={design.eyeBallStyle === p.value} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* margin */}
            <Field>
              <FieldLabel htmlFor="qr-margin">Quiet zone</FieldLabel>
              <input
                id="qr-margin"
                type="range"
                min={0}
                max={6}
                value={design.margin}
                onChange={(e) => setDesign((d) => ({ ...d, margin: Number(e.target.value) }))}
                className="w-full accent-[#E8590C]"
              />
              <FieldHint>{design.margin} modules of silence around the code.</FieldHint>
            </Field>

            {/* frame — Creator/Pro, enforced server-side at download */}
            <Field>
              <FieldLabel>
                Frame
                {!canBrand && (
                  <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-brand uppercase">
                    <Lock className="size-2.5" /> Creator/Pro
                  </span>
                )}
              </FieldLabel>
              <div role="radiogroup" aria-label="Frame style" className="flex flex-wrap gap-2">
                {([
                  ["none", "None"],
                  ["clean", "Clean"],
                  ["double", "Double"],
                  ["accent", "Accent"],
                  ["label", "Scan me"],
                  ["branded", "Branded"],
                ] as Array<["none" | "clean" | "double" | "accent" | "label" | "branded", string]>).map(([value, label]) => {
                  const locked = value !== "none" && !canBrand;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={design.frame === value}
                      onClick={() => {
                        if (locked) {
                          setLockMsg("QR frames — Creator and Pro plans only.");
                          return;
                        }
                        setLockMsg(null);
                        setDesign((d) => ({ ...d, frame: value }));
                      }}
                      className={segBtn(design.frame === value)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <FieldHint>
                {design.frame === "label" || design.frame === "branded"
                  ? "A scan-me bar is composed into the saved QR."
                  : design.frame === "double" || design.frame === "accent"
                    ? "A border is composed into the saved QR."
                    : "Rendered into the saved QR by the backend."}
              </FieldHint>
            </Field>

            {lockMsg && <UpgradeHint feature={lockMsg} requirement="Creator or Pro" />}

            {/* logo — Creator/Pro (server-enforced) */}
            <Field>
              <FieldLabel>
                Logo
                {!canBrand && (
                  <span className="ml-2 inline-flex items-center gap-1 font-mono text-[9px] tracking-wide text-brand uppercase">
                    <Lock className="size-2.5" /> Creator/Pro
                  </span>
                )}
              </FieldLabel>
              {logoError && <FieldError>{logoError}</FieldError>}
              {!canBrand ? (
                <UpgradeHint
                  feature="Place your brand mark inside the QR code."
                  requirement="Creator or Pro"
                />
              ) : cropSrc ? (
                <LogoCrop
                  src={cropSrc}
                  onCancel={() => setCropSrc(null)}
                  onApply={(file) => void handleLogo(file)}
                />
              ) : logo ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
                  <img src={logo.url} alt="Logo preview" className="size-10 rounded object-contain" />
                  <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg-muted">
                    {logo.publicId}
                  </p>
                  <button
                    type="button"
                    aria-label="Remove logo"
                    onClick={() => setLogo(null)}
                    className="flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-dashed border-border px-3.5 py-3 text-left transition-colors hover:border-border-strong disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <RefreshCcw className="size-4 animate-spin text-fg-muted" />
                  ) : (
                    <ImagePlus className="size-4 text-fg-muted" />
                  )}
                  <span className="text-[13px] text-fg-secondary">
                    {uploadingLogo ? "Cropping & uploading…" : "Upload a logo (center-cropped to a square)"}
                  </span>
                </button>
              )}
              {canBrand && (
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  /* some Windows/浏览器 quirk: image/jpg or empty type —
                     fall back to the extension for the check */
                  const isImage = /^image\/(png|jpeg|jpg|webp)$/.test(f.type) || (/^image\//.test(f.type) && /\.(png|jpe?g|webp)$/i.test(f.name));
                  if (!isImage) {
                    setLogoError("Only PNG, JPEG or WebP images are supported.");
                    return;
                  }
                  if (f.size > 8 * 1024 * 1024) {
                    setLogoError("Image is too large — pick one under 8 MB.");
                    return;
                  }
                  setLogoError(null);
                  const reader = new FileReader();
                  reader.onload = () => setCropSrc(String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
              )}
            </Field>
          </div>

          {/* preview column */}
          <div className="lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase">
                Live preview
              </p>
              {selectedLink ? (
                <>
                  <div className="rounded-md bg-background p-4">
                    <QrPreview config={payload} shortId={selectedLink.shortId} frame={design.frame} className="mx-auto max-w-[260px]" />
                  </div>
                  <p className="mt-4 truncate text-center font-mono text-[11px]">
                    <span className="text-fg-muted">go.linkshift.in/</span>
                    <span className="text-brand">{selectedLink.shortId}</span>
                  </p>
                  {lowContrast && (
                    <p className="mt-2 text-center text-[11px] text-amber-300/90">
                      Low contrast — scanners may struggle.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-fg-muted">Pick a link to begin</p>
                  <p className="max-w-[200px] text-xs text-fg-muted/70">
                    The preview renders exactly what the saved QR will look like.
                  </p>
                </div>
              )}
            </div>

          </div>

          {quotaError && (
            <div className="px-5 pb-1">
              <UpgradeHint feature={quotaError.message} requirement="a higher plan" />
            </div>
          )}
        </div>
        </div>

        {/* action bar — always visible, outside the scroll area */}
        <div className="shrink-0 border-t border-border p-4">
          {save.error && !quotaError && (
            <p role="alert" className="mb-2.5 text-xs text-destructive">
              {save.error instanceof Error ? save.error.message : "Could not generate the QR."}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] tracking-[0.12em] text-fg-muted uppercase">
              {user?.plan.name ?? "FREE"} plan
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                disabled={!selectedLink}
                loading={save.isPending}
                loadingLabel="Generating…"
                onClick={() => save.mutate()}
              >
                Generate & save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { QrStudio };


/* ---- control glyphs ---- */
function PatternGlyph({ kind, active }: { kind: "square" | "dots" | "rounded"; active: boolean }) {
  const fill = "currentColor";
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      {kind === "dots" ? (
        <>
          <circle cx="2.5" cy="2.5" r="1.6" fill={fill} />
          <circle cx="6" cy="2.5" r="1.6" fill={fill} />
          <circle cx="9.5" cy="2.5" r="1.6" fill={fill} />
          <circle cx="2.5" cy="6" r="1.6" fill={fill} opacity={active ? 1 : 0.5} />
          <circle cx="6" cy="6" r="1.6" fill={fill} opacity={active ? 1 : 0.5} />
          <circle cx="9.5" cy="6" r="1.6" fill={fill} opacity={active ? 1 : 0.5} />
        </>
      ) : kind === "rounded" ? (
        <>
          <rect x="1" y="1" width="3" height="3" rx="1" fill={fill} />
          <rect x="4.5" y="1" width="3" height="3" rx="1" fill={fill} />
          <rect x="8" y="1" width="3" height="3" rx="1" fill={fill} />
          <rect x="1" y="4.5" width="3" height="3" rx="1" fill={fill} opacity={active ? 1 : 0.5} />
          <rect x="4.5" y="4.5" width="3" height="3" rx="1" fill={fill} opacity={active ? 1 : 0.5} />
        </>
      ) : (
        <>
          <rect x="1" y="1" width="3" height="3" fill={fill} />
          <rect x="4.5" y="1" width="3" height="3" fill={fill} />
          <rect x="8" y="1" width="3" height="3" fill={fill} />
          <rect x="1" y="4.5" width="3" height="3" fill={fill} opacity={active ? 1 : 0.5} />
          <rect x="4.5" y="4.5" width="3" height="3" fill={fill} opacity={active ? 1 : 0.5} />
        </>
      )}
    </svg>
  );
}

function EyeGlyph({ kind, active }: { kind: "square" | "dot" | "extraRounded"; active: boolean }) {
  const stroke = "currentColor";
  const rx = kind === "square" ? 0 : kind === "dot" ? 4 : 3;
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx={rx} fill="none" stroke={stroke} strokeWidth="1.8" />
      <rect x="4" y="4" width="4" height="4" rx={kind === "square" ? 0 : 2} fill={stroke} opacity={active ? 1 : 0.55} />
    </svg>
  );
}

function EyeBallGlyph({ kind, active }: { kind: "square" | "dot"; active: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx={kind === "square" ? 1 : 4.5} fill="none" stroke="currentColor" strokeWidth="1.5" opacity={active ? 1 : 0.5} />
      {kind === "dot" ? (
        <circle cx="6" cy="6" r="2" fill="currentColor" opacity={active ? 1 : 0.5} />
      ) : (
        <rect x="4.2" y="4.2" width="3.6" height="3.6" fill="currentColor" opacity={active ? 1 : 0.5} />
      )}
    </svg>
  );
}


/* ---- preset mini preview: real colors/pattern + frame hint ---- */
function PresetThumb({
  fg,
  bg,
  pattern,
  frame,
}: {
  fg: string;
  bg: string;
  pattern: "square" | "dots" | "rounded";
  frame: "none" | "clean" | "double" | "accent" | "label" | "branded";
}) {
  const frameStyle =
    frame === "clean"
      ? { border: `2px solid ${fg}` }
      : frame === "double"
        ? { border: `2px solid ${fg}`, boxShadow: `inset 0 0 0 2px ${bg}, inset 0 0 0 3px ${fg}` }
        : frame === "accent"
          ? { border: `4px solid #E8590C` }
          : frame === "label"
            ? { border: `2px solid ${fg}` }
            : frame === "branded"
              ? { border: `3px solid #E8590C` }
              : { border: `1px solid rgba(255,255,255,0.08)` };
  const radius = frame === "none" ? 3 : frame === "branded" ? 8 : 6;

  const cells = Array.from({ length: 12 });
  const round = pattern === "dots" ? "50%" : pattern === "rounded" ? 2 : 1;

  return (
    <span
      aria-hidden="true"
      className="relative block h-10 w-full overflow-hidden"
      style={{ background: bg, borderRadius: radius, ...frameStyle }}
    >
      <span className="absolute inset-1 flex flex-col justify-between">
        {[0, 1, 2].map((row) => (
          <span key={row} className="flex justify-between">
            {cells.slice(0, 6).map((_, col) => (
              <span
                key={col}
                style={{
                  background: fg,
                  width: (row + col) % 3 === 0 ? 5 : 4,
                  height: (row + col) % 3 === 0 ? 5 : 4,
                  borderRadius: round,
                  opacity: (row * 6 + col) % 4 === 1 ? 0.45 : 0.9,
                }}
              />
            ))}
          </span>
        ))}
      </span>
      {(frame === "label" || frame === "branded") && (
        <span
          className="absolute inset-x-0 bottom-0 flex items-center justify-center font-mono text-[6px] font-semibold tracking-[0.2em] text-white"
          style={{ background: frame === "branded" ? "#E8590C" : fg, height: 10 }}
        >
          SCAN ME
        </span>
      )}
    </span>
  );
}
