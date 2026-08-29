import { ApiError, apiFetch } from "./client";
import type { QrResponse } from "@/types/api";

export interface QrConfig {
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
  pattern: "square" | "dots" | "rounded" | "extraRounded" | "classy" | "classyRounded";
  eyeStyle: "square" | "dot" | "extraRounded";
  eyeBallStyle: "square" | "dot";
  logoUrl?: string;
  logoPublicId?: string;
}

/** Idempotent per exact config — identical settings return the stored QR. */
export function createQr(linkId: string, config: QrConfig) {
  return apiFetch<{ success: true; data: QrResponse }>(`/qr/${linkId}`, {
    method: "POST",
    body: config,
  });
}

export function deleteQr(qrId: string) {
  return apiFetch<{ success: true; message: string }>(`/qr/${qrId}`, {
    method: "DELETE",
  });
}

/**
 * Authenticated download/preview URL for a link's LATEST persisted QR.
 * The asset is composed at save time (frames, logos), so it IS the final
 * design — preview, library thumbnail, and download PNG are the SAME
 * configuration. The endpoint 302s to the persisted Cloudinary asset.
 */
export function qrDownloadUrl(linkId: string): string {
  return `/api/v1/qr/${linkId}/download`;
}

export function uploadQrLogo(file: File) {
  const body = new FormData();
  body.append("image", file);
  return apiFetch<{ success: true; logUrl: string; logoPublicId: string }>("/qr/logo", {
    method: "POST",
    body,
  });
}

/**
 * QR images are served by an auth-header-only endpoint, so <img src> and
 * plain <a download> can never load them (no Authorization header on
 * browser-initiated resource requests). We fetch as authenticated blobs
 * and hand back object URLs instead.
 */
export async function fetchQrImage(
  linkId: string,
  token: string,
  signal?: AbortSignal,
): Promise<{ url: string; exists: true }> {
  /* credentials omitted: the redirect target (Cloudinary) sends ACAO:* but
     not allow-credentials, and auth travels via the Bearer header anyway. */
  const res = await fetch(`/api/v1/qr/${linkId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (res.status === 404) throw new ApiError(404, "No QR code yet");
  if (!res.ok) throw new ApiError(res.status, `Could not load QR (${res.status})`);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), exists: true };
}

/** Authenticated download with a proper filename. */
export async function downloadQrImage(
  linkId: string,
  shortId: string,
  token: string,
): Promise<void> {
  const { url } = await fetchQrImage(linkId, token, undefined);
  const a = document.createElement("a");
  a.href = url;
  a.download = `linkshift-${shortId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
