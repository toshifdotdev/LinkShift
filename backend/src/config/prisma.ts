import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10_000),
  idleTimeoutMillis: 30_000,
  application_name: "linkshift-api",
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});