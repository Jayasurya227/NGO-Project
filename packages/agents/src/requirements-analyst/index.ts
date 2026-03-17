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

import crypto from "crypto";
import { VertexAI } from "@google-cloud/vertexai";
import { prisma } from "@ngo/database";
import { auditLog } from "@ngo/audit";
import { ExtractionSchema, ExtractionResult, buildConfidenceMap } from "./schema";
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from "./prompt";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type RequirementsAnalystInput = {
  requirementId: string;
  tenantId: string;
  documentText: string;
};

// ── GEMINI CLIENT ─────────────────────────────────────────────────────────────

function getVertexClient() {
  return new VertexAI({
    project: process.env.GCP_PROJECT ?? "inspire-education-489506",
    location: process.env.GCP_LOCATION ?? "us-central1",
  });
}

// ── EXTRACTION ────────────────────────────────────────────────────────────────

async function extractWithGemini(documentText: string): Promise<{
  result: ExtractionResult | null;
  modelVersion: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  const modelVersion = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-001";

  try {
    const vertexAI = getVertexClient();
    const model = vertexAI.getGenerativeModel({
      model: modelVersion,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const prompt = `${SYSTEM_PROMPT}

${USER_PROMPT_TEMPLATE(documentText)}

You MUST return a valid JSON object with these EXACT fields. Do not add any text before or after the JSON:
{
  "sector": "EDUCATION" or "HEALTHCARE" or "LIVELIHOOD" or "ENVIRONMENT" or "WATER_SANITATION" or "OTHER",
  "sectorConfidence": 0.95,
  "geography": {
    "state": "Maharashtra" or null,
    "stateConf": 0.9,
    "districts": [],
    "districtsConf": 0.8
  },
  "budget": {
    "minInr": 3500000 or null,
    "maxInr": 5000000 or null,
    "conf": 0.95
  },
  "durationMonths": {
    "value": 18 or null,
    "conf": 0.95
  },
  "primaryKpis": [
    { "metric": "students enrolled", "target": 1000, "unit": "students", "conf": 0.9 }
  ],
  "reportingCadence": {
    "value": "QUARTERLY" or null,
    "conf": 0.9
  },
  "constraints": [
    { "type": "FCRA_REQUIRED", "value": true, "conf": 1.0 }
  ],
  "requiresHumanReview": false,
  "lowConfidenceFields": []
}`;

    const geminiResult = await model.generateContent(prompt);
    const responseText = geminiResult.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    console.log("[extractionNode] Raw Gemini response (first 200 chars):", responseText.slice(0, 200));

    const cleanJson = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const rawData = JSON.parse(cleanJson);
    const parsed = ExtractionSchema.parse(rawData);

    console.log("[extractionNode] Sector:", parsed.sector, "Confidence:", parsed.sectorConfidence);

    return {
      result: parsed,
      modelVersion,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      result: null,
      modelVersion,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── MAIN FUNCTION (no LangGraph — simpler and more reliable) ──────────────────

export async function runRequirementsAnalyst(
  input: RequirementsAnalystInput
): Promise<{ status: string; requiresReview: boolean; lowConfidenceFields: string[] }> {
  const { requirementId, tenantId, documentText } = input;

  const promptHash = crypto
    .createHash("sha256")
    .update(SYSTEM_PROMPT + documentText.slice(0, 500))
    .digest("hex");

  // Step 1 — Extract with Gemini
  const { result, modelVersion, latencyMs, error } = await extractWithGemini(documentText);

  // Step 2 — Handle failure
  if (!result || error) {
    console.error("[requirements-analyst] Extraction failed:", error);

    try {
      await prisma.sponsorRequirement.update({
        where: { id: requirementId },
        data: { status: "NEEDS_REVIEW" },
      });

      await auditLog({
        tenantId,
        eventType: "REQUIREMENT_EXTRACTION_FAILED",
        entityType: "SponsorRequirement",
        entityId: requirementId,
        actorType: "AGENT",
        afterState: { error },
      });
    } catch (dbError) {
      console.error("[requirements-analyst] DB update failed:", dbError);
    }

    return { status: "FAILED", requiresReview: true, lowConfidenceFields: [] };
  }

  // Step 3 — Persist results
  const status = result.requiresHumanReview ? "NEEDS_REVIEW" : "EXTRACTED";

  await prisma.sponsorRequirement.update({
    where: { id: requirementId },
    data: {
      extractedFields: result as any,
      confidenceScores: buildConfidenceMap(result),
      status: status as any,
      extractedByAgent: `requirements-analyst/${modelVersion}`,
    },
  });

  await prisma.agentJobLog.updateMany({
    where: { jobId: requirementId, tenantId },
    data: {
      modelVersion,
      promptHash,
      latencyMs,
    },
  });

  await auditLog({
    tenantId,
    eventType: "REQUIREMENT_EXTRACTED",
    entityType: "SponsorRequirement",
    entityId: requirementId,
    actorType: "AGENT",
    afterState: {
      status,
      requiresHumanReview: result.requiresHumanReview,
      lowConfidenceFields: result.lowConfidenceFields,
      confidenceScores: buildConfidenceMap(result),
    },
  });

  return {
    status,
    requiresReview: result.requiresHumanReview,
    lowConfidenceFields: result.lowConfidenceFields,
  };
}