import { Prisma } from "../../generated/prisma/client";

export const HUMAN_CLICKS_ONLY = { isBot: false } as const;

export const BOT_REQUESTS_ONLY = { isBot: true } as const;

export const withHumanClicks = <T extends Record<string, unknown>>(
    where: T,
): T & { isBot: false } => ({ ...where, isBot: false });

export const HUMAN_CLICKS_SQL = 's."isBot" = false';

export type ScanWhere = Prisma.ScanWhereInput;