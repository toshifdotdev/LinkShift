import { z } from "zod";

export const tagIdSchema = z.object({
    id: z.cuid2(),
});