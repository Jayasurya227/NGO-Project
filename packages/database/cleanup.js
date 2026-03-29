const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reqs = await prisma.sponsorRequirement.findMany({
    select: {
      id: true,
      status: true,
      extractedFields: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Total requirements:', reqs.length);
  reqs.forEach((r, i) => {
    console.log(`${i+1}. ID: ${r.id.slice(0,8)} | Status: ${r.status} | HasFields: ${r.extractedFields !== null}`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);