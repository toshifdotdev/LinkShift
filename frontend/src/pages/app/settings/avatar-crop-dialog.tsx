import { ImageOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const OUTPUT_SIZE = 512;

interface LoadedImage {
  el: HTMLImageElement;
  url: string;
  w: number;
  h: number;
}

interface DragState {
  px: number;
  py: number;
  size: number;
  fx: number;
  fy: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function AvatarCropDialog({
  file,
  uploadBusy,
  uploadError,
  onRequestClose,
  onCropComplete,
}: {
  file: File | null;
  uploadBusy: boolean;
  uploadError: string | null;
  onRequestClose: () => void;
  onCropComplete: (blob: Blob) => void;
}) {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [fx, setFx] = useState(0);
  const [fy, setFy] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [prevFile, setPrevFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  if (prevFile !== file) {
    setPrevFile(file);
    setImg(null);
    setSrcFile(null);
    setLoadError(null);
    setExportError(null);
  }

  useEffect(() => {
    if (!file) return;
    let active = true;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      const dim = Math.min(w, h);
      setImg({ el: image, url, w, h });
      setSrcFile(file);
      setZoom(MIN_ZOOM);
      setFx((1 - w / dim) / 2);
      setFy((1 - h / dim) / 2);
    };
    image.onerror = () => {
      if (!active) return;
      setLoadError("That image can't be read. Try a different file.");
    };
    image.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const ready = !!img && srcFile === file;
  const busy = exporting || uploadBusy;

  const w = img?.w ?? 0;
  const h = img?.h ?? 0;
  const dim = Math.min(w, h) || 1;
  const u = (w / dim) * zoom;
  const v = (h / dim) * zoom;

  function handleZoomChange(next: number) {
    if (!ready || !img) return;
    const nextZoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
    const k = nextZoom / zoom;
    setZoom(nextZoom);
    setFx(clamp(0.5 - (0.5 - fx) * k, 1 - (w / dim) * nextZoom, 0));
    setFy(clamp(0.5 - (0.5 - fy) * k, 1 - (h / dim) * nextZoom, 0));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!ready) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      void 0;
    }
    const rect = el.getBoundingClientRect();
    dragRef.current = { px: e.clientX, py: e.clientY, size: rect.width, fx, fy };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!ready) return;
    const drag = dragRef.current;
    if (!drag) return;
    const nextFx = clamp(drag.fx + (e.clientX - drag.px) / drag.size, 1 - u, 0);
    const nextFy = clamp(drag.fy + (e.clientY - drag.py) / drag.size, 1 - v, 0);
    drag.fx = nextFx;
    drag.fy = nextFy;
    setFx(nextFx);
    setFy(nextFy);
  }

  function handlePointerEnd() {
    dragRef.current = null;
    setDragging(false);
  }

  function exportCrop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!img) {
        reject(new Error("no image"));
        return;
      }
      const size = dim / zoom;
      const sx = clamp(-fx * size, 0, img.w - size);
      const sy = clamp(-fy * size, 0, img.h - size);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("no context"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img.el, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("export failed"));
      }, "image/png");
    });
  }

  async function handleSave() {
    if (!ready || busy) return;
    setExportError(null);
    setExporting(true);
    try {
      onCropComplete(await exportCrop());
    } catch {
      setExportError("Couldn't prepare the image. Try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && !busy) onRequestClose();
  }

  return (
    <Dialog open={!!file} onOpenChange={handleOpenChange}>
      {file && (
        <DialogContent className="flex max-h-[calc(100dvh-1.25rem)] flex-col overflow-hidden p-0">
          <div className="shrink-0 px-4 pt-5 sm:px-6 sm:pt-6">
            <DialogTitle>Crop your avatar</DialogTitle>
            <DialogDescription>
              Drag to reposition and use the zoom slider to frame the image. The finished avatar
              is a square crop, shown here as a circle.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 sm:px-6">
            <div
              className={cn(
                "relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-18rem))] touch-none overflow-hidden rounded-lg bg-background ring-1 ring-border-strong select-none",
                ready && (dragging ? "cursor-grabbing" : "cursor-grab"),
              )}
              onPointerDown={ready ? handlePointerDown : undefined}
              onPointerMove={ready ? handlePointerMove : undefined}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              {ready && img && (
                <img
                  src={img.url}
                  alt=""
                  draggable={false}
                  className="relative max-w-none"
                  style={{
                    width: `${u * 100}%`,
                    height: `${v * 100}%`,
                    transform: `translate(${(fx / u) * 100}%, ${(fy / v) * 100}%)`,
                  }}
                />
              )}
              {!ready && !loadError && (
                <div className="absolute inset-0 grid place-items-center">
                  <Spinner />
                </div>
              )}
              {loadError && (
                <div className="absolute inset-0 grid place-items-center px-6 text-center">
                  <div className="flex flex-col items-center gap-2 text-fg-muted">
                    <ImageOff className="size-5" />
                    <p className="max-w-[240px] text-xs">{loadError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3 sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-fg-secondary" htmlFor="avatar-crop-zoom">
                    Zoom
                  </label>
                  <span className="font-mono text-[11px] text-fg-muted">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  id="avatar-crop-zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  disabled={!ready || busy}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  className="h-5 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                  style={{ accentColor: "var(--brand)" }}
                />
              </div>

              <div className="relative size-20 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                {ready && img && (
                  <img
                    src={img.url}
                    alt=""
                    draggable={false}
                    className="pointer-events-none relative max-w-none"
                    style={{
                      width: `${u * 100}%`,
                      height: `${v * 100}%`,
                      transform: `translate(${(fx / u) * 100}%, ${(fy / v) * 100}%)`,
                    }}
                  />
                )}
                {!ready && (
                  <div className="absolute inset-0 grid place-items-center bg-background">
                    <Spinner className="size-4" />
                  </div>
                )}
              </div>
            </div>

            {(exportError || uploadError) && (
              <div className="mt-3">
                <FieldError>{exportError ?? uploadError}</FieldError>
              </div>
            )}

            {!ready && !loadError && (
              <p className="mt-4 text-center text-[11px] text-fg-muted">Loading image…</p>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
            <Button variant="ghost" className="h-11 sm:h-9" disabled={busy} onClick={() => onRequestClose()}>
              Cancel
            </Button>
            <Button
              className="h-11 sm:h-9"
              loading={busy}
              loadingLabel={exporting ? "Preparing…" : "Uploading…"}
              disabled={!ready}
              onClick={() => void handleSave()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}

export { AvatarCropDialog };