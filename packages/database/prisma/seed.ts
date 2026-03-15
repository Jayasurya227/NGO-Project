import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create tenant first
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo NGO',
      subdomain: 'demo',
    },
  })
  console.log('✅ Tenant created:', tenant.id)

  // Create admin user
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      role: 'DRM',
      tenantId: tenant.id,
    },
  })
  console.log('✅ User created:', user.email)

  // Create 3 donors
  const donors = await Promise.all([
    prisma.donor.upsert({
      where: { id: 'donor-1' },
      update: {},
      create: { id: 'donor-1', name: 'John Smith', email: 'john@donor.com', tenantId: tenant.id },
    }),
    prisma.donor.upsert({
      where: { id: 'donor-2' },
      update: {},
      create: { id: 'donor-2', name: 'Sara Khan', email: 'sara@donor.com', tenantId: tenant.id },
    }),
    prisma.donor.upsert({
      where: { id: 'donor-3' },
      update: {},
      create: { id: 'donor-3', name: 'Ravi Mehta', email: 'ravi@donor.com', tenantId: tenant.id },
    }),
  ])
  console.log('✅ Donors created:', donors.length)

  // Create 1 initiative
  const initiative = await prisma.initiative.upsert({
    where: { id: 'init-1' },
    update: {},
    create: {
      id: 'init-1',
      title: 'Clean Water Project',
      description: 'Providing clean water to rural areas',
      tenantId: tenant.id,
    },
  })
  console.log('✅ Initiative created:', initiative.title)

  // Create 2 requirements
  await Promise.all([
    prisma.sponsorRequirement.upsert({
      where: { id: 'req-1' },
      update: {},
      create: { id: 'req-1', title: 'Monthly Report', content: 'Submit monthly progress report', tenantId: tenant.id },
    }),
    prisma.sponsorRequirement.upsert({
      where: { id: 'req-2' },
      update: {},
      create: { id: 'req-2', title: 'Photo Evidence', content: 'Submit photo evidence of work done', tenantId: tenant.id },
    }),
  ])
  console.log('✅ Requirements created')

  console.log('\n🎉 Seed complete!')
  console.log('Login with: admin@demo.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())