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

        maxLinks: 50,
        maxQrPerMonth: 10,
        maxDomains: 0,
        maxRedirectsPerMonth: 2500,

        analyticsDays: 30,
    },
    {
        name: PlanName.STARTER,
        monthlyPrice: 499,
        yearlyPrice: 4990,

        maxLinks: 1000,
        maxQrPerMonth: 100,
        maxDomains: 1,
        maxRedirectsPerMonth: 50000,

        analyticsDays: 180,
    },
    {
        name: PlanName.CREATOR,
        monthlyPrice: 999,
        yearlyPrice: 9990,

        maxLinks: 10000,
        maxQrPerMonth: null,
        maxDomains: 5,
        maxRedirectsPerMonth: 500000,

        analyticsDays: 365,
    },
    {
        name: PlanName.PRO,
        monthlyPrice: 4999,
        yearlyPrice: 49990,

        maxLinks: null,
        maxQrPerMonth: null,
        maxDomains: null,
        maxRedirectsPerMonth: null,

        analyticsDays: 1095,
    },
];


async function main() {
    await prisma.domain.upsert({
        where : {
            host : "go.linkshift.in"
        },
        update : {
            verified: true,
            isDefault: true,
        },
        create : {
            host : "go.linkshift.in",
            verified : true,
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