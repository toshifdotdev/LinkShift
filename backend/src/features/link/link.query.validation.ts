import { z } from "zod";

export const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.enum(["createdAt", "updatedAt", "name", "clicks"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type queryData = z.infer<typeof querySchema>;

