const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const prisma = new PrismaClient()

async function main() {
  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: { 
      id: crypto.randomUUID(),
      name: 'Demo NGO', 
      subdomain: 'demo', 
      brandingConfig: {} 
    },
  })
  
  console.log('✅ Tenant:', tenant.id)
  
  // Create user
  const passwordHash = await bcrypt.hash('password123', 10)
  const emailHash = crypto.createHash('sha256').update('admin@demo.com').digest('hex')
  
  const user = await prisma.user.create({
    data: { 
      id: crypto.randomUUID(),
      email: 'admin@demo.com', 
      emailHash, 
      fullNameEnc: Buffer.from('Admin User'), 
      passwordHash, 
      role: 'DRM', 
      tenantId: tenant.id 
    },
  })
  
  console.log('✅ User:', user.email)
  
  // Create donors
  const donor1 = await prisma.donor.create({ 
    data: { 
      emailEnc: Buffer.from('john@donor.com'), 
      type: 'INDIVIDUAL', 
      contactNameEnc: Buffer.from('John Smith'), 
      tenantId: tenant.id 
    } 
  })
  
  const donor2 = await prisma.donor.create({ 
    data: { 
      emailEnc: Buffer.from('sara@donor.com'), 
      type: 'INDIVIDUAL', 
      contactNameEnc: Buffer.from('Sara Khan'), 
      tenantId: tenant.id 
    } 
  })
  
  const donor3 = await prisma.donor.create({ 
    data: { 
      emailEnc: Buffer.from('ravi@donor.com'), 
      type: 'CSR', 
      contactNameEnc: Buffer.from('Ravi Mehta'), 
      orgName: 'Tech Corp', 
      tenantId: tenant.id 
    } 
  })
  
  console.log('✅ Donors:', [donor1.id, donor2.id, donor3.id])
  
  // Create initiatives
  await prisma.initiative.create({ 
    data: { 
      title: 'Clean Water Project', 
      sector: 'WATER_SANITATION', 
      geography: { state: 'Maharashtra', district: 'Pune' }, 
      description: 'Providing clean water to rural areas', 
      targetBeneficiaries: 1000, 
      budgetRequired: 500000, 
      tenantId: tenant.id 
    } 
  })
  
  await prisma.initiative.create({ 
    data: { 
      title: 'Education for All', 
      sector: 'EDUCATION', 
      geography: { state: 'Delhi', district: 'Central Delhi' }, 
      description: 'Building schools and providing scholarships', 
      targetBeneficiaries: 5000, 
      budgetRequired: 1000000, 
      tenantId: tenant.id 
    } 
  })
  
  await prisma.initiative.create({ 
    data: { 
      title: 'Healthcare Access', 
      sector: 'HEALTHCARE', 
      geography: { state: 'Bihar', district: 'Patna' }, 
      description: 'Mobile health clinics and medical camps', 
      targetBeneficiaries: 3000, 
      budgetRequired: 750000, 
      tenantId: tenant.id 
    } 
  })
  
  console.log('✅ Initiatives: 3')
  console.log('\n🎉 Seed complete!')
  console.log('Login: admin@demo.com / password123 / demo')
}

main().catch(console.error).finally(() => prisma.$disconnect())