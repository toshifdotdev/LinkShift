import { useQuery } from "@tanstack/react-query";
import { getDomains } from "@/api/domains";
import type { DomainRow } from "@/types/api";

export interface UseDomainsOptions {
  enabled?: boolean;
}

/* Single source of truth for the ["domains"] query cache. Every consumer mounts this
   hook so the cache always holds DomainRow[] (never the { success, data } envelope),
   and a malformed response degrades to an empty list instead of a render error. */
export function useDomains(options: UseDomainsOptions = {}) {
  return useQuery<DomainRow[]>({
    queryKey: ["domains"],
    queryFn: async () => {
      const res = await getDomains();
      return Array.isArray(res?.data) ? res.data : [];
    },
    enabled: options.enabled,
  });
}