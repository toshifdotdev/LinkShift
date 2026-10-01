import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import { deleteCache } from "../../utils/cache";
import { buildUtmUrl } from "../utm/utm.service";
import {
    checkCustomSlugLimit,
    checkDeepLinkAccess,
    checkLinkImportAccess,
    checkLinkLimit,
    checkUtmAccess,
} from "../billing/billing.service";
import { getValidatedDomain } from "../../utils/validate.domain";
import { getAvailableShortId } from "../../utils/shortId";
import {
    type LinkImportRequest,
    type LinkImportRow,
} from "./link.import.validation";
import { createLinkSchema, type CreateLinkData } from "./link.validation";

/** A row that has already passed `createLinkSchema`. */
type ValidatedImportRow = CreateLinkData;

export type ImportOutcome = "created" | "rejected";

export interface ImportRowResult {
    /** 1-based position in the submitted file, so a user can find the row. */
    row: number;
    outcome: ImportOutcome;
    /** Slug actually used. Only present for created rows. */
    shortId?: string;
    /** Why the row was rejected. Only present for rejected rows. */
    reason?: string;
    /** Machine-readable rejection code, for the UI to group by. */
    code?: ImportRejectionCode;
}

export type ImportRejectionCode =
    | "INVALID_ROW"
    | "DUPLICATE_IN_FILE"
    | "SLUG_TAKEN"
    | "LIMIT_REACHED";

export interface ImportSummary {
    total: number;
    created: number;
    rejected: number;
    /** Set when the batch cannot proceed at all, e.g. the plan link ceiling. */
    blocked?: string;
}

export interface ImportResult {
    dryRun: boolean;
    summary: ImportSummary;
    results: ImportRowResult[];
}

/**
 * Validate and (optionally) create a batch of links.
 *
 * Design notes:
 *
 * - Every row is validated with the same rules as a single create, so the
 *   batch path cannot be used to bypass validation. Plan gates that are
 *   per-user rather than per-row (UTM requires Creator+, path forwarding
 *   requires Pro+) are checked once, not per row.
 * - A slug that already exists is REJECTED rather than falling back to a
 *   generated short id. `getAvailableShortId` silently generates a random id
 *   when a slug collides, which is right for a casual create and catastrophic
 *   for a migration: the whole point is that `/old/path` keeps resolving.
 * - Duplicates within the file are detected here because each create is
 *   otherwise independent and would only collide at the database.
 * - The plan link ceiling hard-stops the batch. Rejecting row 400 because rows
 *   1-399 filled the allowance is worse than stopping before any write.
 */
export const importLinks = async (
    userId: string,
    { domainId, rows, dryRun }: LinkImportRequest
): Promise<ImportResult> => {
    // Paid feature. Checked before any row work so a Free account gets the
    // plan reason rather than per-row validation noise.
    await checkLinkImportAccess(userId);

    const domain = await getValidatedDomain(domainId, userId);
    const results: ImportRowResult[] = [];

    // --- per-user plan gates, resolved once --------------------------------
    const hasUtm = rows.some((row) => hasAnyUtm(row));
    if (hasUtm) {
        // Surfaces the real 403 message ("available on Creator") rather than
        // repeating it on every affected row.
        await checkUtmAccess(userId);
    }

    const wantsDeepLink = rows.some((row) => row.deepLink === true);
    if (wantsDeepLink) {
        await checkDeepLinkAccess(userId);
    }

    // --- structural validation, including in-file duplicates ---------------
    const accepted: Array<{ row: number; data: ValidatedImportRow }> = [];
    const claimedSlugs = new Map<string, number>();

    for (const [index, row] of rows.entries()) {
        const rowNumber = index + 1;
        // domainId is injected rather than accepted per row, so a row can never
        // target a different host than the one the user picked.
        const parsed = validateRow(row, domainId);
        if (!parsed.ok) {
            results.push({
                row: rowNumber,
                outcome: "rejected",
                code: "INVALID_ROW",
                reason: parsed.message,
            });
            continue;
        }

        const data = parsed.data;

        if (data.slug) {
            // Slug uniqueness is scoped to the domain, matching the
            // `@@unique([domainId, shortId])` constraint.
            const key = `${domain.id}:${data.slug}`;
            const firstSeen = claimedSlugs.get(key);
            if (firstSeen !== undefined) {
                results.push({
                    row: rowNumber,
                    outcome: "rejected",
                    code: "DUPLICATE_IN_FILE",
                    reason: `Row ${firstSeen} already uses "${data.slug}".`,
                });
                continue;
            }
            claimedSlugs.set(key, rowNumber);
        }

        accepted.push({ row: rowNumber, data });
    }

    // --- existing-slug check, batched into one query ------------------------
    const requestedSlugs = [
        ...new Set(
            accepted
                .map((entry) => entry.data.slug)
                .filter((slug): slug is string => !!slug)
        ),
    ];

    const taken = new Set<string>();
    if (requestedSlugs.length > 0) {
        const existing = await prisma.link.findMany({
            where: {
                domainId: domain.id,
                shortId: { in: requestedSlugs },
            },
            select: { shortId: true },
        });
        for (const row of existing) taken.add(row.shortId);
    }

    // --- plan ceilings, counted once ---------------------------------------
    const slugRows = accepted.filter((entry) => entry.data.slug).length;
    let blocked: string | undefined;

    try {
        await checkLinkLimit(userId, Math.max(accepted.length, 1));
        if (slugRows > 0) {
            await checkCustomSlugLimit(userId, slugRows);
        }
    } catch (error) {
        if (error instanceof AppError) {
            blocked = error.message;
        } else {
            throw error;
        }
    }

    if (blocked) {
        // Every otherwise-valid row is reported as blocked rather than the
        // request 403-ing, so the UI can show one clear reason.
        for (const entry of accepted) {
            results.push({
                row: entry.row,
                outcome: "rejected",
                code: "LIMIT_REACHED",
                reason: blocked,
            });
        }
    } else {
        const ready = accepted.filter((entry) => {
            if (!entry.data.slug) return true;
            if (taken.has(entry.data.slug)) {
                results.push({
                    row: entry.row,
                    outcome: "rejected",
                    code: "SLUG_TAKEN",
                    reason: `"${entry.data.slug}" already exists on ${domain.host}. Delete or rename that link first.`,
                });
                return false;
            }
            return true;
        });

        if (dryRun) {
            for (const entry of ready) {
                results.push({
                    row: entry.row,
                    outcome: "created",
                    shortId: entry.data.slug ?? "(generated)",
                });
            }
        } else if (ready.length > 0) {
            const created = await persistBatch(userId, domain.id, ready);
            for (const [row, shortId] of created) {
                results.push({ row, outcome: "created", shortId });
            }
        }
    }

    results.sort((a, b) => a.row - b.row);

    const createdCount = results.filter((r) => r.outcome === "created").length;

    if (!dryRun && createdCount > 0) {
        // One invalidation for the batch, matching the create endpoint's
        // behaviour without paying for it per row.
        await deleteCache(`dashboard:${userId}`).catch(() => {});
    }

    return {
        dryRun,
        summary: {
            total: rows.length,
            created: dryRun ? createdCount : createdCount,
            rejected: results.filter((r) => r.outcome === "rejected").length,
            blocked,
        },
        results,
    };
};

