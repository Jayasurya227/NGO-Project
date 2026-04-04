import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../../.env"),
  ];
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (key) process.env[key] = value;
      }
      break; // loaded successfully
    } catch {}
  }
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
  rawFileBase64?: string;
  rawFileMimeType?: string;
};

// ── GEMINI CLIENT ─────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}


// ── EXTRACTION ────────────────────────────────────────────────────────────────

async function extractWithGemini(documentText: string, rawFileBase64?: string, rawFileMimeType?: string): Promise<{
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
          constraints: [{ type: "FCRA_REQUIRED", value: "true", conf: 1.0 }],
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
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json" },
    });

    const jsonSchema = `Respond with ONLY a JSON object in this exact structure:
{
  "companyName": "Organisation name from document, or null",
  "companyNameConf": 0.9,
  "ngoId": "NGO registration/project/FCRA number if present, or null",
  "sector": "EDUCATION",
  "sectorConfidence": 0.9,
  "geography": {
    "state": "Maharashtra",
    "stateConf": 0.9,
    "districts": ["Pune"],
    "districtsConf": 0.8
  },
  "budget": { "minInr": 2500000, "maxInr": 5000000, "conf": 0.85 },
  "durationMonths": { "value": 12, "conf": 0.9 },
  "primaryKpis": [{ "metric": "students trained", "target": 500, "unit": "students", "conf": 0.9 }],
  "reportingCadence": { "value": "QUARTERLY", "conf": 0.8 },
  "constraints": [],
  "requiresHumanReview": false,
  "lowConfidenceFields": []
}
sector must be one of: EDUCATION, HEALTHCARE, LIVELIHOOD, ENVIRONMENT, WATER_SANITATION, OTHER
reportingCadence.value must be one of: MONTHLY, QUARTERLY, HALF_YEARLY, ANNUALLY, MILESTONE_BASED, or null
Use 0 for unknown numbers, null for unknown strings, [] for missing arrays.`;

    let contentParts: any[];
    if (rawFileBase64 && rawFileMimeType) {
      // Scanned PDF or image — send file inline; Gemini reads + extracts in one call
      console.log("[requirements-analyst] Using inline file mode for", rawFileMimeType);
      contentParts = [
        { inlineData: { data: rawFileBase64, mimeType: rawFileMimeType } },
        `${USER_PROMPT_TEMPLATE("")}\n\n${jsonSchema}`,
      ];
    } else {
      // Text-based document — send extracted text
      contentParts = [`${USER_PROMPT_TEMPLATE(documentText)}\n\n${jsonSchema}`];
    }

    console.log("[requirements-analyst] Calling Gemini model:", modelVersion);
    const result = await model.generateContent(contentParts);
    const response = result.response;
    const responseText = response.text();

    console.log("[requirements-analyst] Gemini raw response:", responseText.slice(0, 600));

    const rawData = JSON.parse(responseText);

    // Normalise: fill in any missing nullable fields so Zod doesn't throw
    // Validate ngoId — reject garbage values
    const rawNgoId = rawData.ngoId;
    const validatedNgoId = (
      rawNgoId &&
      typeof rawNgoId === "string" &&
      rawNgoId.trim().length > 0 &&
      rawNgoId.trim().length <= 60 &&
      rawNgoId.trim().split(" ").length <= 6
    ) ? rawNgoId.trim() : null;

    const norm = {
      companyName:        rawData.companyName        ?? null,
      companyNameConf:    rawData.companyNameConf    ?? 0,
      ngoId:              validatedNgoId,
      sector:             rawData.sector             ?? "OTHER",
      sectorConfidence:   rawData.sectorConfidence   ?? 0,
      geography: {
        state:         rawData.geography?.state         ?? null,
        stateConf:     rawData.geography?.stateConf     ?? 0,
        districts:     rawData.geography?.districts     ?? [],
        districtsConf: rawData.geography?.districtsConf ?? 0,
      },
      budget: {
        minInr: rawData.budget?.minInr || null,
        maxInr: rawData.budget?.maxInr || null,
        conf:   rawData.budget?.conf   ?? 0,
      },
      durationMonths: {
        value: rawData.durationMonths?.value || null,
        conf:  rawData.durationMonths?.conf  ?? 0,
      },
      primaryKpis:       rawData.primaryKpis       ?? [],
      reportingCadence: {
        value: rawData.reportingCadence?.value ?? null,
        conf:  rawData.reportingCadence?.conf  ?? 0,
      },
      // Gemini sometimes returns constraints as strings — normalise to objects
      constraints: (rawData.constraints ?? []).map((c: any) =>
        typeof c === "string" ? { type: c, value: true, conf: 0.9 } : c
      ),
      requiresHumanReview:  rawData.requiresHumanReview  ?? true,
      lowConfidenceFields:  rawData.lowConfidenceFields   ?? [],
    };

    const parsed = ExtractionSchema.parse(norm);
    console.log("[requirements-analyst] Extracted:", JSON.stringify({ sector: parsed.sector, companyName: parsed.companyName, state: parsed.geography.state, budget: parsed.budget }));

    return {
      result: parsed,
      modelVersion,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    // ── HEURISTIC FALLBACK ────────────────────────────────────────────────────
    console.log("[requirements-analyst] Gemini failed, trying heuristic fallback. Error:", (err as Error).message);
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
  // Match org/NGO/company name from various patterns
  const orgMatch = text.match(/(?:Organization|Organisation|NGO|Company|Foundation|Trust|Society)\s*(?:Name)?\s*[:\-]\s*([^\n\r]+)/i)
    || text.match(/(?:Submitted by|Implementing Agency|Proposing Organization)\s*[:\-]\s*([^\n\r]+)/i);

  // NGO ID extraction — look for registration/FCRA/certificate numbers
  const ngoIdMatch = text.match(/(?:NGO\s*ID|Registration\s*(?:No\.?|Number)|Reg\.?\s*No\.?|FCRA\s*(?:No\.?|Number)|Certificate\s*(?:No\.?|Number)|Project\s*(?:ID|No\.?))\s*[:\-]?\s*([A-Z0-9\/\-]{4,40})/i);
  const rawHeuristicNgoId = ngoIdMatch?.[1]?.trim() ?? null;

  const sectorMatch = text.match(/(?:Sector|Focus Area|Theme|Domain)\s*[:\-]\s*([^\n\r]+)/i);

  // Budget — robust extraction: prefer "Total Budget" lines, handle Indian formats & ranges
  function parseBudgetLine(line: string): { min: number | null; max: number | null } {
    function toRupees(num: number, unit: string): number {
      const u = unit.toLowerCase();
      if (u.startsWith("crore") || u === "cr") return num * 10000000;
      return num * 100000; // lakh / lakhs / l
    }

    // Case 1: range with shared trailing unit — "25-50 Lakhs" or "25 to 50 Crores"
    const rangeUnit = line.match(/([\d,]+(?:\.\d+)?)\s*[-–to]+\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores)\b/i);
    if (rangeUnit) {
      const a = toRupees(parseFloat(rangeUnit[1].replace(/,/g, "")), rangeUnit[3]);
      const b = toRupees(parseFloat(rangeUnit[2].replace(/,/g, "")), rangeUnit[3]);
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }

    // Case 2: numbers each have their own unit — "25 Lakhs - 2 Crores"
    const amounts: number[] = [];
    const re = /([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|crores|L\b|Cr\b)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      amounts.push(toRupees(parseFloat(m[1].replace(/,/g, "")), m[2]));
    }
    if (amounts.length >= 2) return { min: Math.min(...amounts), max: Math.max(...amounts) };
    if (amounts.length === 1) return { min: amounts[0], max: amounts[0] };

    // Case 3: no unit — raw Indian-format numbers (25,00,000 or 2500000)
    const numMatch = line.match(/([\d,]{4,})/g);
    if (numMatch) {
      const vals = numMatch.map(n => parseFloat(n.replace(/,/g, ""))).filter(n => n >= 10000);
      if (vals.length >= 2) return { min: Math.min(...vals), max: Math.max(...vals) };
      if (vals.length === 1) return { min: vals[0], max: vals[0] };
    }
    return { min: null, max: null };
  }

  // Try "Total Budget / Total Cost / Project Budget" lines first (most reliable)
  const totalBudgetLine = text.match(/(?:Total\s+(?:Budget|Cost|Project\s+Cost|Funding|Grant)|Project\s+Budget|Grant\s+Amount)[^\n]*/i)?.[0]
    || text.match(/(?:Budget|Funding|Cost|Grant)\s*[:\-][^\n]*/i)?.[0]
    || "";
  const { min: budgetMin, max: budgetMax } = parseBudgetLine(totalBudgetLine);

  const stateMatch = text.match(/(?:State|Location|Region)\s*[:\-]\s*([^\n\r,]+)/i)
    || text.match(/\b(Maharashtra|Karnataka|Tamil Nadu|Rajasthan|Uttar Pradesh|Bihar|Gujarat|Andhra Pradesh|Telangana|Madhya Pradesh|West Bengal|Odisha|Jharkhand|Assam|Kerala)\b/i);

  const districtMatch = text.match(/(?:District|Taluka)\s*[:\-]\s*([^\n\r,]+)/i);
  const durationMatch = text.match(/(?:Duration|Period|Timeline)\s*[:\-]\s*(\d+)\s*(?:months?|years?)/i);
  const durationYears = text.match(/(?:Duration|Period|Timeline)\s*[:\-]\s*(\d+)\s*years?/i);

  // Sector detection — score each sector by keyword count, pick highest
  const fullText = text.toUpperCase();
  const sectorScores: Record<string, number> = {
    HEALTHCARE: 0, EDUCATION: 0, LIVELIHOOD: 0, WATER_SANITATION: 0, ENVIRONMENT: 0, OTHER: 0,
  };
  const sectorKeywords: Record<string, string[]> = {
    HEALTHCARE:      ["HEALTH", "MEDICAL", "HOSPITAL", "CLINIC", "NUTRITION", "MATERNAL", "DISEASE", "MEDICINE", "DOCTOR", "NURSE", "PATIENT", "THERAPY"],
    EDUCATION:       ["SCHOOL", "COLLEGE", "STUDENT", "TEACHER", "CURRICULUM", "CLASSROOM", "DIGITAL LITERACY", "SCHOLARSHIP", "VOCATIONAL TRAINING"],
    LIVELIHOOD:      ["LIVELIHOOD", "INCOME", "EMPLOYMENT", "SELF HELP GROUP", "SHG", "MICRO FINANCE", "ENTREPRENEUR"],
    WATER_SANITATION:["WATER", "SANITATION", "WASH", "TOILET", "LATRINE", "BORE WELL", "DRINKING WATER"],
    ENVIRONMENT:     ["ENVIRONMENT", "FOREST", "SOLAR", "CLIMATE", "BIODIVERSITY", "CLEAN ENERGY", "AFFORESTATION"],
  };
  for (const [sec, keywords] of Object.entries(sectorKeywords)) {
    for (const kw of keywords) {
      let pos = 0;
      while ((pos = fullText.indexOf(kw, pos)) !== -1) { sectorScores[sec]++; pos++; }
    }
  }
  // Also give weight to explicit "Sector:" label
  if (sectorMatch) {
    const s = sectorMatch[1].toUpperCase();
    if (s.includes("HEALTH"))   sectorScores["HEALTHCARE"]       += 5;
    if (s.includes("EDU"))      sectorScores["EDUCATION"]         += 5;
    if (s.includes("LITER") && !s.includes("HEALTH")) sectorScores["EDUCATION"] += 5;
    if (s.includes("LIVE"))     sectorScores["LIVELIHOOD"]        += 5;
    if (s.includes("WATER"))    sectorScores["WATER_SANITATION"]  += 5;
    if (s.includes("ENV"))      sectorScores["ENVIRONMENT"]       += 5;
  }
  let sector: any = "OTHER";
  let topScore = 0;
  for (const [sec, score] of Object.entries(sectorScores)) {
    if (score > topScore) { topScore = score; sector = sec; }
  }

  // Budget already parsed above into budgetMin / budgetMax

  // Duration in months
  let durationVal: number | null = null;
  if (durationYears) durationVal = parseInt(durationYears[1]) * 12;
  else if (durationMatch) durationVal = parseInt(durationMatch[1]);

  const orgName = orgMatch?.[1]?.trim() || null;
  const state = (stateMatch?.[1] ?? stateMatch?.[0] ?? "").trim() || null;
  const district = districtMatch?.[1]?.trim();

  // Need at least something useful to return
  if (!orgName && !sectorMatch && !stateMatch) return null;

  return {
    companyName:     orgName,
    companyNameConf: orgName ? 0.75 : 0,
    ngoId:           rawHeuristicNgoId,
    sector,
    sectorConfidence: sectorMatch ? 0.75 : 0.5,
    geography: {
      state: state,
      stateConf: state ? 0.75 : 0,
      districts: district ? [district] : [],
      districtsConf: district ? 0.7 : 0,
    },
    budget: {
      minInr: budgetMin,
      maxInr: budgetMax,
      conf: budgetMin ? 0.65 : 0,
    },
    durationMonths: { value: durationVal, conf: durationVal ? 0.7 : 0 },
    primaryKpis: [],
    reportingCadence: { value: null, conf: 0 },
    constraints: [],
    requiresHumanReview: true,
    lowConfidenceFields: ["heuristic-extraction — AI quota exceeded, manual review required"],
  };
}


