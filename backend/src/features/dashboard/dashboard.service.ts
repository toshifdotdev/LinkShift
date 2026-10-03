import { prisma } from "../../config"
import { getCache, setCache } from "../../utils/cache";
import { getAnalyticsCutoff, getUserPlan, planRankOf } from "../billing/billing.service";
import { analyticsMapper } from "./dashboard.mapper"
import { withHumanClicks } from "./clickFilters";

type TopLinks = {
    id: string;
    name: string | null;
    shortId: string;
    clicks: number;
    domainHost: string;
}

type DailyStats = {
    day: Date;
    clicks: bigint;
};

type HourRow = {
    hour: number;
    clicks: bigint;
};

type HeatRow = {
    dow: number;
    hour: number;
    clicks: bigint;
};

type UniqueRow = {
    unique: bigint;
};

type cacheBoard = {
    totalLinks : number , 
    activeLinks : number, 
    inactiveLinks : number, 
    totalScans : number, 
    uniqueScans : number,
    botRequests : number,
    allTimeTotalScans : number,
    firstScanAt : Date | null,
    lastScanAt : Date | null,
    prevTotalScans : number,
    prevUniqueScans : number,
    topLinks : TopLinks[],
    dailyStats : { day: Date; clicks: number }[],
    hourlyStats : { hour: number; count: number }[],
};

