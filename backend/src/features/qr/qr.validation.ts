import { z } from "zod";

export const createQrSchema = z.object({
  foregroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  margin: z.number().int().nonnegative().optional(),
});

export type createLinkQr = {
  userId: string;
  linkId: string;
} & z.infer<typeof createQrSchema>;
