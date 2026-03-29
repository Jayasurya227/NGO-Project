const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [initiatives, withEmbeddings, matchResults, artifacts, requirements] = await Promise.all([
    prisma.initiative.count(),
    prisma.$queryRaw`SELECT COUNT(*) as count FROM "Initiative" WHERE "embeddingVector" IS NOT NULL`,
    prisma.matchResult.count(),
    prisma.contentArtifact.count({ where: { type: 'PITCH_DECK' } }),
    prisma.sponsorRequirement.count({ where: { status: 'MATCHED' } })
  ]);

  console.log('=== WEEK 3 FINAL GATE TEST ===');
  console.log('Total initiatives:     ', initiatives,                    initiatives >= 7      ? '✅' : '❌ Need 7+');
  console.log('With embeddings:       ', Number(withEmbeddings[0].count),Number(withEmbeddings[0].count) >= 7 ? '✅' : '❌ Need 7+');
  console.log('Match results:         ', matchResults,                   matchResults > 0      ? '✅' : '❌ Need > 0');
  console.log('Pitch decks generated: ', artifacts,                      artifacts > 0         ? '✅' : '❌ Need > 0');
  console.log('MATCHED requirements:  ', requirements,                   requirements > 0      ? '✅' : '❌ Need > 0');
  console.log('');
  console.log(
    initiatives >= 7 && Number(withEmbeddings[0].count) >= 7 && matchResults > 0 && artifacts > 0 && requirements > 0
      ? '✅ WEEK 3 COMPLETE — Ready for Week 4!'
      : '❌ Some checks failed — fix before proceeding'
  );

  await prisma.$disconnect();
}

main().catch(console.error);