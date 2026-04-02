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
import { embedText, buildInitiativeEmbeddingText } from "./packages/agents/src/utils/embeddings";

async function main() {
  const initiatives = await prisma.initiative.findMany({
    select: { id: true, title: true, sector: true, description: true, geography: true, sdgTags: true, targetBeneficiaries: true },
  });

  console.log(`Re-embedding ${initiatives.length} initiatives with gemini-embedding-001 (3072 dims)...`);

  for (const init of initiatives) {
    const text = buildInitiativeEmbeddingText({
      title: init.title,
      sector: init.sector,
      description: init.description,
      geography: init.geography as Record<string, unknown>,
      sdgTags: init.sdgTags,
      targetBeneficiaries: init.targetBeneficiaries,
    });

    const vector = await embedText(text);
    const vectorStr = `[${vector.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE "Initiative" SET "embeddingVector" = '${vectorStr}'::vector WHERE id = '${init.id}'`
    );
    console.log(`  ✓ ${init.title} (${vector.length} dims)`);
  }

  console.log("\nDone. All initiatives re-embedded with 3072 dims.");
  await prisma.$disconnect();
}

main().catch(console.error);
