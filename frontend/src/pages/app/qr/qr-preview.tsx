import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

/** mirrors generateQr.ts eyeStyleMap */
const EYE_STYLE_MAP = {
  square: "square",
  dot: "dot",
  extraRounded: "extra-rounded",
} as const;
import { shortUrl } from "@/lib/short-url";
import type { QrConfig } from "@/api/qr";

/**
 * Live local preview rendered with the SAME underlying library the backend
 * uses (@solana/qr-code-styling is a server build of qr-code-styling) and
 * the SAME option mapping as generateQr.ts — so what you see is what the
 * persisted Cloudinary asset will look like. The authoritative image is
 * still produced server-side on save.
 */
const FRAMES = {
  none: { pad: 0, border: 0, labelHeight: 0, label: "", borderEmber: false, double: false },
  clean: { pad: 26, border: 6, labelHeight: 0, label: "", borderEmber: false, double: false },
  double: { pad: 30, border: 4, labelHeight: 0, label: "", borderEmber: false, double: true },
  label: { pad: 26, border: 6, labelHeight: 56, label: "SCAN ME", borderEmber: false, double: false },
  accent: { pad: 24, border: 14, labelHeight: 0, label: "", borderEmber: true, double: false },
  branded: { pad: 28, border: 8, labelHeight: 58, label: "SCAN ME", borderEmber: true, double: false },
} as const;

type FrameName = keyof typeof FRAMES;

function QrPreview({
  config,
  shortId,
  frame = "none",
  className,
}: {
  config: QrConfig;
  shortId: string;
  frame?: FrameName;
  className?: string;
}) {
  /* mirrors composeQrFrame.ts geometry so preview == downloaded PNG */
  const f = FRAMES[frame];
  const borderColor = f.borderEmber ? "#E8590C" : config.foregroundColor;
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const data = shortUrl(shortId);

  /* mount once */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    qrRef.current = new QRCodeStyling({
      width: 300,
      height: 300,
      type: "svg",
      data,
      margin: config.margin,
      qrOptions: { errorCorrectionLevel: config.logoUrl ? "H" : "Q" },
      dotsOptions: { color: config.foregroundColor, type: config.pattern },
      backgroundOptions: { color: config.backgroundColor },
      cornersSquareOptions: { color: config.foregroundColor, type: EYE_STYLE_MAP[config.eyeStyle] },
      cornersDotOptions: { color: config.foregroundColor, type: config.eyeBallStyle },
      imageOptions: { crossOrigin: "anonymous", margin: 5, hideBackgroundDots: true, imageSize: 0.3 },
    });
    el.innerHTML = "";
    qrRef.current.append(el);
    return () => {
      el.replaceChildren();
      qrRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* live updates */
  useEffect(() => {
    qrRef.current?.update({
      data,
      margin: config.margin,
      qrOptions: { errorCorrectionLevel: config.logoUrl ? "H" : "Q" },
      dotsOptions: { color: config.foregroundColor, type: config.pattern },
      backgroundOptions: { color: config.backgroundColor },
      cornersSquareOptions: { color: config.foregroundColor, type: EYE_STYLE_MAP[config.eyeStyle] },
      cornersDotOptions: { color: config.foregroundColor, type: config.eyeBallStyle },
      image: config.logoUrl,
    });
  }, [data, config]);

  return (
    <div
      role="img"
      aria-label={`QR code preview for ${shortId}`}
      className={className}
      style={{
        background: config.backgroundColor,
        border: `${f.border}px solid ${borderColor}`,
        boxShadow: f.double ? `inset 0 0 0 ${Math.max(f.border - 4, 2)}px ${config.backgroundColor}, inset 0 0 0 ${f.border}px ${borderColor}` : undefined,
        borderRadius: 18,
        padding: f.pad,
      }}
    >
      <div ref={containerRef} className="[&>svg]:h-auto [&>svg]:w-full" />
      {f.labelHeight > 0 && (
        <p
          className={cnLabel(f.borderEmber)}
          style={{
            height: f.labelHeight,
            marginTop: 8,
            background: f.borderEmber ? "#E8590C" : config.foregroundColor,
            color: f.borderEmber ? "#F5F1EB" : config.backgroundColor,
            fontSize: f.borderEmber ? 15 : 17,
            letterSpacing: f.borderEmber ? 2 : 4,
          }}
        >
          {f.label}
        </p>
      )}
    </div>
  );
}

function cnLabel(ember: boolean) {
  return cnBase + (ember ? " text-[#F5F1EB]" : "");
}
const cnBase = "flex items-center justify-center rounded-md font-serif font-semibold";

export { QrPreview };
