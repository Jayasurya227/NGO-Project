import crypto from 'crypto';
import { prisma } from '@ngo/database';
import { auditLog } from '@ngo/audit';
import { buildPitchDeck } from './builder';
import * as fs from 'fs';
import * as path from 'path';

export async function runPitchDeckAgent(params: {
  requirementId:    string;
  tenantId:         string;
  approvedMatchIds: string[];
}): Promise<{ contentArtifactId: string; fileUrl: string }> {
  const { requirementId, tenantId, approvedMatchIds } = params;

  console.log(`[pitch-deck] Building PPTX for requirement: ${requirementId}`);

  // Step 1: Build the PPTX as a buffer
  const pptxBuffer = await buildPitchDeck(requirementId, approvedMatchIds, tenantId);

  // Step 2: Save to local temp folder (Supabase storage can be added later)
  const outputDir = path.join(process.cwd(), 'tmp', 'pitch-decks');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `pitch-deck-${requirementId}-${Date.now()}.pptx`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, pptxBuffer);

  const fileUrl = `local://pitch-decks/${fileName}`;
  console.log(`[pitch-deck] PPTX saved: ${filePath} (${pptxBuffer.length} bytes)`);

  // Step 3: Generate prompt hash
  const promptHash = crypto
    .createHash('sha256')
    .update(`pitch-deck-${requirementId}-${approvedMatchIds.join(',')}`)
    .digest('hex')
    .slice(0, 16);

  // Step 4: Save ContentArtifact row
  const artifact = await prisma.contentArtifact.create({
    data: {
      tenantId,
      type:              'PITCH_DECK',
      fileUrl:           filePath,
      content:           { approvedMatchIds, slideCount: approvedMatchIds.length + 3 },
      templateVersion:   '1.0.0',
      aiModelUsed:       'gemini-2.0-flash-001',
      promptHash,
      approvalStatus:    'PENDING_REVIEW',
      relatedEntityType: 'SponsorRequirement',
      relatedEntityId:   requirementId,
    },
    select: { id: true },
  });

  await auditLog({
    tenantId,
    eventType:  'PITCH_DECK_GENERATED',
    entityType: 'ContentArtifact',
    entityId:   artifact.id,
    actorType:  'AGENT',
    afterState: {
      requirementId,
      approvedMatchCount: approvedMatchIds.length,
      approvalStatus:     'PENDING_REVIEW',
      fileSizeBytes:      pptxBuffer.length,
    },
  });

  console.log(`[pitch-deck] ContentArtifact created: ${artifact.id}`);
  return { contentArtifactId: artifact.id, fileUrl };
}