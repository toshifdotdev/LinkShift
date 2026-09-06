import { useQuery } from "@tanstack/react-query";
import { getDomains } from "@/api/domains";
import type { DomainRow } from "@/types/api";

export interface UseDomainsOptions {
  enabled?: boolean;
}


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