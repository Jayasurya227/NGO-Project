const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.matchResult.findMany({
    include: { initiative: { select: { title: true } } },
    orderBy: { rank: 'asc' },
    take: 5,
  });

  console.log('Total matches:', matches.length);
  matches.forEach(m => {
    console.log(`Rank ${m.rank}: ${m.initiative.title}`);
    console.log(`  Score: ${m.overallScore}/100`);
    console.log(`  Explanation: ${m.explanation?.slice(0, 80)}...`);
    console.log(`  Constraint: ${m.hardConstraintCheck}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);