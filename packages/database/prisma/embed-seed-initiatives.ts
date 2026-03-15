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