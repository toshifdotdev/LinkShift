import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
status: z.enum(["active", "inactive"]).optional(),
    /**
     * Filter to one tag by name. Bounded to the same length a tag name is
     * allowed, so the query parameter cannot be used as an unbounded string
     * probe against the join table.
     */
    tag: z.string().trim().max(30).optional(),
    sort: z.enum(["createdAt", "updatedAt", "name", "clicks"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type queryData = z.infer<typeof querySchema>;

