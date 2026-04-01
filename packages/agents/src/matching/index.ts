import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@ngo/database';
import { auditLog } from '@ngo/audit';
import {
  scoreSector, scoreGeography, scoreBudget,
  scoreKpis, scoreTrackRecord, computeOverallScore,
  type SubScores,
} from './scorer';
import { embedText } from '../utils/embeddings';

// ── MINIMUM SCORE THRESHOLD ───────────────────────────────────────────────────
// If the top candidate scores below this, we consider it "no meaningful match"
const MINIMUM_MATCH_SCORE = 30;

type MatchCandidate = {
  initiativeId:     string;
  title:            string;
  overallScore:     number;
  subScores:        SubScores;
  explanation:      string;
  cosineSimilarity: number;
};

// ── STEP 1: LOAD REQUIREMENT ──────────────────────────────────────────────────
async function loadRequirement(requirementId: string, tenantId: string) {
  const req = await prisma.sponsorRequirement.findFirst({
    where: { id: requirementId, tenantId },
  });

  if (!req?.extractedFields) {
    throw new Error(`Requirement ${requirementId} not found or has no extracted fields`);
  }

  const fields = req.extractedFields as any;

  const requirementText = [
    `Sector: ${fields?.sector ?? ''}`,
    `Geography: ${fields?.geography?.state ?? ''} ${(fields?.geography?.districts ?? []).join(', ')}`,
    `Budget: ${fields?.budget?.minInr ?? 0} to ${fields?.budget?.maxInr ?? 0} INR`,
    `Duration: ${fields?.durationMonths?.value ?? 'unspecified'} months`,
    `KPIs: ${(fields?.primaryKpis ?? []).map((k: any) => k?.metric ?? '').join(', ')}`,
  ].join('\n');

  console.log(`[matching-agent] Loaded requirement. Sector: ${fields?.sector}, State: ${fields?.geography?.state}`);
  return { fields, requirementText };
}

// ── STEP 2: EMBED REQUIREMENT ─────────────────────────────────────────────────
async function embedRequirement(requirementText: string): Promise<number[]> {
  console.log(`[matching-agent] Embedding requirement text...`);
  const vector = await embedText(requirementText);
  if (!vector || vector.length === 0) {
    throw new Error('embedText returned empty vector');
  }
  console.log(`[matching-agent] Embedding complete — ${vector.length} dimensions`);
  return vector;
}

// ── STEP 3: VECTOR SEARCH ─────────────────────────────────────────────────────
async function vectorSearch(tenantId: string, vector: number[]): Promise<string[]> {
  const vectorStr = `[${vector.join(',')}]`;

  const candidates = await prisma.$queryRaw<Array<{ id: string; cosine_similarity: number }>>`
    SELECT
      id,
      1 - ("embeddingVector" <=> ${vectorStr}::vector) AS cosine_similarity
    FROM "Initiative"
    WHERE "tenantId" = ${tenantId}
      AND status NOT IN ('CLOSED', 'FULLY_FUNDED')
      AND "embeddingVector" IS NOT NULL
    ORDER BY "embeddingVector" <=> ${vectorStr}::vector
    LIMIT 20
  `;

  if (candidates.length === 0) {
    console.log(`[matching-agent] No initiatives with embeddings found for this tenant`);
    return [];
  }

  console.log(`[matching-agent] Vector search found ${candidates.length} candidates`);
  return candidates.map(c => c.id);
}

