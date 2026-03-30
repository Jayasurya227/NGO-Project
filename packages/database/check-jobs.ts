
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.agentJobLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('--- Agent Job Logs ---');
  console.log(JSON.stringify(jobs, null, 2));

  const reqs = await prisma.sponsorRequirement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { matchResults: true }
  });
  console.log('\n--- Sponsor Requirements ---');
  console.log(JSON.stringify(reqs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
