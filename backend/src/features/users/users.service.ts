import { prisma } from "../../config";
import razorpay from "../../config/razorpay";
import bcrypt from "bcrypt";
import { AppError } from "../../errors/AppError";
import { deleteImage } from "../../utils/deleteImage";
import { linkCacheKey, deleteCache } from "../../utils/cache";
import { getUserPlan, getSubscriptionService } from "../billing/billing.service";

// Non-terminal local states imply a provider mandate that could still charge.
// Terminal states (CANCELLED/COMPLETED/EXPIRED) are already dead at Razorpay.
const LIVE_CANDIDATE_STATUSES = [
    "AUTHORIZATION_PENDING",
    "PAYMENT_RETRY",
    "ACTIVE",
    "HALTED",
    "PAUSED",
] as const;

// ---------------------------------------------------------------------------
// Account deletion — Option A (provider-first, abort-on-failure)
//
// NOTHING local is mutated until every live provider mandate has been
// successfully cancelled. Any cancellation failure aborts with 502 and the
// account remains fully intact and retryable.
// ---------------------------------------------------------------------------

async function cancelLiveProviderSubscriptions(userId: string, sdk: typeof razorpay): Promise<void> {
    const candidates = await prisma.subscription.findMany({
        where: {
            userId,
            status: { in: [...LIVE_CANDIDATE_STATUSES] },
            providerSubscriptionId: { not: null },
        },
        select: { id: true, providerSubscriptionId: true },
    });

    const failedProviderIds: string[] = [];

    for (const sub of candidates) {
        const providerId = sub.providerSubscriptionId!;
        try {
            await sdk.subscriptions.cancel(providerId);
        } catch (err) {
            const description = String(
                (err as any)?.error?.description ?? (err as any)?.message ?? ""
            );
            // Already terminal at the provider is success for our purposes.
            if (!/already\s+cancelled|has been cancelled|expired/i.test(description)) {
                failedProviderIds.push(providerId);
                console.error(`[users] provider cancel failed for ${providerId}:`, description || err);
            }
        }
    }

    if (failedProviderIds.length > 0) {
        throw new AppError(
            `Payment provider could not cancel subscription(s): ${failedProviderIds.join(", ")}. Your account has NOT been deleted — please resolve payment issues and try again.`,
            502
        );
    }
}

async function collectCloudinaryAssets(userId: string): Promise<string[]> {
    const [user, qrs] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { avatarPublicId: true },
        }),
        prisma.qr.findMany({
            where: { link: { userId } },
            select: { imagePublicId: true, logoPublicId: true },
        }),
    ]);

    return [
        user?.avatarPublicId,
        ...qrs.flatMap(q => [q.imagePublicId, q.logoPublicId]),
    ].filter((id): id is string => !!id);
}

export const deleteMe = async (userId: string, password: string | undefined, sdk: typeof razorpay = razorpay): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            passwordHash: true,
            avatarPublicId: true,
        },
    });

    if (!user) {
        throw new AppError("Account not found", 404);
    }


    if (user.passwordHash) {
        if (!password) {
            throw new AppError("Password confirmation is required to delete your account.", 400);
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            throw new AppError("Invalid credentials.", 403);
        }
    }

    // Provider-first: if ANY live mandate cannot be cancelled, abort before a
    // single row is touched. The user can retry after fixing payment issues.
    await cancelLiveProviderSubscriptions(userId, sdk);

    // Cloudinary assets to remove post-commit (best-effort, non-blocking).
    const assetIds = await collectCloudinaryAssets(userId);

    // Cache keys to clear post-commit (host-aware, per Wave M1).
    const linksForCache = await prisma.link.findMany({
        where: { userId },
        select: { shortId: true, domain: { select: { host: true } } },
    });
    const ownedDomains = await prisma.domain.findMany({
        where: { userId },
        select: { host: true },
    });

    await prisma.$transaction(async (tx) => {
        // Link.userId FK is RESTRICT — links must go before the user.
        await tx.link.deleteMany({ where: { userId } });
        // Owned non-default domains: delete so the host can be re-registered by
        // anyone later. The shared default domain has no owner and survives.
        await tx.domain.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
    });

    // Post-commit cache invalidation (millisecond window; bounded residual).
    await Promise.all([
        ...linksForCache.map(l => deleteCache(linkCacheKey(l.domain.host, l.shortId))),
        ...ownedDomains.map(d => deleteCache(`domain:${d.host}`)),
    ]).catch(() => {});

    // Best-effort CDN cleanup AFTER commit — orphaned assets are harmless.
    for (const publicId of assetIds) {
        try {
            await deleteImage(publicId);
        } catch (err) {
            console.warn(`[users] cloudinary cleanup skipped for ${publicId}:`, err);
        }
    }
};


export const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
        },
    });

    if (!user) {
        throw new AppError("Account not found", 404);
    }

    const plan = await getUserPlan(userId);
    const subscription = await getSubscriptionService(userId);

    return {
        ...user,
        plan: { name: plan.name },
        subscription: subscription
            ? {
                  status: subscription.status,
                  billingCycle: subscription.billingCycle,
                  currentPeriodEnd: subscription.currentPeriodEnd,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              }
            : null,
    };
};

export const updateName = async (userId: string, name: string) => {
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { name },
            select: { id: true, name: true, email: true, avatarUrl: true },
        });
        return user;
    } catch (err) {
        if ((err as any).code === "P2025") {
            throw new AppError("Account not found", 404);
        }
        throw err;
    }
};
