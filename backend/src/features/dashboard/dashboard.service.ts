import { prisma } from "../../config"
import { getCache, setCache } from "../../utils/cache";
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

export const dashboardService = async(id : string) => {
    const cachedKey = `dashboard:${id}`;
    let cachedDashboard = await getCache(cachedKey);

    if(cachedDashboard) {
        return JSON.parse(cachedDashboard);
    }


    const [ totalLinks , activeLinks, inactiveLinks, totalScans, dbtopLinks ] = await Promise.all([
        prisma.link.count({
            where : {
                userId : id
            }
        }),
        prisma.link.count({
            where : {
                userId : id,
                isActive : true
            },
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
                }
            }
        }),

        prisma.link.findMany({
            where : {
                userId : id
            },
            orderBy : [ {
                _count : {
                    scans : 'desc'
                }
            },
            {
                createdAt : 'asc'
            }
            ],
            take : 5,
            select : {
                id : true,
                name :true,
                shortId : true,
                _count : {
                    select : {
                        scans : true
                    }
                }
            },
        })
    ]);

    const topLinks = dbtopLinks.map(link => ({
            id: link.id,
            name: link.name,
            shortId: link.shortId,
            clicks: link._count.scans
        }))

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

export const getAnalytics = async(id : string, linkId : string) => {
    const where = {
        linkId,
        link: {
            userId: id
        }
    };
    const [ browserStats, deviceStats, countryStats, osStats, totalClicks ] = await Promise.all([
        prisma.scan.groupBy({
            by : ['browser'],
            where,
            _count : { _all : true, browser: true },
            orderBy : {
                _count : {
                    browser : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['device'],  
            where,
            _count : { _all : true, device: true },
            orderBy : {
                _count : {
                    device : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['country'], 
            where,
            _count : { _all : true, country: true },
            orderBy : {
                _count : {
                    country : 'desc'
                }
            }
        }),

        prisma.scan.groupBy({
            by : ['os'],
            where,
            _count : { _all : true, os: true },
            orderBy : {
                _count : {
                    os : 'desc'
                }
            }
        }),

        prisma.scan.count({
            where
        })
    ])

    return {
        totalClicks,
        browserStats, 
        deviceStats, 
        countryStats, 
        osStats,
    };

}



export const getActivity = async(id : string) => {
    const scans = await prisma.scan.findMany({
        where : {
            link : {
                userId : id
            }
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


export const getChartData = async(id : string, linkId : string) => {
    const where = {
        linkId,
        link: {
            userId: id
        }
    };

    const[browserStats, countryStats, deviceStats, osStats] = await Promise.all([
        prisma.scan.groupBy({
            by : ['browser'],
            where,
            _count : { browser: true },
        }),

        prisma.scan.groupBy({
            by : ['country'],
            where,
            _count : { country: true },
        }),

        prisma.scan.groupBy({
            by : ['device'],
            where,
            _count : { device: true },
        }),

        prisma.scan.groupBy({
            by : ['os'],
            where,
            _count : { os: true },
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
            GROUP BY DATE(s.scannedAt)
            ORDER BY day ASC
            `;

    return {
        browserStats : browserStats.map(item => ({
            browser: item.browser ?? "Unknown",
            count: item._count.browser
        })),
        countryStats : countryStats.map(item => ({
            country: item.country ?? "Unknown",
            count: item._count.country
        })), 
        deviceStats : deviceStats.map(item => ({
            device : item.device ?? "Unknown",
            count : item._count.device
        })), 
        osStats : osStats.map(item => ({
            os : item.os ?? "Unknown",
            count : item._count.os
        })), 
        dailyStats : dailyStats.map(item => ({
            day: item.day,
            clicks: Number(item.clicks)
        }))
    }
}