export const dashboardService = async(id : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);
    const rank = planRankOf((await getUserPlan(id)).name);

    const cachedKey = `dashboard:v4:${id}:${requestedDays ?? "default"}`;

    let cachedDashboard = await getCache(cachedKey);

    if(cachedDashboard) {
        return JSON.parse(cachedDashboard);
    }

    const windowMs = cutoff.getTime();
        const prevCutoff = new Date(windowMs - (Date.now() - windowMs));
        const humanWhere = {
            link: { userId: id },
            isBot: false,
            scannedAt : { gte : cutoff }
        };
    
        const [ totalLinks , activeLinks, inactiveLinks, totalScans, uniqueScans, botRequests, prevTotalScans, prevUniqueScans, allTimeAgg, topScanGroups ] = await Promise.all([
        prisma.link.count({
            where : {
                userId : id
            }
        }),
        prisma.link.count({
            where : {
                userId : id,
                isActive : true
            }
        }),
        prisma.link.count({
            where : {
                userId : id,
                isActive : false
            }
        }),

        prisma.scan.count({ where: humanWhere }),

        // Unique clicks: distinct truncated addresses per the product privacy
        // model (IPv4 first three octets / IPv6 first 48 bits, truncated at write
        // time). A scan with no address - a privacy relay - falls back to its own
        // row so it is counted once, never dropped.
        prisma.$queryRaw<UniqueRow[]>`
            SELECT COUNT(DISTINCT COALESCE(s."ipAddress", s.id))::int AS unique
            FROM "Scan" s
            JOIN "Link" l ON s."linkId" = l.id
            WHERE l."userId" = ${id}
              AND s."isBot" = false
              AND s."scannedAt" >= ${cutoff}
        `,

        // Machine requests are stored but never counted as clicks (the product
        // promise), yet the owner still needs to see that they happened —
        // this is the number the account view discloses next to the KPIs.
        prisma.scan.count({
            where: {
                link: {
                    userId: id
                },
                isBot: true,
                scannedAt : {
                    gte : cutoff
                }
            },
        }),

        // Previous window of equal length for the period-over-period delta.
        // Same human-only rule, so the two totals are comparable.
        prisma.scan.count({ where: { ...humanWhere, scannedAt: { gte: prevCutoff, lt: cutoff } } }),
        prisma.$queryRaw<UniqueRow[]>`
            SELECT COUNT(DISTINCT COALESCE(s."ipAddress", s.id))::int AS unique
            FROM "Scan" s
            JOIN "Link" l ON s."linkId" = l.id
            WHERE l."userId" = ${id}
              AND s."isBot" = false
              AND s."scannedAt" >= ${prevCutoff}
              AND s."scannedAt" < ${cutoff}
        `,

// Lifetime human clicks and the account's first-ever scan. The ledger counts
        // lifetime; the dashboard counts the window. Without this pair the two
        // surfaces disagree silently (175 in the ledger, 0 on the dashboard) and
        // the owner reads it as data loss.
        prisma.scan.aggregate({
            where: { link: { userId: id }, isBot: false },
            _count: { _all: true },
            _min: { scannedAt: true },
            _max: { scannedAt: true },
        }),

                await prisma.scan.groupBy({
            by: ['linkId'],
            where: {
                link: {
                    userId: id,
                },
                isBot: false,
                scannedAt: {
                    gte: cutoff,
                },
            },
            _count: {
                _all: true,
            },
            orderBy: {
                _count: {
                    linkId: 'desc',
                },
            },
            take: 5,
        })
    ]);

    const topLinkIds = topScanGroups.map(item => item.linkId);

    const topLinkData = await prisma.link.findMany({
        where: {
            id: {
                in: topLinkIds,
            },
            userId: id,
        },
        select: {
            id: true,
            name: true,
            shortId: true,
            domain: {
                select: { host: true }
            }
        },
    });

    const linkMap = new Map(
        topLinkData.map(link => [link.id, link])
    );

    const topLinks = topScanGroups
        .map(item => {
            const link = linkMap.get(item.linkId);

            if (!link) return null;

            return {
                id: link.id,
                name: link.name,
                shortId: link.shortId,
                clicks: item._count._all,
                domainHost: link.domain.host,
            };
        })
        .filter((link): link is TopLinks => link !== null);

    const dailyRows = await prisma.$queryRaw<DailyStats[]>`
            SELECT
                DATE(s."scannedAt") AS day,
                COUNT(*) AS clicks
            FROM "Scan" s
            JOIN "Link" l
                ON s."linkId" = l.id
            WHERE
                l."userId" = ${id}
                AND s."isBot" = false
                AND s."scannedAt" >= ${cutoff}
            GROUP BY DATE(s."scannedAt")
            ORDER BY day ASC
            `;

    
    const hourlyRows = rank >= planRankOf("STARTER")
        ? await prisma.$queryRaw<HourRow[]>`
            SELECT
                EXTRACT(HOUR FROM s."scannedAt")::int AS hour,
                COUNT(*) AS clicks
            FROM "Scan" s
            JOIN "Link" l
                ON s."linkId" = l.id
            WHERE
                l."userId" = ${id}
                AND s."isBot" = false
                AND s."scannedAt" >= ${cutoff}
            GROUP BY 1
            ORDER BY 1
            `
        : [];

    const analytics : cacheBoard = {
        totalLinks  , 
        activeLinks , 
        inactiveLinks, 
        totalScans, 
        uniqueScans : Number(uniqueScans[0]?.unique ?? 0),
        botRequests,
        allTimeTotalScans : allTimeAgg._count._all,
        firstScanAt : allTimeAgg._min.scannedAt,
        lastScanAt : allTimeAgg._max.scannedAt,
        prevTotalScans,
        prevUniqueScans : Number(prevUniqueScans[0]?.unique ?? 0),
        topLinks,
        dailyStats: dailyRows.map(item => ({
            day: item.day,
            clicks: Number(item.clicks)
        })),
        hourlyStats: hourlyRows.map(item => ({
            hour: item.hour,
            count: Number(item.clicks)
        }))
    }

    await setCache(cachedKey, analytics, 30);

    return analytics;
}

