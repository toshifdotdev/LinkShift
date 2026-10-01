import { prisma } from "../../config";
import { redisClient } from "../../config/redis";

export type ComponentStatus = "operational" | "degraded" | "down";

export interface StatusComponent {
    id: string;
    name: string;
    status: ComponentStatus;
}

export interface StatusPayload {
    status: ComponentStatus;
    updatedAt: string;
    components: StatusComponent[];
}

const PROBE_TIMEOUT_MS = 1500;

const probe = async <T>(work: Promise<T>): Promise<T | null> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            work,
            new Promise<null>((resolve) => {
                timer = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
            }),
        ]);
    } catch {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
};

const worst = (statuses: ComponentStatus[]): ComponentStatus =>
    statuses.includes("down")
        ? "down"
        : statuses.includes("degraded")
          ? "degraded"
          : "operational";

export const readStatus = async (): Promise<StatusPayload> => {
    const database = await probe(prisma.$queryRaw`SELECT 1`.then(() => true));
    const cache = await probe(Promise.resolve(redisClient.isReady));

    const components: StatusComponent[] = [
        { id: "api", name: "API and redirects", status: "operational" },
        {
            id: "database",
            name: "Link and analytics storage",
            status: database === true ? "operational" : "down",
        },
        {
            id: "cache",
            name: "Redirect cache",
            status: cache === true ? "operational" : "degraded",
        },
    ];

    return {
        status: worst(components.map((c) => c.status)),
        updatedAt: new Date().toISOString(),
        components,
    };
};