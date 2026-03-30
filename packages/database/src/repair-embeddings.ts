import { PrismaClient } from "@prisma/client";
import { embedAndSaveInitiative } from "../../agents/src/utils/embeddings";

const prisma = new PrismaClient();

async function repair() {
  const initiatives = await prisma.initiative.findMany({
    select: { id: true, title: true, tenantId: true }
  });
  
  console.log(`Checking ${initiatives.length} initiatives...`);

  for (const init of initiatives) {
    try {
      console.log(`Processing: ${init.title} (${init.id})`);
      
      // 1. Generate/Save embedding
      await embedAndSaveInitiative(init.id);
      
      // 2. Ensure AgentJobLog exists and is COMPLETED
      const jobId = `manual-repair-${init.id}`;
      await prisma.agentJobLog.upsert({
        where: { jobId },
        update: { status: "COMPLETED", completedAt: new Date() },
        create: {
          jobId,
          tenantId: init.tenantId,
          agentName: "initiative-embedder",
          modelVersion: "text-embedding-004",
          promptHash: "manual-repair",
          status: "COMPLETED",
          completedAt: new Date(),
          triggeredBy: "SYSTEM_REPAIR"
        }
      });
      
      console.log(`✅ Fixed: ${init.title}`);
    } catch (err: any) {
      console.error(`❌ Failed: ${init.title} - ${err.message}`);
    }
  }
}

repair().catch(console.error).finally(() => prisma.$disconnect());
