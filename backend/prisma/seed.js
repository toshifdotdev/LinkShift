"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../src/generated/prisma/client");
const connectionString = process.env.DATABASE_URL;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    await prisma.domain.upsert({
        where: {
            host: "go.linkshift.in"
        },
        update: {
            verified: true,
            isDefault: true,
        },
        create: {
            host: "go.linkshift.in",
            verified: true,
            isDefault: true
        }
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
