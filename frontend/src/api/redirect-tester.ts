import { apiFetch } from "./client";

/**
 * Redirect preview.
 *
 * Read-only by contract. The endpoint never writes an analytics row and never
 * counts against the redirect quota, so a preview is free to run repeatedly
 * while someone compares platforms. Do not add a "record this" mode here: a
 * tester that can be made to look like a real click is a quota bypass.
 */
export type TesterPreset =
  | "desktop"
  | "ios-safari"
  | "ios-chrome"
  | "android-chrome"
  | "android-firefox"
  | "bot";

export const TESTER_PRESETS: { value: TesterPreset; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "ios-safari", label: "iPhone Safari" },
  { value: "ios-chrome", label: "iPhone Chrome" },
  { value: "android-chrome", label: "Android Chrome" },
  { value: "android-firefox", label: "Android Firefox" },
  { value: "bot", label: "Bot crawler" },
];

export interface PreviewStep {
  label: string;
  detail: string;
}

export interface RedirectPreview {
  finalUrl: string;
  kind: "redirect" | "interstitial";
  preset: TesterPreset;
  audience: "ios" | "android" | "desktop" | "bot";
  showsInterstitial: boolean;
  appUrl: string | null;
  storeUrl: string | null;
  deepLinkApplied: boolean;
  appDeepLinkApplied: boolean;
  steps: PreviewStep[];
  warnings: string[];
}

export interface PreviewRedirectInput {
  url: string;
  preset?: TesterPreset;
  userAgent?: string;
  path?: string;
  query?: string;
  appScheme?: string;
  androidPackage?: string;
  appPath?: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  deepLink?: boolean;
}

export async function previewRedirect(
  input: PreviewRedirectInput,
  signal?: AbortSignal,
): Promise<RedirectPreview> {
  const res = await apiFetch<{ data: RedirectPreview }>("/redirect-tester/preview", {
    method: "POST",
    body: input,
    signal,
  });

  return res.data;
}
