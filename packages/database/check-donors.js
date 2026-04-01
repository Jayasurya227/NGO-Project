const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const donors = await prisma.donor.findMany({
    select: {
      id: true,
      type: true,
      orgName: true,
      kycStatus: true,
      createdAt: true
    }
  });

  console.log('Total donors:', donors.length);
  donors.forEach((d, i) => {
    console.log(`${i+1}. ID: ${d.id.slice(0,8)} | Type: ${d.type} | Org: ${d.orgName ?? 'Individual'} | KYC: ${d.kycStatus}`);
  });

  // Also check users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, emailHash: true }
  });

  console.log('\nTotal users:', users.length);
  users.forEach((u, i) => {
    console.log(`${i+1}. Email: ${u.email} | Role: ${u.role}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);