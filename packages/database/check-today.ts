
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reqs = await prisma.sponsorRequirement.findMany({
    where: { createdAt: { gte: today } },
    select: { id: true, status: true, donorId: true, extractedFields: true }
  });
  console.log('Requirements:', JSON.stringify(reqs));

  const jobs = await prisma.agentJobLog.findMany({
    where: { createdAt: { gte: today } },
    select: { agentName: true, status: true, error: true, jobId: true }
  });
  console.log('Jobs:', JSON.stringify(jobs));
}

main().catch(console.error).finally(() => prisma.$disconnect());
