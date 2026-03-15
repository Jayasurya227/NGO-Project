import { PrismaClient } from "@prisma/client";

// Explicitly set DATABASE_URL if not already set
// This handles the case where dotenv hasn't loaded yet
if (!process.env.DATABASE_URL) {
  const { config } = require("dotenv");
  const { join } = require("path");
  // Try multiple possible locations for .env
  config({ path: join(process.cwd(), ".env") });
  config({ path: join(process.cwd(), "../../.env") });
  config({ path: join(process.cwd(), "../../../.env") });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;