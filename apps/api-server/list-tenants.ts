import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const tenants = await p.tenant.findMany();
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
