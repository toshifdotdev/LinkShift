import { useCallback, useRef, useState } from "react";
import { Check, Circle, Crop, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Logo crop step.
 * The image is contained in a fixed box; the user drags the image behind a
 * fixed square mask (position) and scales it with a slider (zoom). Apply
 * renders the masked region from the ORIGINAL bitmap via canvas as a
 * 512×512 PNG and optionally clips it to a circle (transparent corners).
 */
function LogoCrop({
  src,
  onApply,
  onCancel,
}: {
  src: string;
  onApply: (file: File) => void;
  onCancel: () => void;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image-point offset from box center in 0..1 units
  const [shape, setShape] = useState<"square" | "circle">("square");
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const BOX = 288; // display box
  const CROP = 208; // crop square

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  /* displayed image size (contain) */
  const scale = Math.min(BOX / (imgSize.w || 1), BOX / (imgSize.h || 1)) * zoom;
  const dispW = (imgSize.w || 1) * scale;
  const dispH = (imgSize.h || 1) * scale;

  /* clamp pos so the crop square stays over the image */
  const maxX = Math.max(0, (dispW - CROP) / 2) / (dispW || 1);
  const maxY = Math.max(0, (dispH - CROP) / 2) / (dispH || 1);
  const cx = Math.min(maxX, Math.max(-maxX, pos.x));
  const cy = Math.min(maxY, Math.max(-maxY, pos.y));

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, posX: cx, posY: cy };
  }
  function moveDrag(clientX: number, clientY: number) {
    const d = dragRef.current;
    if (!d) return;
    const dx = ((clientX - d.startX) / (dispW || 1));
    const dy = ((clientY - d.startY) / (dispH || 1));
    setPos({ x: d.posX + dx, y: d.posY + dy });
  }

  async function apply() {
    const img = imgRef.current;
    /* Apply stays disabled until the source image has loaded */
    if (!img || !imgSize.w || !imgSize.h) return;

    const out = 512;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d")!;

    /* ONE source of truth — the exact source square under the crop window,
       derived from the SAME geometry as the preview transform:
       img element top-left = (BOX-dispW)/2 + cx*dispW (x), (BOX-dispH)/2 + cy*dispH (y),
       crop square top-left = (BOX-CROP)/2 (both axes), src px per display px = 1/scale.
       The crop origin in image pixels is therefore:
         ((BOX-CROP)/2 - (BOX-dispW)/2 - cx*dispW) / scale = (dispW-CROP)/(2*scale) - cx*natW
       (dispW/scale = natW). This is what the preview shows, so the baked
       asset and the saved QR always match the crop selection. */
    const srcSize = CROP / scale;
    const sx0 = (dispW - CROP) / (2 * scale) - cx * (img.naturalWidth || 0);
    const sy0 = (dispH - CROP) / (2 * scale) - cy * (img.naturalHeight || 0);
    const sx = Math.min(Math.max(sx0, 0), Math.max(0, img.naturalWidth - srcSize));
    const sy = Math.min(Math.max(sy0, 0), Math.max(0, img.naturalHeight - srcSize));

    ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, out, out);

    /* Circle shape = inscribe a circle in the exported square and drop the
       corners (alpha=0) — a baked asset, so preview and saved QR agree. */
    if (shape === "circle") {
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      ctx.arc(out / 2, out / 2, out / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) {
      setError("Could not process the image — try a different file.");
      return;
    }
    setError(null);
    onApply(new File([blob], "logo.png", { type: "image/png" }));
  }

  return (
    <div className="rounded-md border border-border bg-elevated/60 p-3.5">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-fg-muted uppercase">
        <Crop className="size-3.5" /> Crop logo
      </p>

      <div
        className="relative mx-auto cursor-move overflow-hidden rounded-md bg-[repeating-conic-gradient(#1c1c1c_0%_25%,#161616_0%_50%)] bg-[length:16px_16px]"
        style={{ width: BOX, height: BOX, touchAction: "none" }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => dragRef.current && moveDrag(e.clientX, e.clientY)}
        onMouseUp={() => (dragRef.current = null)}
        onMouseLeave={() => (dragRef.current = null)}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={() => (dragRef.current = null)}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Crop source"
          onLoad={onImgLoad}
          onError={() => setError("Could not load the image — please pick another file.")}
          draggable={false}
          className="pointer-events-none absolute select-none"
          style={{
            width: dispW || BOX,
            height: dispH || BOX,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${cx * dispW}px), calc(-50% + ${cy * dispH}px))`,
          }}
        />
        {/* mask + crop shape */}
        {shape === "circle" ? (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-brand shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={{ width: CROP, height: CROP, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
          />
        ) : (
          <div
            className="pointer-events-none absolute border-2 border-brand shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={{ width: CROP, height: CROP, left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {(["square", "circle"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={shape === s}
            onClick={() => setShape(s)}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-[12px] font-medium transition-colors",
              shape === s
                ? "border border-border-strong bg-raised text-foreground"
                : "border border-transparent text-fg-muted hover:text-fg-secondary",
            )}
          >
            {s === "circle" ? <Circle className="size-3.5" /> : <Square className="size-3.5" />}
            {s === "circle" ? "Circle" : "Square"}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block font-mono text-[9px] tracking-[0.14em] text-fg-muted uppercase">
          Zoom
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[#E8590C]"
        />
      </label>
      <p className="mt-1 text-center text-[11px] text-fg-muted">Drag the image to reposition.</p>
      {error && (
        <p role="alert" className="mt-1 text-center text-[11px] text-destructive">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => void apply()} disabled={!imgSize.w}>
          <Check className="size-4" />
          Apply crop
        </Button>
      </div>
    </div>
  );
}

export { LogoCrop };
