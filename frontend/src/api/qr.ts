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


export async function fetchQrImage(
  linkId: string,
  token: string,
  signal?: AbortSignal,
): Promise<{ url: string; exists: true }> {
  
  const res = await fetch(`/api/v1/qr/${linkId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (res.status === 404) throw new ApiError(404, "No QR code yet");
  if (!res.ok) throw new ApiError(res.status, `Could not load QR (${res.status})`);
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), exists: true };
}


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
