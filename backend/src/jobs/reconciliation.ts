import { prisma } from "../config";
import razorpay from "../config/razorpay";
import { Prisma } from "../generated/prisma/client";
import { Currency } from "../generated/prisma/enums";
import {
    cycleFromPlanMatch,
    epochToDate,
    isTerminalSubscriptionStatus,
    LIVE_SUBSCRIPTION_STATUSES,
    mapProviderPlan,
} from "../features/billing/billing.service";

type LiveSubscriptionRow = Prisma.SubscriptionGetPayload<{
    include: { plan: true; pendingPlan: true };
}>;

// ---------------------------------------------------------------------------
// Wave 4 reconciliation engine.
//
// Execution contract (locked decisions):
//  - Single-runner lease via ReconciliationRun partial unique index.
//  - Triggered externally (manual curl for now; hourly scheduler later).
//  - Provider authoritative for liveness/periods; terminal rows are sinks and
//    are NEVER touched here (resurrection guard).
//  - All repairs are absolute-set + idempotent, mirroring webhook-handler rules.
//  - Observability: structured JSON logs only (D-D). No secrets/token logging.
// ---------------------------------------------------------------------------

const LEASE_TTL_MINUTES = 15;
const STALE_AP_HOURS = 24;
const PROVIDER_CALL_DELAY_MS = 100;
const REFUND_SYNC_WINDOW_DAYS = 30;
const MAX_PAGES_PER_LIST = 10;

