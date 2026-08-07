
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
}

main().catch((err) => {
        console.error(err);
        process.exit(1);
        })
      .finally(async () => {
            await prisma.$disconnect();
      });