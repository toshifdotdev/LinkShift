import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PlanName, PrismaClient } from "../src/generated/prisma/client";
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });



const plans = [
    {
        name: PlanName.FREE,
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxCustomSlugsPerMonth : 0,
        maxDestinationChangesPerMonth : 3,

        usdMonthlyPrice: 0,
        usdYearlyPrice: 0,
        

        maxLinks: 50,
        maxQrPerMonth: 10,
        maxDomains: 0,
        maxRedirectsPerMonth: 2500,
        maxRedirectsWithGracePerMonth: 5000,

        analyticsDays: 30,
    },
    {
        name: PlanName.STARTER,
        monthlyPrice: 499,
        yearlyPrice: 4990,

        usdMonthlyPrice: 12,
        usdYearlyPrice: 120,

        maxCustomSlugsPerMonth: 5,
        maxDestinationChangesPerMonth: 25,

        maxLinks: 1000,
        maxQrPerMonth: 100,
        maxDomains: 1,
        maxRedirectsPerMonth: 50000,
        maxRedirectsWithGracePerMonth: 60000,

        analyticsDays: 180,
    },
    {
        name: PlanName.CREATOR,
        monthlyPrice: 999,
        yearlyPrice: 9990,

        usdMonthlyPrice: 29,
        usdYearlyPrice: 290,

        maxCustomSlugsPerMonth: 25,
        maxDestinationChangesPerMonth: 150,

        maxLinks: 10000,
        maxQrPerMonth: null,
        maxDomains: 5,
        maxRedirectsPerMonth: 500000,
        maxRedirectsWithGracePerMonth: 600000,

        analyticsDays: 365,
    },
    {
        name: PlanName.PRO,
        monthlyPrice: 4999,
        yearlyPrice: 49990,

        usdMonthlyPrice: 99,
        usdYearlyPrice: 990,

        maxCustomSlugsPerMonth : null,
        maxDestinationChangesPerMonth : null,

        maxLinks: null,
        maxQrPerMonth: null,
        maxDomains: null,
        maxRedirectsPerMonth: null,
        maxRedirectsWithGracePerMonth: null,

        analyticsDays: 1095,
    },
];


async function main() {
    // The shared system domain must never be owned by an account: userId is
    // cleared on every seed run so a row that earlier out-of-order creation
    // turned into a user's custom domain is reclaimed as the shared default.
    await prisma.domain.upsert({
        where : {
            host : "go.linkshift.in"
        },
        update : {
            verified: true,
            verifiedAt: new Date(),
            isDefault: true,
            userId: null,
        },
        create : {
            host : "go.linkshift.in",
            verified : true,
            verifiedAt: new Date(),
            isDefault : true
        }
    })


    for (const plan of plans) {
        await prisma.plan.upsert({
            where: {
                name: plan.name,
            },
            update: {
                ...plan,
            },
            create: {
                ...plan,
            },
        });
    }

    console.log("Plans seeded successfully.");
}

main().catch((err) => {
        console.error(err);
        process.exit(1);
        })
      .finally(async () => {
            await prisma.$disconnect();
      });