type ReconCounters = {
    subscriptionsScanned: number;
    subscriptionsRepaired: number;
    alertsRaised: number;
    recordsSkipped: number;
    paymentsBackfilled: number;
    refundsBackfilled: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(entry: Record<string, unknown>) {
    console.log(JSON.stringify({ cat: "RECON", ts: new Date().toISOString(), ...entry }));
}

async function coerceInt(value: unknown): Promise<number | null> {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Run lease (structural single-runner guarantee via partial unique index).
// ---------------------------------------------------------------------------

async function claimRun(triggeredBy: string): Promise<string | null> {
    // Crash recovery: reclaim leases held past TTL before attempting a claim.
    const cutoff = new Date(Date.now() - LEASE_TTL_MINUTES * 60_000);
    const reclaimed = await prisma.reconciliationRun.updateMany({
        where: { status: "running", startedAt: { lt: cutoff } },
        data: { status: "failed", finishedAt: new Date() },
    });
    if (reclaimed.count > 0) {
        log({ action: "stale-leases-reclaimed", count: reclaimed.count });
    }

    try {
        const run = await prisma.reconciliationRun.create({
            data: { status: "running", triggeredBy },
        });
        return run.id;
    } catch (err) {
        // Partial unique index violation => another runner holds the lease.
        log({ action: "claim-denied", reason: "already-running" });
        return null;
    }
}

async function finishRun(
    runId: string | null,
    status: "completed" | "failed",
    stats?: Record<string, unknown>
) {
    if (!runId) return;
    await prisma.reconciliationRun.update({
        where: { id: runId },
        data: { status, finishedAt: new Date(), stats: stats as never },
    });
}

// ---------------------------------------------------------------------------
// Provider access (tolerant; a failed fetch degrades that row to ALERT-only).
// ---------------------------------------------------------------------------

async function fetchProviderSubscription(providerSubscriptionId: string) {
    await sleep(PROVIDER_CALL_DELAY_MS);
    try {
        return await razorpay.subscriptions.fetch(providerSubscriptionId);
    } catch (err) {
        log({ action: "provider-fetch-failed", providerSubscriptionId, error: String(err) });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Subscription state-matrix repair (provider authoritative; mirrors W2 rules).
// ---------------------------------------------------------------------------

const PROVIDER_LIVE_TARGET: Record<string, string> = {
    active: "ACTIVE",
    pending: "PAYMENT_RETRY",
    halted: "HALTED",
    paused: "PAUSED",
};

const PROVIDER_TERMINAL_TARGET: Record<string, string> = {
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    expired: "EXPIRED",
};

type RowOutcome = "repaired" | "alerted" | "skipped";

async function repairSubscription(
    localRow: LiveSubscriptionRow,
    entity: any,
    c: ReconCounters
): Promise<RowOutcome> {
    const localId = localRow.id;

    // Resurrection guard: terminal rows must never be mutated by reconciliation.
    if (isTerminalSubscriptionStatus(localRow.status)) {
        log({ action: "alert", reason: "terminal-row-in-scan", localId });
        c.alertsRaised++;
        return "alerted";
    }

    const providerStatus: string = entity.status;

    if (isTerminalSubscriptionStatus(localRow.status) === false && PROVIDER_TERMINAL_TARGET[providerStatus]) {
        // Local live vs provider terminal: authoritative close-out.
        const target = PROVIDER_TERMINAL_TARGET[providerStatus];
        await prisma.subscription.update({
            where: { id: localId },
            data: {
                status: target as never,
                cancelledAt: target === "CANCELLED"
                    ? epochToDate(entity.ended_at) ?? new Date()
                    : localRow.cancelledAt,
                currentPeriodEnd: epochToDate(entity.current_end) ?? localRow.currentPeriodEnd,
                pendingPlanId: null,
                changeScheduledAt: null,
            },
        });
        log({ action: "repair", localId, providerSub: entity.id, field: "status", from: localRow.status, to: target });
        c.subscriptionsRepaired++;
        return "repaired";
    }

    if (localRow.status === "AUTHORIZATION_PENDING") {
        if (providerStatus === "active") {
            // Missed activation webhooks: authorize the checkout that actually worked.
            await prisma.subscription.update({
                where: { id: localId },
                data: {
                    status: "ACTIVE",
                    providerCustomerId: entity.customer_id ?? localRow.providerCustomerId,
                    startedAt: epochToDate(entity.start_at) ?? localRow.startedAt,
                    currentPeriodStart: epochToDate(entity.current_start) ?? localRow.currentPeriodStart,
                    currentPeriodEnd: epochToDate(entity.current_end) ?? localRow.currentPeriodEnd,
                },
            });
            log({ action: "repair", localId, providerSub: entity.id, field: "status", from: "AUTHORIZATION_PENDING", to: "ACTIVE", reason: "missed-activation-webhooks" });
            c.subscriptionsRepaired++;
            return "repaired";
        }

        if (providerStatus === "created") {
            const ageHours = (Date.now() - localRow.createdAt.getTime()) / 3_600_000;
            if (ageHours < STALE_AP_HOURS) {
                c.recordsSkipped++;
                return "skipped";
            }
            // Abandonment tier: provider-cancel first, then terminalize locally.
            try {
                await sleep(PROVIDER_CALL_DELAY_MS);
                await razorpay.subscriptions.cancel(entity.id);
            } catch (err) {
                const description = String((err as any)?.error?.description ?? (err as any)?.message ?? "");
                log({ action: "stale-ap-provider-cancel-error", localId, providerSub: entity.id, description });
                if (!/already|cancel|expire/i.test(description)) {
                    c.alertsRaised++;
                    return "alerted";
                }
                // Already cancelled/expired at provider: safe to terminalize below.
            }
            await prisma.subscription.update({
                where: { id: localId },
                data: { status: "CANCELLED", cancelledAt: new Date(), cancelAtPeriodEnd: false },
            });
            log({ action: "repair", localId, providerSub: entity.id, from: "AUTHORIZATION_PENDING", to: "CANCELLED", reason: "stale-abandoned-checkout", ageHours: Math.round(ageHours) });
            c.subscriptionsRepaired++;
            return "repaired";
        }

        if (providerStatus === "authenticated") {
            // Mid-auth: mandate authorized, first charge not settled yet. Wait.
            c.recordsSkipped++;
            return "skipped";
        }

        // AP vs pending/halted/paused: unusual pre-auth divergence — alert only.
        log({ action: "alert", reason: "auth-pending-vs-live-provider", localId, providerStatus });
        c.alertsRaised++;
        return "alerted";
    }

    // Local live (ACTIVE/PAYMENT_RETRY/HALTED/PAUSED) vs provider states.
    const target = PROVIDER_LIVE_TARGET[providerStatus];

    if (!target) {
        log({ action: "alert", reason: "live-local-vs-non-live-provider", localId, localStatus: localRow.status, providerStatus });
        c.alertsRaised++;
        return "alerted";
    }

    // ---- Plan-field mirroring (identical doctrine to W2 updated-handler) ----
    const mappedPlan = await mapProviderPlan(entity.plan_id);
    let warning: string | undefined;
    if (!mappedPlan) {
        warning = "unmapped_plan";
        log({ action: "alert", reason: "unmapped-plan-on-repair", localId, providerPlanId: entity.plan_id });
        c.alertsRaised++;
    }

    const newPeriodStart = epochToDate(entity.current_start) ?? localRow.currentPeriodStart;
    const newPeriodEnd = epochToDate(entity.current_end) ?? localRow.currentPeriodEnd;

    // Compare instants (getTime), NOT Date object references — fresh Date objects
    // are always referentially unequal even when values match.
    const periodFields = {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
    };
    const data: Record<string, unknown> = {
        status: target,
        providerCustomerId: entity.customer_id ?? localRow.providerCustomerId,
        ...periodFields,
    };

    let planMutated = false;

    if (mappedPlan) {
        const billingCycle = cycleFromPlanMatch(mappedPlan, entity.plan_id);
        const scheduledWindowOpen = entity.has_scheduled_changes === true;

        if (scheduledWindowOpen) {
            // Open schedule: planId FROZEN; pending intent must mirror provider.
            if (
                mappedPlan.id !== localRow.planId &&
                localRow.pendingPlanId !== null &&
                localRow.pendingPlanId !== mappedPlan.id
            ) {
                log({ action: "warn", reason: "conflicting-scheduled-change", localId, localPending: localRow.pendingPlanId, providerPlan: mappedPlan.id });
                c.alertsRaised++;
            }
            const desiredPendingPlanId =
                mappedPlan.id === localRow.planId ? localRow.pendingPlanId : mappedPlan.id;
            const scheduledAt =
                typeof entity.change_scheduled_at === "number"
                    ? new Date(entity.change_scheduled_at * 1000)
                    : (localRow.changeScheduledAt ?? localRow.currentPeriodEnd ?? new Date());

            planMutated =
                desiredPendingPlanId !== localRow.pendingPlanId ||
                scheduledAt.getTime() !== (localRow.changeScheduledAt?.getTime() ?? NaN);

            data.pendingPlanId = desiredPendingPlanId;
            data.changeScheduledAt = scheduledAt;
        } else {
            // Window closed: provider truth committed; schedule cleared.
            if (mappedPlan.id !== localRow.planId) {
                log({ action: "repair", localId, field: "planId", from: localRow.planId, to: mappedPlan.id, reason: "provider-authoritative" });
            }
            if (localRow.pendingPlanId !== null || localRow.changeScheduledAt !== null) {
                log({ action: "repair", localId, field: "pendingSchedule", cleared: true });
            }
            planMutated =
                mappedPlan.id !== localRow.planId ||
                localRow.pendingPlanId !== null ||
                localRow.changeScheduledAt !== null;

            data.planId = mappedPlan.id;
            data.billingCycle = billingCycle;
            data.pendingPlanId = null;
            data.changeScheduledAt = null;
        }
    }

    const statusChanged = target !== localRow.status;
    // Compare instants (getTime), NOT Date references — fresh Date objects are
    // always referentially unequal even when their values match.
    const periodChanged =
        periodFields.currentPeriodStart?.getTime() !== localRow.currentPeriodStart?.getTime() ||
        periodFields.currentPeriodEnd?.getTime() !== localRow.currentPeriodEnd?.getTime();

    if (process.env.RECON_DEBUG) {
        log({
            action: "debug-repair",
            localId,
            statusChanged, planMutated, periodChanged, warning,
            providerPlanId: entity.plan_id,
            hasSched: entity.has_scheduled_changes,
            schedAtRaw: entity.change_scheduled_at,
            provCs: entity.current_start, provCe: entity.current_end,
            dbPs: localRow.currentPeriodStart?.getTime(), dbPe: localRow.currentPeriodEnd?.getTime(),
            dbPending: localRow.pendingPlanId, dbSchedAtMs: localRow.changeScheduledAt?.getTime(),
        });
    }

    if (!statusChanged && !planMutated && !periodChanged && warning === undefined) {
        // Fully converged — nothing to write.
        c.recordsSkipped++;
        return "skipped";
    }

    if (statusChanged) {
        log({ action: "repair", localId, providerSub: entity.id, field: "status", from: localRow.status, to: target });
    }

    try {
        await prisma.subscription.update({
            where: { id: localId },
            data: data as never,
        });
    } catch (err) {
        if ((err as any).code === "P2002") {
            // Double-live attempt is structurally impossible under Wave 0's index.
            console.error(`[RECON] CRITICAL: P2002 while repairing ${localId} — investigate immediately`, err);
        }
        throw err;
    }

    if (statusChanged || planMutated || periodChanged) {
        c.subscriptionsRepaired++;
    }
    void warning;
    return "repaired";
}

// ---------------------------------------------------------------------------
// Payment ledger backfill (invoice-driven — SDK supports per-subscription
// invoice listing; payments.all has NO subscription filter, so invoices are
// the authoritative per-sub source).
// ---------------------------------------------------------------------------

async function backfillPaymentsForSubscription(
    subscription: {
        id: string;
        userId: string;
        planId: string;
        billingCycle: unknown;
        providerSubscriptionId: string | null;
    },
    c: ReconCounters
) {
    if (!subscription.providerSubscriptionId) {
        log({ action: "alert", reason: "missing-provider-subscription-id", localId: subscription.id });
        c.alertsRaised++;
        return;
    }
    await sleep(PROVIDER_CALL_DELAY_MS);

    let invoices: any[] = [];
    try {
        const res = await razorpay.invoices.all({
            subscription_id: subscription.providerSubscriptionId,
            count: 100,
        });
        invoices = res.items ?? [];
    } catch (err) {
        log({ action: "alert", reason: "invoice-list-failed", providerSub: subscription.providerSubscriptionId, error: String(err) });
        c.alertsRaised++;
        return;
    }

    for (const invoice of invoices) {
        if (invoice.status !== "paid" || !invoice.order_id) continue;

        let existing = invoice.order_id
            ? await prisma.payment.findUnique({
                  where: {
                      provider_providerOrderId: {
                          provider: "RAZORPAY",
                          providerOrderId: invoice.order_id,
                      },
                  },
              })
            : null;

        if (!existing && invoice.payment_id) {
            existing = await prisma.payment.findUnique({
                where: {
                    provider_providerPaymentId: {
                        provider: "RAZORPAY",
                        providerPaymentId: invoice.payment_id,
                    },
                },
            });

            if (existing) {
                // Fill the order-id side so future dedupes hit the cheap path.
                await prisma.payment.update({
                    where: { id: existing.id },
                    data: { providerOrderId: invoice.order_id },
                });
            }
        }

        if (existing) continue;

        const amount = await coerceInt(invoice.amount);
        if (amount === null) {
            log({ action: "warn", reason: "unusable-invoice-amount", invoiceId: invoice.id });
            c.alertsRaised++;
            continue;
        }

        try {
            await prisma.payment.create({
                data: {
                    planId: subscription.planId,
                    userId: subscription.userId,
                    subscriptionId: subscription.id,

                    provider: "RAZORPAY",

                    providerOrderId: invoice.order_id,
                    providerPaymentId: invoice.payment_id ?? null,

                    billingCycle: subscription.billingCycle as never,

                    amount,
                    currency: invoice.currency,

                    status: "SUCCESS",

                    category: "SUBSCRIPTION",
                },
            });
            log({ action: "backfill-payment", providerSub: subscription.providerSubscriptionId, orderId: invoice.order_id, amount });
            c.paymentsBackfilled++;
        } catch (err) {
            if ((err as any).code === "P2002") continue; // concurrent webhook won
            throw err;
        }
    }
}

// ---------------------------------------------------------------------------
// Refund sync: global listing filtered to our payments; same cumulative rules
// as the Wave-3 webhook handler (unique-anchor idempotency).
// ---------------------------------------------------------------------------

async function syncRefunds(c: ReconCounters) {
    const fromUnix = Math.floor((Date.now() - REFUND_SYNC_WINDOW_DAYS * 86_400_000) / 1000);

    const knownPayments = await prisma.payment.findMany({
        select: {
            id: true,
            status: true,
            amount: true,
            providerPaymentId: true,
        },
    });
    const byProviderPaymentId = new Map<string, (typeof knownPayments)[number]>();
    for (const p of knownPayments) {
        if (p.providerPaymentId) byProviderPaymentId.set(p.providerPaymentId, p);
    }

    let skip = 0;
    for (let page = 0; page < MAX_PAGES_PER_LIST; page++) {
        await sleep(PROVIDER_CALL_DELAY_MS);
        const res = await razorpay.refunds.all({ from: fromUnix, count: 100, skip });
        const items = res.items ?? [];
        if (items.length === 0) break;

        for (const refund of items) {
            const payment = refund.payment_id ? byProviderPaymentId.get(refund.payment_id) : undefined;
            if (!payment) continue; // foreign/unlinked refund

            const already = await prisma.refund.findUnique({
                where: { providerRefundId: refund.id },
            });
            if (already) continue;

            const amount = await coerceInt(refund.amount);
            if (amount === null) {
                log({ action: "warn", reason: "unusable-refund-amount", refundId: refund.id });
                c.alertsRaised++;
                continue;
            }

            try {
                await prisma.refund.create({
                    data: {
                        paymentId: payment.id,
                        provider: "RAZORPAY",
                        providerRefundId: refund.id,
                        amount,
                        currency: refund.currency as Currency,
                    },
                });
                log({ action: "backfill-refund", paymentId: payment.id, refundId: refund.id, amount });
                c.refundsBackfilled++;
            } catch (err) {
                if ((err as any).code === "P2002") continue; // raced with webhook
                throw err;
            }

            const totals = await prisma.refund.aggregate({
                _sum: { amount: true },
                where: { paymentId: payment.id },
            });
            const cumulative = totals._sum.amount ?? 0;

            if (cumulative >= payment.amount && payment.status !== "REFUNDED") {
                if (cumulative > payment.amount) {
                    log({ action: "warn", reason: "over-refund-anomaly", paymentId: payment.id, refunded: cumulative, original: payment.amount });
                }
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: "REFUNDED", providerRefundId: refund.id },
                });
                log({ action: "repair", paymentId: payment.id, field: "status", to: "REFUNDED", cumulative });
                c.subscriptionsRepaired++; // shared repair counter (payment-side repair)
            }
        }

        if (items.length < 100) break;
        skip += 100;
    }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function runReconciliation(triggeredBy = "manual") {
    const runId = await claimRun(triggeredBy);
    if (!runId) {
        return { skipped: true as const, reason: "another-run-is-active" };
    }

    const c: ReconCounters = {
        subscriptionsScanned: 0,
        subscriptionsRepaired: 0,
        alertsRaised: 0,
        recordsSkipped: 0,
        paymentsBackfilled: 0,
        refundsBackfilled: 0,
    };

    log({ action: "run-started", runId, triggeredBy, staleApHours: STALE_AP_HOURS });

    try {
        const liveRows = await prisma.subscription.findMany({
            where: { status: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
            include: { plan: true, pendingPlan: true },
        });

        const scannedIds: string[] = [];

        for (const row of liveRows) {
            c.subscriptionsScanned++;

            if (!row.providerSubscriptionId) {
                log({ action: "alert", reason: "missing-provider-subscription-id", localId: row.id });
                c.alertsRaised++;
                continue;
            }

            const entity = await fetchProviderSubscription(row.providerSubscriptionId);
            if (!entity) {
                c.alertsRaised++;
                continue;
            }

            const outcome = await repairSubscription(row, entity, c);
            if (outcome !== "alerted") scannedIds.push(row.id);
            else scannedIds.push(row.id); // keep in payment/refund scope regardless
        }

        // Fresh read post-repairs so backfill uses final plan/user linkage.
        if (scannedIds.length > 0) {
            const rowsAfter = await prisma.subscription.findMany({
                where: { id: { in: scannedIds } },
            });
            for (const sub of rowsAfter) {
                await backfillPaymentsForSubscription(sub, c);
            }
            await syncRefunds(c);
        }

        await finishRun(runId, "completed", { ...c });
        log({ action: "run-completed", runId, stats: { ...c } });

        return {
            skipped: false as const,
            runId,
            stats: c,
        };
    } catch (err) {
        log({ action: "run-failed", runId, error: String(err) });
        await finishRun(runId, "failed", { error: String(err), ...c });
        throw err;
    }
}
