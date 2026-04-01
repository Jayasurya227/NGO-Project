import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const t = await p.tenant.findFirst({ where: { subdomain: { contains: 'shiksha' } } });
  console.log('Found tenant:', JSON.stringify(t, null, 2));
  
  if (!t) {
    const all = await p.tenant.findMany({ select: { id: true, subdomain: true } });
    console.log('All subdomains:', all.map(x => x.subdomain));
  }
}

main().catch(console.error).finally(() => p.$disconnect());
