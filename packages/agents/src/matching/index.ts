import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";

export async function runInitiativeMatching(params: {
  requirementId: string;
  tenantId: string;
}) {
  const requirement = await prisma.sponsorRequirement.findUniqueOrThrow({
    where: { id: params.requirementId },
  });

  const fields = requirement.extractedFields as any;
  if (!fields) throw new Error("No fields for matching");

  // Basic rule-based scoring (fallback for missing vector search)
  const initiatives = await prisma.initiative.findMany({
    where: { tenantId: params.tenantId, status: "ACTIVE" },
  });

  const results = [];

  for (const initiative of initiatives) {
    let score = 50; // Base score

    // Sector match
    if (initiative.sector === fields.sector) score += 30;

    // Geo match
    if (fields.geography?.state && (initiative.geography as any)?.state === fields.geography.state) {
      score += 20;
    }

    results.push({
      requirementId: params.requirementId,
      initiativeId: initiative.id,
      overallScore: Math.min(score, 100),
      rank: 0, // Will be set after sorting
      explanation: `Match based on sector (${initiative.sector}) and geography.`,
      subScores: {},
      hardConstraintCheck: "{}",
    });
  }

  // Sort and rank
  results.sort((a, b) => b.overallScore - a.overallScore);
  const top5 = results.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));

  // Clear old results
  await prisma.matchResult.deleteMany({ where: { requirementId: params.requirementId } });

  // Save top 5
  if (top5.length > 0) {
    await prisma.matchResult.createMany({ data: top5 as any });
    
    await prisma.sponsorRequirement.update({
      where: { id: params.requirementId },
      data: { status: "MATCHED" }
    });
  }

  await auditLog({
    tenantId: params.tenantId,
    eventType: "MATCHING_COMPLETED",
    entityType: "SponsorRequirement",
    entityId: params.requirementId,
    actorType: "AGENT",
    afterState: { matchCount: top5.length },
  });

  return top5;
}
