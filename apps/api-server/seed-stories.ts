import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const tenant = await p.tenant.findFirst({ where: { subdomain: 'shiksha-foundation' } });
  if (!tenant) return console.error('Tenant not found');

  const donor = await p.donor.findFirst({ where: { tenantId: tenant.id } });
  if (!donor) return console.error('Donor not found');

  const requirement = await p.sponsorRequirement.findFirst({ where: { tenantId: tenant.id } });
  if (!requirement) return console.error('Requirement not found');

  const initiative = await p.initiative.findFirst({ where: { tenantId: tenant.id } });
  if (!initiative) return console.error('Initiative not found');

  // 1. Ensure MatchResult exists
  let match = await p.matchResult.findFirst({
    where: { requirementId: requirement.id, initiativeId: initiative.id }
  });
  if (!match) {
    match = await p.matchResult.create({
      data: {
        requirementId: requirement.id,
        initiativeId: initiative.id,
        overallScore: 95,
        subScores: {},
        explanation: 'Excellent alignment',
        hardConstraintCheck: 'PASSED'
      }
    });
  }

  // 2. Create Contract
  const contract = await p.contract.upsert({
    where: { id: 'test-contract-1' },
    update: {
       dataSharingLevel: 'ANONYMISED_BENEFICIARY'
    },
    create: {
      id: 'test-contract-1',
      tenantId: tenant.id,
      donorId: donor.id,
      requirementId: requirement.id,
      status: 'ACTIVE',
      milestoneSchedule: {},
      reportingCadence: 'MONTHLY',
      dataSharingLevel: 'ANONYMISED_BENEFICIARY'
    }
  });

  // 3. Create Stories
  const stories = [
    {
      tenantId: tenant.id,
      initiativeId: initiative.id,
      variant: 'DONOR_SAFE',
      contentJson: {
        title: 'First Laptop Distribution in Vidarbha',
        body: 'Thanks to your support, 50 students received their first digital tools today. The excitement was palpable as they logged on for the first time.'
      },
      dignityScore: 9.8,
      approvalStatus: 'PUBLISHED',
      publishedAt: new Date()
    },
    {
      tenantId: tenant.id,
      initiativeId: initiative.id,
      variant: 'DONOR_SAFE',
      contentJson: {
        title: 'Community Learning Centers Open',
        body: 'Three new learning centers have been established, providing a safe space for after-school tutoring and digital literacy classes.'
      },
      dignityScore: 9.5,
      approvalStatus: 'PUBLISHED',
      publishedAt: new Date()
    }
  ];

  for (const s of stories) {
    await p.story.create({ data: s as any });
  }

  console.log('Successfully seeded contract and 2 stories for donor:', donor.id);
}

main().catch(console.error).finally(() => p.$disconnect());
