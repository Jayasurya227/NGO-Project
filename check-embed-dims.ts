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
  const total = await prisma.initiative.count();
  const withEmbed = await prisma.$queryRaw`SELECT COUNT(*) as c FROM "Initiative" WHERE "embeddingVector" IS NOT NULL` as any[];
  const sample = await prisma.$queryRaw`SELECT id, title, vector_dims("embeddingVector") as dims FROM "Initiative" WHERE "embeddingVector" IS NOT NULL LIMIT 3` as any[];
  console.log("Total initiatives:", total);
  console.log("With embeddings:", withEmbed[0]?.c?.toString());
  console.log("Sample dims:", sample);
  await prisma.$disconnect();
}
main().catch(console.error);