// ── MAIN FUNCTION (no LangGraph — simpler and more reliable) ──────────────────

export async function runRequirementsAnalyst(
  input: RequirementsAnalystInput
): Promise<{ status: string; requiresReview: boolean; lowConfidenceFields: string[] }> {
  const { requirementId, tenantId, documentText, rawFileBase64, rawFileMimeType } = input;

  const promptHash = crypto
    .createHash("sha256")
    .update(SYSTEM_PROMPT + (rawFileBase64 ? rawFileBase64.slice(0, 200) : documentText.slice(0, 500)))
    .digest("hex");

  // Guard: nothing to work with at all
  if ((!documentText || documentText.trim().length < 80) && !rawFileBase64) {
    console.warn("[requirements-analyst] No document text or file. Marking as NEEDS_REVIEW.");
    await prisma.sponsorRequirement.update({
      where: { id: requirementId },
      data: { status: "NEEDS_REVIEW" },
    });
    return { status: "NEEDS_REVIEW", requiresReview: true, lowConfidenceFields: ["all — no readable content provided"] };
  }

  // Step 1 — Extract with Gemini (text mode or inline-file mode)
  const { result, modelVersion, latencyMs, error } = await extractWithGemini(documentText, rawFileBase64, rawFileMimeType);

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

  // Step 3 — Check if ANY intake field was matched
  const hasAnyField =
    (result.companyName && result.companyNameConf > 0) ||
    (result.sector && result.sector !== "OTHER" && result.sectorConfidence > 0) ||
    (result.geography.state && result.geography.stateConf > 0) ||
    (result.budget.minInr != null && result.budget.minInr > 0 && result.budget.conf > 0) ||
    (result.durationMonths.value != null && result.durationMonths.value > 0) ||
    (result.primaryKpis.length > 0 && result.primaryKpis.some(k => k.conf > 0));

  if (!hasAnyField) {
    console.warn("[requirements-analyst] Zero fields matched — rejecting document.");
    await prisma.sponsorRequirement.update({
      where: { id: requirementId },
      data: {
        status: "REJECTED" as any,
        extractedFields: {
          rejectionReason: "No intake form fields could be matched from this document. Please upload a valid CSR RFP or NGO proposal document.",
        },
      },
    });
    await auditLog({
      tenantId,
      eventType: "REQUIREMENT_EXTRACTION_FAILED",
      entityType: "SponsorRequirement",
      entityId: requirementId,
      actorType: "AGENT",
      afterState: { reason: "zero_fields_matched" },
    });
    return { status: "REJECTED", requiresReview: false, lowConfidenceFields: ["all — no fields matched from document"] };
  }

  // Step 4 — Persist results
  const status = result.requiresHumanReview ? "NEEDS_REVIEW" : "EXTRACTED";

  // Preserve rawText (text docs) or rawFileMimeType (scanned docs) from upload
  const existing = await prisma.sponsorRequirement.findUnique({
    where: { id: requirementId },
    select: { extractedFields: true },
  });
  const existingRaw = existing?.extractedFields as any;
  const preserved: Record<string, any> = {};
  if (existingRaw?.rawText)        preserved.rawText        = existingRaw.rawText;
  if (existingRaw?.rawFileMimeType) preserved.rawFileMimeType = existingRaw.rawFileMimeType;
  if (documentText && documentText.trim().length >= 80) preserved.rawText = documentText.slice(0, 20000);

  await prisma.sponsorRequirement.update({
    where: { id: requirementId },
    data: {
      extractedFields: { ...(result as any), ...preserved },
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