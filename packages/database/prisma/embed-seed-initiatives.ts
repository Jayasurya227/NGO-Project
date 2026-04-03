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

import { prisma } from "../src/client";
import { queues } from "@ngo/queue";

async function main() {
  const initiatives = await prisma.initiative.findMany({
    select: { id: true, tenantId: true },
  });

  console.log(`Enqueuing embedding jobs for ${initiatives.length} initiatives...`);

  for (const init of initiatives) {
    await queues.initiativeEmbedding.add("embed", {
      initiativeId: init.id,
      tenantId: init.tenantId,
    });
  }

  console.log("Done. Start the embedding worker to process.");
  process.exit(0);
}

main().catch(console.error);
