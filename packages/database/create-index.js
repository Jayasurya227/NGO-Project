const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_initiatives_embedding
    ON "Initiative" USING ivfflat ("embeddingVector" vector_cosine_ops)
    WITH (lists = 10)
  `;
  console.log('pgvector index created successfully');
  await prisma.$disconnect();
}

main().catch(console.error);