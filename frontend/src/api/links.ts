import { apiFetch } from "./client";
import type { LinkItem, LinksPagination } from "@/types/api";

export interface ListLinksParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  sort?: "createdAt" | "updatedAt" | "name" | "clicks";
  order?: "asc" | "desc";
}

export interface ListLinksResponse {
  success: true;
  data: LinkItem[];
  pagination: LinksPagination;
}

export interface CreateLinkPayload {
  targetUrl: string;
  name?: string;
  slug?: string;
  domainId: string;
  expiresAt?: string;
  password?: string;
  deepLink?: boolean;
  appDeepLink?: boolean;
  appScheme?: string;
  androidPackage?: string;
  appPath?: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface UpdateLinkPayload {
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
  slug?: string;
  domainId?: string;
  
  expiresAt: string | null;
  
  password?: string | null;
  deepLink?: boolean;
  
  appDeepLink?: boolean;
  appScheme?: string | null;
  androidPackage?: string | null;
  appPath?: string | null;
  iosStoreUrl?: string | null;
  androidStoreUrl?: string | null;
}

export function listLinks(params: ListLinksParams, signal?: AbortSignal) {
  return apiFetch<ListLinksResponse>("/links", {
    query: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status,
      sort: params.sort,
      order: params.order,
    },
    signal,
  });
}

export function getLink(id: string) {
  return apiFetch<{ success: true; data: LinkItem }>(`/links/${id}`);
}

export function createLink(payload: CreateLinkPayload) {
  
  return apiFetch<{ success?: true; message: string; data: LinkItem }>("/links", {
    method: "POST",
    body: payload,
  });
}

export function updateLink(id: string, payload: UpdateLinkPayload) {
  return apiFetch<{ success: true; data: LinkItem }>(`/links/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteLink(id: string) {
  return apiFetch<{ success: true; message: string }>(`/links/${id}`, {
    method: "DELETE",
  });
}
