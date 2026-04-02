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

const prisma = new PrismaClient();

async function main() {
  const initiatives = await prisma.initiative.findMany({
    select: { id: true, tenantId: true },
  });

  console.log(`Found ${initiatives.length} initiatives to embed...`);

  // Import embedAndSaveInitiative directly — no queue needed
  const { embedAndSaveInitiative } = await import(
    "../../agents/src/utils/embeddings"
  );

  for (const init of initiatives) {
    console.log(`[embedding] Generating vector for initiative: ${init.id}`);
    await embedAndSaveInitiative(init.id);
    console.log(`[embedding] Vector saved for: ${init.id}`);
  }

  console.log("Done. All embeddings generated.");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(console.error);