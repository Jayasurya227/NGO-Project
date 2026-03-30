import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key && !process.env[key]) process.env[key] = value;
    }
  } catch {}
}
loadEnv();

import { VertexAI } from "@google-cloud/vertexai";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import type { ExtractionResult } from "../requirements-analyst/schema";

type GapReport = {
  hasGaps: boolean;
  criticalGaps: GapItem[];
  minorGaps: GapItem[];
  narrative: string;
  recommendation: "PROCEED_TO_MATCHING" | "CREATE_INITIATIVE_FIRST" | "SEEK_PARTNER_NGO";
};

type GapItem = {
  category: string;
  description: string;
  severity: "CRITICAL" | "MINOR";
};

function getVertexClient() {
  return new VertexAI({
    project: process.env.GCP_PROJECT ?? "inspire-education-489506",
    location: process.env.GCP_LOCATION ?? "us-central1",
  });
}

export async function runGapDiagnoser(params: {
  requirementId: string;
  tenantId: string;
}): Promise<GapReport> {
  const requirement = await prisma.sponsorRequirement.findUniqueOrThrow({
    where: { id: params.requirementId },
  });

  const fields = requirement.extractedFields as ExtractionResult;
  if (!fields) throw new Error("Requirement has no extracted fields — run analyst agent first");

  const initiatives = await prisma.initiative.findMany({
    where: { tenantId: params.tenantId, status: { in: ["ACTIVE", "IN_PROGRESS"] } },
    select: {
      id: true, title: true, sector: true, geography: true,
      budgetRequired: true, budgetFunded: true, sdgTags: true, status: true,
    },
  });

  const gaps: GapItem[] = [];

  const sectorMatches = initiatives.filter((i) => i.sector === fields.sector);
  if (sectorMatches.length === 0) {
    gaps.push({
      category: "SECTOR",
      description: `No active initiatives in sector: ${fields.sector}`,
      severity: "CRITICAL",
    });
  }

  if (fields.geography.state) {
    const geoMatches = initiatives.filter((i) => {
      const geo = i.geography as { state?: string };
      return geo.state?.toLowerCase() === fields.geography.state?.toLowerCase();
    });
    if (geoMatches.length === 0) {
      gaps.push({
        category: "GEOGRAPHY",
        description: `No active initiatives in state: ${fields.geography.state}`,
        severity: "CRITICAL",
      });
    }
  }

  if (fields.budget.maxInr) {
    const avgBudget = initiatives.length > 0
      ? initiatives.reduce((sum, i) => sum + Number(i.budgetRequired), 0) / initiatives.length
      : 0;
    const budgetRatio = fields.budget.maxInr / (avgBudget || 1);
    if (budgetRatio > 3) {
      gaps.push({
        category: "BUDGET",
        description: `Required budget is ${budgetRatio.toFixed(1)}x your typical initiative size`,
        severity: "MINOR",
      });
    }
  }

  const availableForMatching = initiatives.filter(
    (i) => i.status === "ACTIVE" && Number(i.budgetFunded) < Number(i.budgetRequired)
  );
  if (availableForMatching.length === 0) {
    gaps.push({
      category: "CAPACITY",
      description: "All active initiatives are fully funded",
      severity: "CRITICAL",
    });
  }

  const criticalGaps = gaps.filter((g) => g.severity === "CRITICAL");
  const minorGaps = gaps.filter((g) => g.severity === "MINOR");

  let recommendation: GapReport["recommendation"];
  if (criticalGaps.some((g) => g.category === "SECTOR" || g.category === "GEOGRAPHY")) {
    recommendation = "CREATE_INITIATIVE_FIRST";
  } else if (criticalGaps.some((g) => g.category === "CAPACITY")) {
    recommendation = "SEEK_PARTNER_NGO";
  } else {
    recommendation = "PROCEED_TO_MATCHING";
  }

  let narrative = "Gap analysis summary could not be generated.";
  
  if (process.env.MOCK_AI === "true") {
     narrative = `MOCK ANALYSIS: Based on the requirement for a ${fields.sector} initiative in ${fields.geography.state ?? "various locations"}, we have identified ${criticalGaps.length} critical gaps. We recommend that you ${recommendation.replace(/_/g, " ").toLowerCase()} to address these needs effectively within the current infrastructure.`;
  } else {
    try {
      const vertexAI = getVertexClient();
      const model = vertexAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash-001",
        generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
      });

      const narrativePrompt = `You are a capacity assessment analyst for a social impact NGO.

Write a concise 3-4 sentence gap analysis summary for an NGO manager.
Tone: professional, direct, factual. Do not use bullet points.

Requirement: ${fields.sector} initiative in ${fields.geography.state ?? "unspecified location"}, budget Rs.${((fields.budget.minInr ?? 0) / 100000).toFixed(1)}L-Rs.${((fields.budget.maxInr ?? 0) / 100000).toFixed(1)}L.
Current initiatives: ${initiatives.length} active (${sectorMatches.length} in required sector).
Critical gaps: ${criticalGaps.map((g) => g.description).join("; ") || "None identified"}.
Minor gaps: ${minorGaps.map((g) => g.description).join("; ") || "None"}.
Recommendation: ${recommendation.replace(/_/g, " ").toLowerCase()}.`;

      const narrativeResult = await model.generateContent(narrativePrompt);
      narrative = narrativeResult.response.candidates?.[0]?.content?.parts?.[0]?.text
        ?? "Gap analysis summary generated with empty content.";
    } catch (err) {
      console.error("[gap-diagnoser] Narrative generation failed:", err);
      narrative = "AI Narrative generation temporarily unavailable. Results below are based on rule-matching.";
    }
  }

  const gapReport: GapReport = {
    hasGaps: gaps.length > 0,
    criticalGaps,
    minorGaps,
    narrative,
    recommendation,
  };

  await prisma.sponsorRequirement.update({
    where: { id: params.requirementId },
    data: { gapReportJson: gapReport as any },
  });

  await auditLog({
    tenantId: params.tenantId,
    eventType: "GAP_ANALYSIS_COMPLETED",
    entityType: "SponsorRequirement",
    entityId: params.requirementId,
    actorType: "AGENT",
    afterState: {
      hasGaps: gapReport.hasGaps,
      criticalGaps: criticalGaps.length,
      recommendation: gapReport.recommendation,
    },
  });

  return gapReport;
}