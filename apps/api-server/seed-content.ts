import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const tenant = await p.tenant.findFirst({ where: { subdomain: 'shiksha-foundation' } });
  if (!tenant) {
    console.error('Tenant not found');
    return;
  }

  const requirement = await p.sponsorRequirement.findFirst({ where: { tenantId: tenant.id } });
  if (!requirement) {
    console.error('Requirement not found');
    return;
  }

  const artifacts = [
    {
      tenantId: tenant.id,
      relatedEntityType: 'SponsorRequirement',
      relatedEntityId: requirement.id,
      type: 'PITCH_DECK',
      content: { title: 'Digital Literacy Expansion', pages: 12 },
      fileUrl: 'https://placehold.co/600x400?text=Pitch+Deck+PPTX',
      approvalStatus: 'PENDING_REVIEW',
      aiModelUsed: 'gemini-2.0-flash-001',
    },
    {
      tenantId: tenant.id,
      relatedEntityType: 'SponsorRequirement',
      relatedEntityId: requirement.id,
      type: 'EMAIL_DRAFT',
      content: { subject: 'Partnership Opportunity', body: 'Dear CSR Head...' },
      approvalStatus: 'APPROVED',
      approvedBy: 'DRM User',
      approvedAt: new Date(),
      aiModelUsed: 'gemini-2.0-flash-001',
    },
    {
      tenantId: tenant.id,
      relatedEntityType: 'SponsorRequirement',
      relatedEntityId: requirement.id,
      type: 'WHATSAPP_DRAFT',
      content: { text: 'Hi, just wanted to follow up on our discussion...' },
      approvalStatus: 'REJECTED',
      aiModelUsed: 'gemini-1.5-flash',
    }
  ];

  for (const art of artifacts) {
    await p.contentArtifact.create({ data: art as any });
  }

  console.log('Successfully seeded 3 content artifacts');
}

main().catch(console.error).finally(() => p.$disconnect());
