import { prisma } from "../../config"
import { getCache, setCache } from "../../utils/cache";
import { getAnalyticsCutoff } from "../billing/billing.service";
import { analyticsMapper } from "./dashboard.mapper"


type TopLinks = {
    id: string;
    name: string | null;
    shortId: string;
    clicks: number;
}

type DailyStats = {
    day: Date;
    clicks: bigint;
};

type cacheBoard = {
    totalLinks : number , 
    activeLinks : number, 
    inactiveLinks : number, 
    totalScans : number, 
    topLinks : TopLinks[],
};

export const dashboardService = async(id : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);

    const cachedKey = `dashboard:${id}:${requestedDays ?? "default"}`;

    let cachedDashboard = await getCache(cachedKey);

    if(cachedDashboard) {
        return JSON.parse(cachedDashboard);
    }


    const [ totalLinks , activeLinks, inactiveLinks, totalScans, topScanGroups ] = await Promise.all([
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


        prisma.scan.count({
            where: {
                link: {
                    userId: id
                },
                scannedAt : {
                    gte : cutoff
                }
            },
        }),

        await prisma.scan.groupBy({
            by: ['linkId'],
            where: {
                link: {
                    userId: id,
                },
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
            };
        })
        .filter((link): link is TopLinks => link !== null);


    const analytics : cacheBoard = {
        totalLinks  , 
        activeLinks , 
        inactiveLinks, 
        totalScans, 
        topLinks
    }

    await setCache(cachedKey, analytics, 30);

    return analytics;
}

export const getAnalytics = async(id : string, linkId : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);
    const where = {
        linkId,
        link: {
            userId: id
        },
        scannedAt : {
            gte : cutoff
        }
    };

    const [ browserStats, deviceStats, countryStats, osStats, totalClicks, utmSource, utmMedium, utmCampaign, utmTerm, utmContent ] = await Promise.all([
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
    ])

    return {
        totalClicks,
        browserStats, 
        deviceStats, 
        countryStats, 
        osStats,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent
    };

}



export const getActivity = async(id : string, requestedDays ?: number) => {
    const cutoff = await getAnalyticsCutoff(id, requestedDays);

    const scans = await prisma.scan.findMany({
        where : {
            link : {
                userId : id
            },
            scannedAt: {
                gte: cutoff,
            },
        },
        include : {
            link : {
                select : {
                    name  : true,
                    shortId : true,
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

    const where = {
        linkId,
        link: {
            userId: id
        },
        scannedAt : {
            gte : cutoff
        }
    };

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
                DATE(s.scannedAt) AS day,
                COUNT(*) AS clicks
            FROM Scan s
            JOIN Link l
                ON s.linkId = l.id
            WHERE
                s.linkId = ${linkId}
                AND l.userId = ${id}
                AND s.scannedAt >= ${cutoff}
            GROUP BY DATE(s.scannedAt)
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