// ── STEP 4: SCORE CANDIDATES ──────────────────────────────────────────────────
async function scoreCandidates(candidateIds: string[], fields: any): Promise<MatchCandidate[]> {
  if (candidateIds.length === 0) return [];

  const initiatives = await prisma.initiative.findMany({
    where: { id: { in: candidateIds } },
    include: {
      milestones: {
        select: {
          status: true,
          _count: { select: { evidence: true } },
        },
      },
    },
  });

  const scored: MatchCandidate[] = [];

  for (const init of initiatives) {
    const completedMilestones = init.milestones.filter(m => m.status === 'COMPLETED').length;
    const evidenceCount       = init.milestones.reduce((sum, m) => sum + m._count.evidence, 0);

    const subScores: SubScores = {
      sector:      scoreSector(fields?.sector ?? null, init.sector),
      geography:   scoreGeography(
        { state: fields?.geography?.state ?? null, districts: fields?.geography?.districts ?? [] },
        init.geography as Record<string, unknown>
      ),
      budget:      scoreBudget(
        { minInr: fields?.budget?.minInr ?? null, maxInr: fields?.budget?.maxInr ?? null },
        Number(init.budgetRequired),
        Number(init.budgetFunded ?? 0)
      ),
      kpi:         scoreKpis(fields?.primaryKpis ?? [], init.sdgTags ?? [], init.title, init.description),
      trackRecord: scoreTrackRecord(completedMilestones, init.milestones.length, evidenceCount),
    };

    scored.push({
      initiativeId:     init.id,
      title:            init.title,
      overallScore:     computeOverallScore(subScores),
      subScores,
      explanation:      '',
      cosineSimilarity: 0,
    });
  }

  scored.sort((a, b) => b.overallScore - a.overallScore);
  const top5 = scored.slice(0, 5);
  console.log(`[matching-agent] Scored ${scored.length} candidates — top score: ${top5[0]?.overallScore ?? 0}`);
  return top5;
}

// ── STEP 5: EXPLAIN TOP 5 ─────────────────────────────────────────────────────
async function explainMatches(candidates: MatchCandidate[], fields: any): Promise<MatchCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  });

  const explained = [...candidates];

  for (let i = 0; i < explained.length; i++) {
    const match = explained[i];
    try {
      const prompt = `You are an expert NGO-CSR match analyst. Write exactly 2 sentences explaining why this initiative matches or does not match the donor requirement. Be specific. Reference actual data. Do not use filler phrases.

Donor requirement: ${fields?.sector ?? 'Unknown'} sector, ${fields?.geography?.state ?? 'any state'}, budget Rs ${(((fields?.budget?.minInr) ?? 0) / 100000).toFixed(1)}L to Rs ${(((fields?.budget?.maxInr) ?? 0) / 100000).toFixed(1)}L.

Initiative: "${match.title}"
Overall score: ${match.overallScore}/100
Sector score: ${match.subScores.sector}/100
Geography score: ${match.subScores.geography}/100
Budget score: ${match.subScores.budget}/100`;

      const result = await model.generateContent(prompt);
      const text   = result.response.text()?.trim() ?? '';
      explained[i] = { ...match, explanation: text || `Score ${match.overallScore}/100 match.` };
      console.log(`[matching-agent] Explanation generated for: ${match.title}`);
    } catch (err) {
      explained[i] = {
        ...match,
        explanation: `${match.subScores.sector === 100 ? 'Sector' : 'Partial'} alignment with overall score ${match.overallScore}/100.`,
      };
    }
  }

  return explained;
}

// ── STEP 6: PERSIST RESULTS ───────────────────────────────────────────────────
async function persistResults(
  requirementId: string,
  tenantId: string,
  candidates: MatchCandidate[]
): Promise<void> {
  await prisma.matchResult.deleteMany({ where: { requirementId } });

  await prisma.matchResult.createMany({
    data: candidates.map((match, index) => ({
      requirementId,
      initiativeId:        match.initiativeId,
      overallScore:        match.overallScore,
      subScores:           match.subScores,
      explanation:         match.explanation,
      hardConstraintCheck: match.subScores.sector === 0 ? 'SECTOR_MISMATCH_WARNING' : 'PASSED',
      rank:                index + 1,
    })),
  });

  await prisma.sponsorRequirement.update({
    where: { id: requirementId },
    data:  { status: 'MATCHED' },
  });

  await auditLog({
    tenantId,
    eventType:  'MATCH_RESULTS_SAVED',
    entityType: 'SponsorRequirement',
    entityId:   requirementId,
    actorType:  'AGENT',
    afterState: {
      matchCount: candidates.length,
      topScore:   candidates[0]?.overallScore,
      status:     'MATCHED',
    },
  });

  console.log(`[matching-agent] Persisted ${candidates.length} match results. Status → MATCHED`);
}

