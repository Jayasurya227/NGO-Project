const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const initiatives = await prisma.initiative.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log("--- Last 5 Initiatives ---");
  initiatives.forEach(i => {
    console.log(`ID: ${i.id}`);
    console.log(`TITLE: ${i.title}`);
    console.log(`DESC_START: ${i.description ? i.description.substring(0, 50).replace(/\n/g, ' ') : 'null'}`);
    console.log(`IS_BINARY: ${i.description && i.description.includes('PK')}`);
    console.log("-------------------");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
