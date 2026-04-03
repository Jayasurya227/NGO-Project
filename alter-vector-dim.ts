import { readFileSync } from "fs";
import { resolve } from "path";
function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}
loadEnv();

import { prisma } from "@ngo/database";

async function main() {
  // Drop any vector indexes first
  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Initiative_embeddingVector_idx"`);
    console.log("Dropped vector index (if existed)");
  } catch (e: any) { console.log("Index drop skipped:", e.message); }

  // Clear existing embeddings so ALTER can proceed without cast errors
  await prisma.$executeRawUnsafe(`UPDATE "Initiative" SET "embeddingVector" = NULL`);
  console.log("Cleared existing embeddings");

  // Alter column to 3072 dimensions
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Initiative" ALTER COLUMN "embeddingVector" TYPE vector(3072)`
  );
  console.log("Column altered to vector(3072)");

  await prisma.$disconnect();
}

main().catch(console.error);