// ── STEP 6B: PERSIST NO-MATCH RESULT ─────────────────────────────────────────
async function persistNoMatch(
  requirementId: string,
  tenantId: string,
  reason: string
): Promise<void> {
  await prisma.matchResult.deleteMany({ where: { requirementId } });

  await prisma.sponsorRequirement.update({
    where: { id: requirementId },
    data:  { status: 'NEEDS_REVIEW' },
  });

  await auditLog({
    tenantId,
    eventType:  'MATCHING_NO_RESULTS',
    entityType: 'SponsorRequirement',
    entityId:   requirementId,
    actorType:  'AGENT',
    afterState: { reason, status: 'NEEDS_REVIEW' },
  });

  console.log(`[matching-agent] No match found — ${reason}. Status → NEEDS_REVIEW`);
}

// ── PUBLIC INTERFACE ──────────────────────────────────────────────────────────
export async function runMatchingAgent(params: {
  requirementId: string;
  tenantId:      string;
}): Promise<{ matchCount: number; topScore: number; status: string; noMatchReason?: string }> {
  const { requirementId, tenantId } = params;

  try {
    // Step 1 — Load requirement
    const { fields, requirementText } = await loadRequirement(requirementId, tenantId);

    // Step 2 — Embed requirement
    const vector = await embedRequirement(requirementText);

    // Step 3 — Vector search
    const candidateIds = await vectorSearch(tenantId, vector);

    // ── NO MATCH CHECK 1: No initiatives found at all ────────────────────────
    if (candidateIds.length === 0) {
      const reason = `No NGO initiatives found in the database with embeddings. Please add NGO initiatives first before matching.`;
      console.log(`[matching-agent] NO MATCH — ${reason}`);
      await persistNoMatch(requirementId, tenantId, reason);
      return { matchCount: 0, topScore: 0, status: 'NO_MATCH', noMatchReason: reason };
    }

    // Step 4 — Score candidates
    const scored = await scoreCandidates(candidateIds, fields);

    // ── NO MATCH CHECK 2: All scores too low ─────────────────────────────────
    if (scored.length === 0 || scored[0].overallScore < MINIMUM_MATCH_SCORE) {
      const topScore = scored[0]?.overallScore ?? 0;
      const reason = `No suitable NGO initiative found for this donor requirement. The best available match scored only ${topScore}/100, which is below the minimum threshold of ${MINIMUM_MATCH_SCORE}/100. The donor requires ${fields?.sector ?? 'unknown'} sector in ${fields?.geography?.state ?? 'unknown state'} — no NGO initiative currently matches these criteria closely enough.`;
      console.log(`[matching-agent] NO MATCH — top score ${topScore} below threshold ${MINIMUM_MATCH_SCORE}`);
      await persistNoMatch(requirementId, tenantId, reason);
      return { matchCount: 0, topScore, status: 'NO_MATCH', noMatchReason: reason };
    }

    // Step 5 — Generate explanations for good matches
    const explained = await explainMatches(scored, fields);

    // Step 6 — Persist results
    await persistResults(requirementId, tenantId, explained);

    return {
      matchCount: explained.length,
      topScore:   explained[0]?.overallScore ?? 0,
      status:     'COMPLETED',
    };

  } catch (err: any) {
    console.error(`[matching-agent] Fatal error:`, err.message);

    await auditLog({
      tenantId,
      eventType:  'MATCHING_FAILED',
      entityType: 'SponsorRequirement',
      entityId:   requirementId,
      actorType:  'AGENT',
      afterState: { error: err.message },
    }).catch(() => {});

    throw err;
  }
}