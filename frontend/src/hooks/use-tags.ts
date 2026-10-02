import { useQuery } from "@tanstack/react-query";
import { listTags } from "@/api/tags";

/**
 * The owner's tags.
 *
 * `staleTime` is long because tags change rarely and this drives a filter
 * control on the links list; refetching on every window focus would make the
 * dropdown flicker for no benefit.
 */
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: ({ signal }) => listTags(signal),
    staleTime: 60_000,
  });
}