import { useTheme } from "@/theme/theme";
import type { ImgHTMLAttributes } from "react";

export type ProductShot = "create-link" | "qr-studio" | "analytics" | "domains";

/**
 * Real captures of the LinkShift app, one per theme, taken from the
 * screenshot-test account. Both variants ship; only the one matching the
 * visitor's current LinkShift theme is loaded.
 */
const SHOTS: Record<ProductShot, { width: number; height: number; alt: string }> = {
  "create-link": {
    width: 1024,
    height: 948,
    alt: "LinkShift Create Link dialog with destination URL, slug preview and go.linkshift.in as the default domain",
  },
  "qr-studio": {
    width: 1792,
    height: 1656,
    alt: "LinkShift QR Studio with style presets on the left and a live ember-styled QR preview on the right",
  },
  analytics: {
    width: 2304,
    height: 1090,
    alt: "LinkShift Analytics desk showing headline numbers and the clicks-over-time chart",
  },
  domains: {
    width: 2304,
    height: 902,
    alt: "LinkShift Domains page with go.linkshift.in verified and the add-domain action",
  },
};

interface ProductScreenshotProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  shot: ProductShot;
  alt?: string;
}

/**
 * Renders the product screenshot for `shot` in the visitor's resolved
 * LinkShift theme — the same theme state the app itself renders in, so
 * manual Light/Dark switches (and System) always match the surrounding UI.
 */
function ProductScreenshot({ shot, alt, className = "w-full h-auto", loading = "lazy", ...rest }: ProductScreenshotProps) {
  const { theme } = useTheme();
  const meta = SHOTS[shot];

  return (
    <img
      {...rest}
      src={`/product/product-${shot}-${theme}.png`}
      alt={alt ?? meta.alt}
      width={meta.width}
      height={meta.height}
      loading={loading}
      className={className}
    />
  );
}

export { ProductScreenshot };
