import { z } from "zod";

/**
 * Bulk link import — request envelope.
 *
 * Rows are deliberately NOT validated here. The route-level `validate`
 * middleware runs the whole body as one unit, so a single bad row would 400 the
 * entire request and the user would get no idea which line failed. Rows are
 * re-parsed individually in the service against the same `createLinkSchema`
 * the single-create endpoint uses, so import can never bypass validation while
 * still reporting per-row reasons.
 */

/** Hard cap on rows per request. Guards memory and transaction length. */
export const MAX_IMPORT_ROWS = 2000;

export const linkImportSchema = z.object({
    /**
     * One destination domain for the whole batch. A row cannot override it:
     * a migration is "move this structure onto that host", and mixing hosts in
     * one file is far more likely a mistake than an intent.
     */
    domainId: z.cuid2(),
    rows: z
        .array(z.looseObject({}))
        .min(1, "Add at least one row to import.")
        .max(
            MAX_IMPORT_ROWS,
            `Import at most ${MAX_IMPORT_ROWS} rows at a time.`
        ),
    /**
     * When true the batch is only validated: nothing is written, no quota is
     * consumed, and the response reports what would happen. The UI always runs
     * this first so the user sees per-row reasons before committing.
     */
    dryRun: z.boolean().default(true),
});

export type LinkImportRequest = z.infer<typeof linkImportSchema>;
export type LinkImportRow = z.infer<typeof linkImportSchema>["rows"][number];
