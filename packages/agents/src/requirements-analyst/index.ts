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
import { GoogleGenerativeAI } from "@google/generative-ai";
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

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}


// ── EXTRACTION ────────────────────────────────────────────────────────────────

async function extractWithGemini(documentText: string): Promise<{
  result: ExtractionResult | null;
  modelVersion: string;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  const modelVersion = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

  try {
    if (process.env.MOCK_AI === "true") {
      // (Mock logic remains same...)
      return {
        result: {
          companyName: "TATA Consultancy Services",
          companyNameConf: 0.99,
          sector: "EDUCATION",
          sectorConfidence: 0.95,
          geography: { state: "Maharashtra", stateConf: 0.9, districts: [], districtsConf: 0.8 },
          budget: { minInr: 1000000, maxInr: 2000000, conf: 0.95 },
          durationMonths: { value: 12, conf: 0.95 },
          primaryKpis: [{ metric: "Students", target: 500, unit: "students", conf: 0.9 }],
          reportingCadence: { value: "QUARTERLY", conf: 0.9 },
          constraints: [{ type: "FCRA_REQUIRED", value: true, conf: 1.0 }],
          requiresHumanReview: false,
          lowConfidenceFields: []
        },
        modelVersion: "mock-model",
        latencyMs: 100,
      };
    }

    const genAI = getGeminiClient();
    if (!genAI) {
      throw new Error("GEMINI_API_KEY is not set in .env. Please provide a key for real extraction.");
    }

    const model = genAI.getGenerativeModel({ 
      model: modelVersion,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `${SYSTEM_PROMPT}

${USER_PROMPT_TEMPLATE(documentText)}

You MUST return a valid JSON object with these EXACT fields. Do not add any text before or after the JSON:
{
  "companyName": "TCS Ltd" or null,
  "companyNameConf": 0.99,
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    const cleanJson = responseText.replace(/```json\n?|```/g, "").trim();
    const rawData = JSON.parse(cleanJson);
    const parsed = ExtractionSchema.parse(rawData);

    return {
      result: parsed,
      modelVersion,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    // ── HEURISTIC FALLBACK ────────────────────────────────────────────────────
    console.log("[requirements-analyst] Attempting heuristic fallback due to error:", (err as Error).message);
    const heuristic = runHeuristicExtraction(documentText);
    if (heuristic) {
       return { result: heuristic, modelVersion: "heuristic-fallback", latencyMs: 0 };
    }

    return {
      result: null,
      modelVersion,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function runHeuristicExtraction(text: string): ExtractionResult | null {
  const companyMatch = text.match(/Company\s+(?:Name)?\s*[:\s-]\s*([^\n\r]+)/i);
  const sectorMatch  = text.match(/Sector\s*[:\s-]\s*([^\n\r]+)/i);
  const budgetMatch  = text.match(/Budget\s*[:\s-]\s*(?:INR)?\s*([\d,]+)/i);
  const stateMatch   = text.match(/State\s*[:\s-]\s*([^\n\r]+)/i);

  if (!companyMatch && !sectorMatch) return null;

  let sector: any = "OTHER";
  const s = (sectorMatch?.[1] ?? "").toUpperCase();
  if (s.includes("HEALTH")) sector = "HEALTHCARE";
  if (s.includes("EDU"))    sector = "EDUCATION";
  if (s.includes("LIVE"))   sector = "LIVELIHOOD";
  if (s.includes("WATER"))  sector = "WATER_SANITATION";
  if (s.includes("ENV"))    sector = "ENVIRONMENT";

  return {
    companyName:     companyMatch?.[1]?.trim() || null,
    companyNameConf: companyMatch ? 0.9 : 0,
    sector,
    sectorConfidence: sectorMatch ? 0.8 : 0,
    geography: { 
      state: stateMatch?.[1]?.trim() || null, 
      stateConf: stateMatch ? 0.8 : 0, 
      districts: [], 
      districtsConf: 0 
    },
    budget: { 
      minInr: budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, "")) : null,
      maxInr: budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, "")) : null,
      conf: budgetMatch ? 0.7 : 0
    },
    durationMonths: { value: null, conf: 0 },
    primaryKpis: [],
    reportingCadence: { value: null, conf: 0 },
    constraints: [],
    requiresHumanReview: true,
    lowConfidenceFields: ["heuristic-extraction"]
  };
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