import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const artifacts = await p.contentArtifact.findMany({
    select: { id: true, tenantId: true, type: true, approvalStatus: true }
  });
  console.log('Total artifacts:', artifacts.length);
  console.log(JSON.stringify(artifacts, null, 2));

  const tenants = await p.tenant.findMany({ select: { id: true, subdomain: true } });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
