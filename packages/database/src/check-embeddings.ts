import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkEmbeddings() {
  const initiatives: any[] = await prisma.$queryRawUnsafe(
    'SELECT id, title FROM "Initiative" WHERE "embeddingVector" IS NULL'
  );
  console.log(`Found ${initiatives.length} initiatives without embeddings:`);
  console.table(initiatives.map(i => ({ id: i.id, title: i.title })));
}

checkEmbeddings().catch(console.error).finally(() => prisma.$disconnect());
