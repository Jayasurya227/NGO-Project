const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const artifacts = await prisma.contentArtifact.findMany({
    where: { type: 'PITCH_DECK' },
    select: {
      id: true,
      type: true,
      approvalStatus: true,
      fileUrl: true,
      createdAt: true
    }
  });

  console.log('Total pitch decks:', artifacts.length);
  artifacts.forEach(a => {
    console.log('ID:', a.id.slice(0, 8));
    console.log('  Status:', a.approvalStatus);
    console.log('  FileUrl:', a.fileUrl?.slice(0, 40));
    console.log('  Created:', a.createdAt);
  });

  await prisma.$disconnect();
}

main().catch(console.error);