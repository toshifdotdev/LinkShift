import { prisma } from "../../config"

export const dashboardService = async(id : string) => {
    
    const [ totalLinks , activeLinks, inactiveLinks, totalScans, topLinks] = await prisma.$transaction([
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
    ])

    return {
        totalLinks,
        totalScans,
        activeLinks,
        inactiveLinks,
        topLinks: topLinks.map(link => ({
            id: link.id,
            name: link.name,
            shortId: link.shortId,
            clicks: link._count.scans
        }))
    }
}

export const getAnalytics = async(id : string, linkId : string) => {
    const where = {
    linkId,
    link: {
        userId: id
    }
};
    const [ browserStats, deviceStats, countryStats, osStats, totalClicks ] = await prisma.$transaction([
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


