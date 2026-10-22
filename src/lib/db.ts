import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "./database-url.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Every serverless instance has its own pool; a small one keeps a burst of instances under Neon's connection limit.
  const adapter = new PrismaPg({ connectionString: databaseUrl(), max: process.env.VERCEL ? 3 : 10 });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development.
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
