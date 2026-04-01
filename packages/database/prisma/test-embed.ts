import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fakeVector = Array(1536).fill(0.1);
  const vectorString = `[${fakeVector.join(",")}]`;

  console.log("Testing database connection...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL);

  const result = await prisma.$executeRawUnsafe(
    `UPDATE "Initiative" SET "embeddingVector" = '${vectorString}'::vector WHERE id = 'seed-init-1'`
  );

  console.log("Updated rows:", result);

  const check = await prisma.$queryRaw`
    SELECT id, "embeddingVector" IS NOT NULL AS has_embedding
    FROM "Initiative"
    WHERE id = 'seed-init-1'
  `;

  console.log("Check result:", check);
  await prisma.$disconnect();
}

main().catch(console.error);