/**
 * Insert the accepted rows in one transaction.
 *
 * Validation already happened, so a failure here is a genuine infrastructure
 * or uniqueness problem rather than bad input: roll the whole batch back and
 * surface it instead of leaving a half-migrated site behind.
 */
const persistBatch = async (
    userId: string,
    domainId: string,
    ready: Array<{ row: number; data: ValidatedImportRow }>
): Promise<Array<[number, string]>> => {
    const results: Array<[number, string]> = [];

    await prisma.$transaction(async (tx) => {
        for (const entry of ready) {
            const { data, row } = entry;
            // Reuse the single-create slug allocator so a row without an
            // explicit slug behaves identically to the UI path. The
            // transaction client is passed so the uniqueness check runs inside
            // this transaction rather than against the global connection.
            const shortId = await getAvailableShortId(data.slug, domainId, tx);

            const created = await tx.link.create({
                data: {
                    userId,
                    targetUrl: buildUtmUrl(data.targetUrl, {
                        utmSource: data.utmSource,
                        utmMedium: data.utmMedium,
                        utmCampaign: data.utmCampaign,
                        utmTerm: data.utmTerm,
                        utmContent: data.utmContent,
                    }),
                    name: data.name,
                    shortId,
                    domainId,
                    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                    deepLink: data.deepLink ?? false,
                    utmSource: data.utmSource,
                    utmMedium: data.utmMedium,
                    utmCampaign: data.utmCampaign,
                    utmTerm: data.utmTerm,
                    utmContent: data.utmContent,
                },
                select: { id: true, shortId: true },
            });

            if (data.slug) {
                await tx.linkChange.create({
                    data: { userId, linkId: created.id, type: "CUSTOM_SLUG" },
                });
            }

            results.push([row, created.shortId]);
        }
    });

    return results;
};

// Accepts a loose record because it runs before per-row validation.
const hasAnyUtm = (row: Record<string, unknown>): boolean =>
    row.utmSource !== undefined ||
    row.utmMedium !== undefined ||
    row.utmCampaign !== undefined ||
    row.utmTerm !== undefined ||
    row.utmContent !== undefined;

/**
 * Validate a single import row with the same rules as a single create.
 *
 * `createLinkSchema` is reused verbatim rather than re-declared, so import and
 * the create dialog can never disagree about what a valid row is.
 */
const validateRow = (
    row: LinkImportRow,
    domainId: string
):
    | { ok: true; data: ValidatedImportRow }
    | { ok: false; message: string } => {
    const parsed = createLinkSchema.safeParse({ ...row, domainId });
    if (parsed.success) return { ok: true, data: parsed.data };

    const first = parsed.error?.issues?.[0];
    if (!first) return { ok: false, message: "This row could not be read." };

    const field = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
    return { ok: false, message: `${field}${first.message}` };
};
