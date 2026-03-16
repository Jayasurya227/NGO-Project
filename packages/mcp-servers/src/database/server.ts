import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@ngo/database";
import { createAndStartServer } from "../shared/create-server";

function registerTools(server: McpServer) {
  server.tool("get_requirement", "Retrieve a sponsor requirement", {
    requirementId: z.string(),
    tenantId: z.string(),
  }, async ({ requirementId, tenantId }) => {
    const req = await prisma.sponsorRequirement.findFirst({
      where: { id: requirementId, tenantId },
      include: { donor: { select: { id: true, type: true, orgName: true } } },
    });
    if (!req) return { content: [{ type: "text", text: JSON.stringify({ error: "NOT_FOUND" }) }] };
    return { content: [{ type: "text", text: JSON.stringify(req) }] };
  });

  server.tool("list_active_initiatives", "List active initiatives", {
    tenantId: z.string(),
    sector: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
  }, async ({ tenantId, sector, limit }) => {
    const initiatives = await prisma.initiative.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "IN_PROGRESS"] }, ...(sector && { sector: sector as any }) },
      take: limit,
    });
    return { content: [{ type: "text", text: JSON.stringify(initiatives) }] };
  });

  server.tool("get_initiative_detail", "Get initiative details", {
    initiativeId: z.string(),
    tenantId: z.string(),
  }, async ({ initiativeId, tenantId }) => {
    const initiative = await prisma.initiative.findFirst({
      where: { id: initiativeId, tenantId },
      include: { milestones: { orderBy: { sequenceOrder: "asc" } } },
    });
    if (!initiative) return { content: [{ type: "text", text: JSON.stringify({ error: "NOT_FOUND" }) }] };
    return { content: [{ type: "text", text: JSON.stringify(initiative) }] };
  });

  server.tool("update_requirement_status", "Update requirement status", {
    requirementId: z.string(),
    tenantId: z.string(),
    status: z.enum(["EXTRACTED", "NEEDS_REVIEW", "VALIDATED", "MATCHED"]),
    extractedFields: z.record(z.unknown()).optional(),
    confidenceScores: z.record(z.number()).optional(),
    gapReportJson: z.record(z.unknown()).optional(),
  }, async ({ requirementId, tenantId, status, extractedFields, confidenceScores, gapReportJson }) => {
    await prisma.sponsorRequirement.updateMany({
      where: { id: requirementId, tenantId },
      data: { status: status as any, ...(extractedFields && { extractedFields }), ...(confidenceScores && { confidenceScores }), ...(gapReportJson && { gapReportJson }) },
    });
    return { content: [{ type: "text", text: JSON.stringify({ updated: true, status }) }] };
  });

  server.tool("save_match_results", "Save match results", {
    tenantId: z.string(),
    requirementId: z.string(),
    matches: z.array(z.object({
      initiativeId: z.string(),
      overallScore: z.number(),
      subScores: z.record(z.number()),
      explanation: z.string(),
      hardConstraintCheck: z.string(),
      rank: z.number(),
    })),
  }, async ({ requirementId, matches }) => {
    await prisma.matchResult.deleteMany({ where: { requirementId } });
    await prisma.matchResult.createMany({
      data: matches.map((m) => ({ requirementId, initiativeId: m.initiativeId, overallScore: m.overallScore, subScores: m.subScores, explanation: m.explanation, hardConstraintCheck: m.hardConstraintCheck, rank: m.rank })),
    });
    return { content: [{ type: "text", text: JSON.stringify({ saved: matches.length }) }] };
  });

  server.tool("load_consented_beneficiaries", "Load beneficiaries", {
    initiativeId: z.string(),
    tenantId: z.string(),
    consentLevel: z.enum(["L1", "L2", "L3"]),
  }, async ({ initiativeId, tenantId, consentLevel }) => {
    const consentFilter = { L1: { consentL1: true }, L2: { consentL2: true }, L3: { consentL3: true } }[consentLevel];
    const beneficiaries = await prisma.beneficiary.findMany({
      where: { tenantId, consentWithdrawnAt: null, ...consentFilter, initiatives: { some: { initiativeId } } },
    });
    return { content: [{ type: "text", text: JSON.stringify(beneficiaries) }] };
  });
}

createAndStartServer("ngo-database", "1.0.0", registerTools);