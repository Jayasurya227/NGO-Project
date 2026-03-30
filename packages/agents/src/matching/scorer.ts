// All scores are 0-100
// Missing data defaults to 50 (neutral)

// ── SECTOR SCORE ──────────────────────────────────────────────────────────────
export function scoreSector(
  requiredSector: string | null | undefined,
  initiativeSector: string
): number {
  if (!requiredSector) return 50;
  return requiredSector === initiativeSector ? 100 : 0;
}

// ── GEOGRAPHY SCORE ───────────────────────────────────────────────────────────
export function scoreGeography(
  reqGeo: { state?: string | null; districts?: string[] | null } | null | undefined,
  initGeo: Record<string, unknown>
): number {
  if (!reqGeo?.state) return 50;

  const initState    = (initGeo?.state    as string | undefined)?.toLowerCase() ?? '';
  const initDistrict = (initGeo?.district as string | undefined)?.toLowerCase() ?? '';
  const reqState     = reqGeo.state.toLowerCase();
  const reqDistricts = (reqGeo.districts ?? []).map(d => d?.toLowerCase() ?? '');

  if (initState !== reqState) return 30;

  if (reqDistricts.length > 0 && initDistrict) {
    const districtMatch = reqDistricts.some(d =>
      initDistrict.includes(d) || d.includes(initDistrict)
    );
    return districtMatch ? 100 : 80;
  }

  return 80;
}

// ── BUDGET SCORE ──────────────────────────────────────────────────────────────
export function scoreBudget(
  reqBudget: { minInr?: number | null; maxInr?: number | null } | null | undefined,
  initBudgetRequired: number,
  initBudgetFunded: number
): number {
  if (!reqBudget?.minInr && !reqBudget?.maxInr) return 50;

  const fundingGap = Math.max(0, initBudgetRequired - initBudgetFunded);
  const minInr     = reqBudget?.minInr ?? 0;
  const maxInr     = reqBudget?.maxInr ?? Infinity;

  if (fundingGap === 0) return 10;
  if (fundingGap >= minInr && fundingGap <= maxInr) return 100;

  if (fundingGap < minInr) {
    const ratio = fundingGap / minInr;
    return Math.round(ratio * 70);
  }

  if (fundingGap > maxInr) {
    const ratio = maxInr / fundingGap;
    return Math.round(ratio * 80);
  }

  return 50;
}

// ── KPI SCORE ─────────────────────────────────────────────────────────────────
export function scoreKpis(
  reqKpis: Array<{ metric: string }> | null | undefined,
  initSdgTags: string[] | null | undefined,
  initTitle: string,
  initDescription: string
): number {
  const kpis = reqKpis ?? [];
  if (kpis.length === 0) return 50;

  const tags    = initSdgTags ?? [];
  const initText = `${initTitle ?? ''} ${initDescription ?? ''} ${tags.join(' ')}`.toLowerCase();

  let matches = 0;
  for (const kpi of kpis) {
    const keywords = (kpi.metric ?? '').toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'that', 'have'].includes(w));

    const kpiMatches = keywords.some(kw => initText.includes(kw));
    if (kpiMatches) matches++;
  }

  return Math.round((matches / kpis.length) * 100);
}

// ── TRACK RECORD SCORE ────────────────────────────────────────────────────────
export function scoreTrackRecord(
  completedMilestones: number,
  totalMilestones: number,
  evidenceCount: number
): number {
  if (totalMilestones === 0) return 40;

  const completionRate = completedMilestones / totalMilestones;
  const evidenceBonus  = Math.min(evidenceCount * 5, 30);

  return Math.min(100, Math.round(completionRate * 70 + evidenceBonus));
}

// ── OVERALL WEIGHTED SCORE ────────────────────────────────────────────────────
export type SubScores = {
  sector:      number;
  geography:   number;
  budget:      number;
  kpi:         number;
  trackRecord: number;
};

export function computeOverallScore(subScores: SubScores): number {
  return Math.round(
    subScores.sector      * 0.30 +
    subScores.geography   * 0.25 +
    subScores.budget      * 0.20 +
    subScores.kpi         * 0.15 +
    subScores.trackRecord * 0.10
  );
}