export const getAnalytics = async(id : string, linkId : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);
    const rank = planRankOf((await getUserPlan(id)).name);
    
    
    const where = withHumanClicks({
        linkId,
        link: {
            userId: id
        },
        scannedAt : {
            gte : cutoff
        }
    });
    const botWhere = { ...where, isBot: true };
    const prevCutoff = new Date(cutoff.getTime() - (Date.now() - cutoff.getTime()));

    const [ browserStats, deviceStats, countryStats, osStats, totalClicks, allTimeAgg, uniqueClicks, prevTotalClicks, prevUniqueClicks, referrerStats, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, cityStats, botRequests, hourlyRows, heatRows ] = await Promise.all([
        prisma.scan.groupBy({
            by : ['browser'],
            where,
            _count : { _all : true, },
            orderBy : {
                _count : {
                    browser : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['device'],  
            where,
            _count : { _all : true, },
            orderBy : {
                _count : {
                    device : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['country'], 
            where,
            _count : { _all : true, },
            orderBy : {
                _count : {
                    country : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['os'],
            where,
            _count : { _all : true, },
            orderBy : {
                _count : {
                    os : 'desc'
                }
            }
        }),

        prisma.scan.count({
            where
        }),

        // Lifetime human clicks for this link plus its first and last scan.
        // The ledger shows lifetime; this view shows the window. Both numbers
        // on screen is what turns '175 there, 0 here' from a bug report into a
        // readable answer.
        prisma.scan.aggregate({
            where: { linkId, link: { userId: id }, isBot: false },
            _count: { _all: true },
            _min: { scannedAt: true },
            _max: { scannedAt: true },
        }),

        // Unique clicks for this link: distinct truncated addresses (privacy
        // model: IPv4 first three octets / IPv6 first 48 bits). A scan with no
        // address falls back to its own row so it is counted once, never lost.
        prisma.$queryRaw<UniqueRow[]>`
            SELECT COUNT(DISTINCT COALESCE(s."ipAddress", s.id))::int AS unique
            FROM "Scan" s
            JOIN "Link" l ON s."linkId" = l.id
            WHERE s."linkId" = ${linkId}
              AND l."userId" = ${id}
              AND s."isBot" = false
              AND s."scannedAt" >= ${cutoff}
        `,

        // Previous window of equal length for the period-over-period delta.
        prisma.scan.count({
            where: {
                linkId,
                link: { userId: id },
                isBot: false,
                scannedAt: { gte: prevCutoff, lt: cutoff },
            },
        }),
        prisma.$queryRaw<UniqueRow[]>`
            SELECT COUNT(DISTINCT COALESCE(s."ipAddress", s.id))::int AS unique
            FROM "Scan" s
            JOIN "Link" l ON s."linkId" = l.id
            WHERE s."linkId" = ${linkId}
              AND l."userId" = ${id}
              AND s."isBot" = false
              AND s."scannedAt" >= ${prevCutoff}
              AND s."scannedAt" < ${cutoff}
        `,

        prisma.scan.groupBy({
            by : ["referrer"],
            where,
            _count : { _all : true },
            orderBy : {
                _count : {
                    referrer : "desc"
                }
            }
        }),

        prisma.scan.groupBy({
            by : ["utmSource"],
            where,
            _count : { _all : true},
            orderBy : {
                _count : {
                    utmSource : "desc"
                }
            }
        }),

        prisma.scan.groupBy({
            by : ["utmMedium"],
            where,
            _count : {
                _all : true
            },
            orderBy : {
                _count : {
                    utmMedium : "desc"
                }
            }
        }),

        prisma.scan.groupBy({
            by : ["utmCampaign"],
            where,
            _count : { _all : true },
            orderBy : {
                _count : {
                    utmCampaign : "desc"
                }
            }
        }),

        prisma.scan.groupBy({
            by : ["utmTerm"],
            where,
            _count : {
                _all : true
            },
            orderBy : {
                _count : {
                    utmTerm : "desc"
                }
            }
        }),

        prisma.scan.groupBy({
            by: ["utmContent"],
            where,
            _count: {
                _all: true,
            },
            orderBy: {
                _count: {
                    utmContent: "desc",
                },
            },
        }),

        prisma.scan.groupBy({
            by : ['city'],
            where,
            _count : { _all : true },
            orderBy : {
                _count : {
                    city : 'desc'
                }
            }
        }),

        prisma.scan.count({
            where: botWhere,
        }),

        prisma.$queryRaw<HourRow[]>`
            SELECT
                EXTRACT(HOUR FROM s."scannedAt")::int AS hour,
                COUNT(*) AS clicks
            FROM "Scan" s
            JOIN "Link" l
                ON s."linkId" = l.id
            WHERE
                s."linkId" = ${linkId}
                AND l."userId" = ${id}
                AND s."isBot" = false
                AND s."scannedAt" >= ${cutoff}
            GROUP BY 1
            ORDER BY 1
            `,

        prisma.$queryRaw<HeatRow[]>`
            SELECT
                EXTRACT(DOW FROM s."scannedAt")::int AS dow,
                EXTRACT(HOUR FROM s."scannedAt")::int AS hour,
                COUNT(*) AS clicks
            FROM "Scan" s
            JOIN "Link" l
                ON s."linkId" = l.id
            WHERE
                s."linkId" = ${linkId}
                AND l."userId" = ${id}
                AND s."isBot" = false
                AND s."scannedAt" >= ${cutoff}
            GROUP BY 1, 2
            ORDER BY 1, 2
            `,
    ])

    
    
    const starterUnlocked = rank >= planRankOf("STARTER");
    const creatorUnlocked = rank >= planRankOf("CREATOR");
    const proUnlocked = rank >= planRankOf("PRO");

    return {
        totalClicks,
        allTimeTotalClicks : allTimeAgg._count._all,
        firstScanAt : allTimeAgg._min.scannedAt,
        lastScanAt : allTimeAgg._max.scannedAt,
        uniqueClicks: Number(uniqueClicks[0]?.unique ?? 0),
        prevTotalClicks,
        prevUniqueClicks: Number(prevUniqueClicks[0]?.unique ?? 0),
        botRequests,
        deviceStats: deviceStats.map(item => ({
            device: item.device ?? "Unknown",
            count: item._count._all
        })),
        countryStats: countryStats.map(item => ({
            country: item.country ?? "Unknown",
            count: item._count._all
        })),
        browserStats: starterUnlocked
            ? browserStats.map(item => ({ browser: item.browser ?? "Unknown", count: item._count._all }))
            : [],
        osStats: starterUnlocked
            ? osStats.map(item => ({ os: item.os ?? "Unknown", count: item._count._all }))
            : [],
        referrerStats: creatorUnlocked
            ? referrerStats.map(item => ({ referrer: item.referrer, count: item._count._all }))
            : [],
        utmSource: creatorUnlocked
            ? utmSource.map(item => ({ utmSource: item.utmSource, count: item._count._all }))
            : [],
        utmMedium: creatorUnlocked
            ? utmMedium.map(item => ({ utmMedium: item.utmMedium, count: item._count._all }))
            : [],
        utmCampaign: creatorUnlocked
            ? utmCampaign.map(item => ({ utmCampaign: item.utmCampaign, count: item._count._all }))
            : [],
        utmTerm: creatorUnlocked
            ? utmTerm.map(item => ({ utmTerm: item.utmTerm, count: item._count._all }))
            : [],
        utmContent: creatorUnlocked
            ? utmContent.map(item => ({ utmContent: item.utmContent, count: item._count._all }))
            : [],
        hourlyStats: starterUnlocked
            ? hourlyRows.map(item => ({ hour: item.hour, count: Number(item.clicks) }))
            : [],
        cityStats: creatorUnlocked
            ? cityStats.map(item => ({ city: item.city ?? "Unknown", count: item._count._all }))
            : [],
        heatmapStats: proUnlocked
            ? heatRows.map(item => ({ dow: item.dow, hour: item.hour, count: Number(item.clicks) }))
            : [],
    };

}

export const getActivity = async(id : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);

    const scans = await prisma.scan.findMany({
        where : withHumanClicks({
            link : {
                userId : id
            },
            scannedAt: {
                gte: cutoff,
            },
        }),
include : {
                link : {
                    select : {
                        name  : true,
                        shortId : true,
                        // Carried through so an owner reading the activity feed
                        // can see which campaign a click belonged to without
                        // having to open the link.
                        tags : { include : { tag : { select : { id : true, name : true } } } },
                    }
                }
            },
            orderBy : {
                scannedAt : 'desc'
            },
            take : 10
        })
        return scans.map(analyticsMapper);
}

export const getChartData = async(id : string, linkId : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);

    
    const where = withHumanClicks({
        linkId,
        link: {
            userId: id
        },
        scannedAt : {
            gte : cutoff
        }
    });

    const[browserStats, countryStats, deviceStats, osStats, utmSourceStats, utmMediumStats, utmCampaignStats, utmTermStats, utmContentStats] = await Promise.all([
        prisma.scan.groupBy({
            by : ['browser'],
            where,
            _count : { _all : true },
        }),

        prisma.scan.groupBy({
            by : ['country'],
            where,
            _count : { _all : true },
        }),

        prisma.scan.groupBy({
            by : ['device'],
            where,
            _count : { _all : true },
        }),

        prisma.scan.groupBy({
            by : ['os'],
            where,
            _count : { _all : true },
        }),

        prisma.scan.groupBy({
            by: ["utmSource"],
            where,
            _count: {
                _all: true,
            },
        }),

        prisma.scan.groupBy({
            by: ["utmMedium"],
            where,
            _count: {
                _all: true,
            },
        }),

        prisma.scan.groupBy({
            by: ["utmCampaign"],
            where,
            _count: {
                _all: true,
            },
        }),

        prisma.scan.groupBy({
            by: ["utmTerm"],
            where,
            _count: {
                _all: true,
            },
        }),

        prisma.scan.groupBy({
            by: ["utmContent"],
            where,
            _count: {
                _all: true,
            },
        }),
    ]);

    
    
    const dailyStats = await prisma.$queryRaw<DailyStats[]>`
            SELECT
                DATE(s."scannedAt") AS day,
                COUNT(*) AS clicks
            FROM "Scan" s
            JOIN "Link" l
                ON s."linkId" = l.id
WHERE
                  s."linkId" = ${linkId}
                  AND l."userId" = ${id}
                  AND s."isBot" = false
                  AND s."scannedAt" >= ${cutoff}
              GROUP BY DATE(s."scannedAt")
              ORDER BY day ASC
              `;

    return {
        browserStats : browserStats.map(item => ({
            browser: item.browser ?? "Unknown",
            count: item._count._all
        })),
        countryStats : countryStats.map(item => ({
            country: item.country ?? "Unknown",
            count: item._count._all
        })), 
        deviceStats : deviceStats.map(item => ({
            device : item.device ?? "Unknown",
            count : item._count._all
        })), 
        osStats : osStats.map(item => ({
            os : item.os ?? "Unknown",
            count : item._count._all
        })), 
        dailyStats : dailyStats.map(item => ({
            day: item.day,
            clicks: Number(item.clicks)
        })),
        utmSourceStats: utmSourceStats.map(item => ({
            source: item.utmSource ?? "Unknown",
            count: item._count._all,
        })),

        utmMediumStats: utmMediumStats.map(item => ({
            medium: item.utmMedium ?? "Unknown",
            count: item._count._all,
        })),

        utmCampaignStats: utmCampaignStats.map(item => ({
            campaign: item.utmCampaign ?? "Unknown",
            count: item._count._all,
        })),

        utmTermStats: utmTermStats.map(item => ({
            term: item.utmTerm ?? "Unknown",
            count: item._count._all,
        })),

        utmContentStats: utmContentStats.map(item => ({
            content: item.utmContent ?? "Unknown",
            count: item._count._all,
        })),
    }
}
