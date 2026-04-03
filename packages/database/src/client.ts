import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

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