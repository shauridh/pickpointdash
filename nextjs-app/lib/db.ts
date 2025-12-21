import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

if (!globalForPrisma.pool) {
  const connectionString = process.env.DATABASE_URL!;
  globalForPrisma.pool = new Pool({ connectionString });
}

const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.DEBUG === "true" ? ["query", "info"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
