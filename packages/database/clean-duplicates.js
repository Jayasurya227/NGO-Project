const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Show all requirements first
  const reqs = await prisma.sponsorRequirement.findMany({
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log('All requirements:');
  reqs.forEach((r, i) => {
    console.log(`${i+1}. ${r.id.slice(0,8)} | ${r.status} | ${r.createdAt}`);
  });

  // Keep only the LATEST requirement — delete all others
  const keepId = reqs[0].id;
  console.log('\nKeeping latest:', keepId.slice(0,8));

  // Delete match results for old requirements
  const deletedMatches = await prisma.matchResult.deleteMany({
    where: { requirementId: { not: keepId } }
  });
  console.log('Deleted old match results:', deletedMatches.count);

  // Delete old requirements
  const deletedReqs = await prisma.sponsorRequirement.deleteMany({
    where: { id: { not: keepId } }
  });
  console.log('Deleted old requirements:', deletedReqs.count);

  // Show remaining matches
  const remaining = await prisma.matchResult.findMany({
    include: { initiative: { select: { title: true } } },
    orderBy: { rank: 'asc' }
  });
  console.log('\nRemaining matches:', remaining.length);
  remaining.forEach(m => {
    console.log(`  Rank ${m.rank}: ${m.initiative.title} — ${m.overallScore}/100`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);