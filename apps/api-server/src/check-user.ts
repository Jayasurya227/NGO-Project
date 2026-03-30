import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'admin@shiksha.test' },
      select: { id: true, tenantId: true, role: true, tenant: { select: { name: true, subdomain: true } } }
    })
    console.log("Admin User:", user)

    if (user) {
      const inits = await prisma.initiative.count({ where: { tenantId: user.tenantId } })
      const donors = await prisma.donor.count({ where: { tenantId: user.tenantId } })
      const reqs = await prisma.sponsorRequirement.count({ where: { tenantId: user.tenantId } })
      console.log(`Counts for Tenant ${user.tenantId} (${user.tenant?.name}):`, { inits, donors, reqs })
    } else {
        console.log("Admin user not found in database.")
    }
  } catch (err) {
      console.error(err)
  }
}

main().finally(() => prisma.$disconnect())
