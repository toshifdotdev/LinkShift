import { prisma } from "../../config";
import razorpay from "../../config/razorpay";
import bcrypt from "bcrypt";
import { AppError } from "../../errors/AppError";
import { deleteImage } from "../../utils/deleteImage";
import { linkCacheKey, deleteCache } from "../../utils/cache";
import { log } from "../../utils/logger";
import { getUserPlan, getSubscriptionService } from "../billing/billing.service";



const LIVE_CANDIDATE_STATUSES = [
    "AUTHORIZATION_PENDING",
    "PAYMENT_RETRY",
    "ACTIVE",
    "HALTED",
    "PAUSED",
] as const;









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
            
            if (!/already\s+cancelled|has been cancelled|expired/i.test(description)) {
                failedProviderIds.push(providerId);
                log.error("provider_cancel_failed", {
                    providerSubscriptionId: providerId,
                    reason: description || String(err),
                });
            }
        }
    }

    if (failedProviderIds.length > 0) {
        throw new AppError(
            `Payment provider could not cancel subscription(s): ${failedProviderIds.join(", ")}. Your account has NOT been deleted. Please resolve the payment issue and try again.`,
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

export const deleteMe = async (userId: string, password: string | undefined, confirmation: string, sdk: typeof razorpay = razorpay): Promise<void> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            passwordHash: true,
            avatarPublicId: true,
        },
    });

    if (!user) {
        throw new AppError("Account not found", 404);
    }

    
    
    if (!confirmation.trim() || confirmation.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        throw new AppError("Confirmation email does not match your account email.", 400);
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

    
    
    await cancelLiveProviderSubscriptions(userId, sdk);

    
    const assetIds = await collectCloudinaryAssets(userId);

    
    const linksForCache = await prisma.link.findMany({
        where: { userId },
        select: { shortId: true, domain: { select: { host: true } } },
    });
    const ownedDomains = await prisma.domain.findMany({
        where: { userId },
        select: { host: true },
    });

    await prisma.$transaction(async (tx) => {
        
        await tx.link.deleteMany({ where: { userId } });
        
        
        await tx.domain.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
    });

    
    await Promise.all([
        ...linksForCache.map(l => deleteCache(linkCacheKey(l.domain.host, l.shortId))),
        ...ownedDomains.map(d => deleteCache(`domain:${d.host}`)),
    ]).catch(() => {});

    
    for (const publicId of assetIds) {
        try {
            await deleteImage(publicId);
        } catch (err) {
            log.warn("cloudinary_cleanup_skipped", {
                publicId,
                error: (err as Error)?.message ?? String(err),
            });
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
            provider: true,
            verified: true,
            createdAt: true,
            passwordHash: true,
        },
    });

    if (!user) {
        throw new AppError("Account not found", 404);
    }

    const plan = await getUserPlan(userId);
    const subscription = await getSubscriptionService(userId);

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        verified: user.verified,
        createdAt: user.createdAt,
        hasPassword: !!user.passwordHash,
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
