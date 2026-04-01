import PptxGenJS from 'pptxgenjs';
import { prisma } from '@ngo/database';
import type { ExtractionResult } from '../requirements-analyst/schema';

// ── THEME ──────────────────────────────────────────────────────────────────────
const C = {
  navy:      '1B3A6B',
  navyDark:  '0F2554',
  green:     '16A34A',
  slate:     'F1F5F9',
  dark:      '0F172A',
  muted:     '64748B',
  white:     'FFFFFF',
  border:    'CBD5E1',
  amber:     'D97706',
  red:       'DC2626',
};
const F = { cover: 34, title: 18, heading: 13, body: 10, small: 8 };
const SW = 13.33;
const SH  = 7.5;

// ── HELPERS ────────────────────────────────────────────────────────────────────
function crore(n: number) {
  return n >= 10_000_000 ? `₹${(n / 10_000_000).toFixed(1)}Cr` : `₹${(n / 100_000).toFixed(1)}L`;
}

function addHeader(pptx: PptxGenJS, slide: PptxGenJS.Slide, title: string, num: number, total: number) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.65, fill: { color: C.navyDark }, line: { color: C.navyDark } });
  slide.addText(title, { x: 0.4, y: 0.08, w: 11.5, h: 0.5, fontSize: F.heading + 1, color: C.white, bold: true });
  slide.addText(`${num} / ${total}`, { x: 12.2, y: 0.08, w: 0.9, h: 0.5, fontSize: F.small, color: C.border, align: 'right' });
}

function addFooter(slide: PptxGenJS.Slide, label: string) {
  slide.addShape(new PptxGenJS().ShapeType?.rect ?? 'rect' as any, { x: 0, y: 7.3, w: SW, h: 0.2, fill: { color: C.navy }, line: { color: C.navy } });
  slide.addText(`${label}  ·  Confidential — For CSR Review Only  ·  © ${new Date().getFullYear()}`, {
    x: 0.3, y: 7.3, w: 12.7, h: 0.2, fontSize: 7, color: C.border, align: 'center',
  });
}

function box(
  pptx: PptxGenJS, slide: PptxGenJS.Slide,
  x: number, y: number, w: number, h: number,
  fill: string, label: string, value: string,
  labelColor = C.muted, valueColor = C.dark, valueFontSize = F.body,
) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: C.border }, rectRadius: 0.1 });
  slide.addText(label, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.3, fontSize: F.small, color: labelColor, bold: true });
  slide.addText(value, { x: x + 0.15, y: y + 0.38, w: w - 0.3, h: h - 0.5, fontSize: valueFontSize, color: valueColor, bold: true, lineSpacingMultiple: 1.2 });
}

function sectorProblem(sector: string, state: string, beneficiaries: number): string {
  const b = beneficiaries.toLocaleString('en-IN');
  const p: Record<string, string> = {
    EDUCATION:        `In ${state}, over ${b} individuals lack access to quality education. High dropout rates, inadequate infrastructure, and a shortage of trained teachers continue to limit economic mobility for the most vulnerable communities.`,
    HEALTHCARE:       `${b} underserved residents in ${state} lack basic primary healthcare access. Doctor shortages, poor maternal health outcomes, and endemic preventable diseases demand urgent, structured CSR intervention.`,
    ENVIRONMENT:      `Rapid ecological degradation in ${state} threatens ${b} community members with water scarcity, reduced crop yields, and climate-driven disasters. Restoration and resilience-building is critical.`,
    LIVELIHOOD:       `Unemployment and skill gaps keep ${b} youth and women in ${state} trapped in poverty. Lack of market linkages and vocational training perpetuates intergenerational inequality.`,
    WATER_SANITATION: `Over ${b} households in ${state} lack safe drinking water and hygienic sanitation, exposing communities — especially women and children — to preventable disease and indignity daily.`,
    INFRASTRUCTURE:   `${b} residents in ${state} face critical infrastructure deficits — inadequate roads, community facilities, and civic infrastructure limit economic participation and service delivery.`,
  };
  return p[sector] ?? p['EDUCATION'];
}

function sectorKPIs(sector: string, beneficiaries: number): [string, string][] {
  const b = beneficiaries.toLocaleString('en-IN');
  const m: Record<string, [string, string][]> = {
    EDUCATION:        [['Students Enrolled', b], ['Literacy Improvement', '≥ 30%'], ['Teacher Training', '4/year']],
    HEALTHCARE:       [['Patients Treated', b], ['Morbidity Reduction', '≥ 20%'], ['Vaccination Coverage', '≥ 85%']],
    ENVIRONMENT:      [['Beneficiaries Covered', b], ['CO₂ Offset (tonnes)', 'TBD'], ['Community Volunteers', `${Math.round(beneficiaries * 0.1)}`]],
    LIVELIHOOD:       [['Persons Trained', b], ['Placement Rate', '≥ 60%'], ['Income Increase', '≥ 25%']],
    WATER_SANITATION: [['HH with Clean Water', b], ['ODF Villages', `${Math.ceil(beneficiaries / 200)}`], ['Disease Reduction', '≥ 40%']],
    INFRASTRUCTURE:   [['Structures Built', `${Math.ceil(beneficiaries / 500)}`], ['Beneficiaries Served', b], ['Quality Audits Passed', '100%']],
  };
  return m[sector] ?? m['EDUCATION'];
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────────
export async function buildPitchDeck(
  requirementId:    string,
  approvedMatchIds: string[],
  tenantId:         string,
): Promise<Buffer> {

  const requirement = await prisma.sponsorRequirement.findFirstOrThrow({
    where:   { id: requirementId, tenantId },
    include: { donor: { select: { orgName: true } } },
  });

  const fields = (requirement.extractedFields ?? {}) as ExtractionResult;

  const matches = await prisma.matchResult.findMany({
    where:   { requirementId, id: { in: approvedMatchIds } },
    include: {
      initiative: {
        include: {
          milestones: { select: { title: true, status: true, dueDate: true, budgetAllocated: true }, orderBy: { sequenceOrder: 'asc' } },
          tenant:     { select: { name: true } },
        },
      },
    },
    orderBy: { rank: 'asc' },
  });

  const donorName  = requirement.donor?.orgName ?? 'Corporate Partner';
  const sector     = (fields.sector ?? matches[0]?.initiative.sector ?? 'EDUCATION') as string;
  const stateLabel = (fields.geography as any)?.state ?? (matches[0]?.initiative.geography as any)?.state ?? 'Pan-India';
  const budMin     = (fields as any)?.budget?.minInr ?? 0;
  const budMax     = (fields as any)?.budget?.maxInr ?? 0;
  const budLabel   = budMin > 0 ? `${crore(budMin)} – ${crore(budMax)}` : 'As per proposal';

  const TOTAL = 5;
  const pptx  = new PptxGenJS();
  pptx.layout  = 'LAYOUT_WIDE';
  pptx.author  = 'NGO Impact Platform';
  pptx.subject = `CSR Impact Proposal — ${donorName}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 1 — COVER  (Project Title & NGO Details)
  // ─────────────────────────────────────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: C.navy };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: SH, fill: { color: C.green }, line: { color: C.green } });

  s1.addText('NGO IMPACT PLATFORM', {
    x: 0.5, y: 1.0, w: 12, h: 0.38,
    fontSize: F.small + 2, color: C.border, bold: true, charSpacing: 4,
  });
  s1.addText('CSR IMPACT\nPARTNERSHIP PROPOSAL', {
    x: 0.5, y: 1.55, w: 12, h: 2.0,
    fontSize: F.cover, color: C.white, bold: true, lineSpacingMultiple: 1.2,
  });
  s1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.65, w: 2.2, h: 0.06, fill: { color: C.green }, line: { color: C.green } });

  s1.addText(`Prepared For:  ${donorName}`, {
    x: 0.5, y: 3.82, w: 12, h: 0.42, fontSize: F.heading + 1, color: C.white, bold: true,
  });
  s1.addText(
    `Sector: ${sector.replace(/_/g, ' ')}   ·   Location: ${stateLabel}   ·   Budget: ${budLabel}   ·   Initiatives: ${matches.length}`,
    { x: 0.5, y: 4.35, w: 12, h: 0.3, fontSize: F.body - 1, color: C.border },
  );
  s1.addText(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, {
    x: 0.5, y: 4.78, w: 6, h: 0.28, fontSize: F.small + 1, color: C.border,
  });

  // NGO details per matched initiative (compact list)
  if (matches.length > 0) {
    s1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.25, w: SW - 0.8, h: 0.04, fill: { color: C.border }, line: { color: C.border } });
    s1.addText('MATCHED NGO PARTNERS', { x: 0.5, y: 5.4, w: 6, h: 0.28, fontSize: F.small, color: C.border, bold: true, charSpacing: 2 });
    matches.forEach((m, i) => {
      const score = Math.round(m.overallScore);
      s1.addText(
        `${i + 1}.  ${m.initiative.title}  (${m.initiative.tenant?.name ?? 'NGO'})  ·  Match Score: ${score}%`,
        { x: 0.5, y: 5.75 + i * 0.32, w: SW - 1, h: 0.28, fontSize: F.small + 1, color: C.white },
      );
    });
  }

  s1.addText('CONFIDENTIAL', { x: 10, y: 7.0, w: 3.1, h: 0.28, fontSize: F.small, color: C.green, bold: true, align: 'right' });

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 2 — PROBLEM STATEMENT + PROJECT OVERVIEW + NEEDS ASSESSMENT
  // ─────────────────────────────────────────────────────────────────────────────
  const s2 = pptx.addSlide();
  addHeader(pptx, s2, 'Problem Statement · Project Overview · Needs Assessment', 2, TOTAL);
  addFooter(s2, donorName);

  const beneficiaries = matches.reduce((acc, m) => acc + (m.initiative.targetBeneficiaries ?? 0), 0) || 5000;
  const problemText   = sectorProblem(sector, stateLabel, beneficiaries);

  // Left: Problem Statement
  s2.addShape(pptx.ShapeType.rect, { x: 0.3, y: 0.75, w: 0.06, h: 1.6, fill: { color: C.green }, line: { color: C.green } });
  s2.addText('PROBLEM STATEMENT', { x: 0.55, y: 0.75, w: 5.5, h: 0.3, fontSize: F.small, color: C.green, bold: true, charSpacing: 1.5 });
  s2.addText(problemText, { x: 0.55, y: 1.1, w: 5.8, h: 1.4, fontSize: F.body, color: C.dark, lineSpacingMultiple: 1.4 });

  // Right: Beneficiary stat
  s2.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: 0.75, w: 6.2, h: 1.8, fill: { color: C.navyDark }, line: { color: C.navyDark }, rectRadius: 0.12 });
  s2.addText('TOTAL BENEFICIARIES', { x: 7.0, y: 0.9, w: 5.8, h: 0.3, fontSize: F.small, color: C.border, bold: true, align: 'center' });
  s2.addText(beneficiaries.toLocaleString('en-IN'), { x: 7.0, y: 1.25, w: 5.8, h: 0.6, fontSize: 28, color: C.green, bold: true, align: 'center' });
  s2.addText('individuals targeted across matched initiatives', { x: 7.0, y: 1.9, w: 5.8, h: 0.35, fontSize: F.small, color: C.border, align: 'center' });

  // Project Overview boxes (WHAT / WHO / WHERE / DURATION)
  s2.addText('PROJECT OVERVIEW', { x: 0.3, y: 2.75, w: 4, h: 0.3, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const initiative0 = matches[0]?.initiative;
  const overviewItems = [
    { label: 'WHAT', val: initiative0?.title ?? 'CSR Initiative' },
    { label: 'WHO', val: `${beneficiaries.toLocaleString('en-IN')} Beneficiaries` },
    { label: 'WHERE', val: stateLabel },
    { label: 'DURATION', val: (fields as any)?.duration ? `${(fields as any).duration} months` : '12 Months' },
  ];
  overviewItems.forEach((ov, i) => {
    const bx = 0.3 + i * 3.26;
    box(pptx, s2, bx, 3.1, 3.1, 0.95, C.slate, ov.label, ov.val, C.muted, C.dark, F.body);
  });

  // Needs Assessment table
  s2.addText('NEEDS ASSESSMENT', { x: 0.3, y: 4.18, w: 4, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const needsHeader = [
    { text: 'Need Area',        options: { bold: true, color: C.white, fill: { color: C.navy } } },
    { text: 'Current Status',   options: { bold: true, color: C.white, fill: { color: C.navy } } },
    { text: 'Target Outcome',   options: { bold: true, color: C.white, fill: { color: C.navy } } },
    { text: 'Population',       options: { bold: true, color: C.white, fill: { color: C.navy } } },
  ];
  const sectorNeeds: Record<string, string[][]> = {
    EDUCATION:        [['Primary Education', 'Below par enrolment', 'Grade 5+ completion ≥ 80%', beneficiaries.toLocaleString('en-IN')], ['Digital Literacy', 'Near-zero tech access', '≥ 70% digital exposure', `${Math.round(beneficiaries * 0.6).toLocaleString('en-IN')}`]],
    HEALTHCARE:       [['Primary Healthcare', 'Doctor-patient ratio < 1:5000', '≥ 80% OPD coverage', beneficiaries.toLocaleString('en-IN')], ['Maternal Health', 'High MMR in target area', 'Institutional delivery ≥ 90%', `${Math.round(beneficiaries * 0.3).toLocaleString('en-IN')}`]],
    ENVIRONMENT:      [['Afforestation', 'Forest cover < 12%', '≥ 20% tree coverage', beneficiaries.toLocaleString('en-IN')], ['Water Conservation', 'Seasonal river depletion', 'Year-round water access', `${Math.round(beneficiaries * 0.8).toLocaleString('en-IN')}`]],
    LIVELIHOOD:       [['Skill Development', 'Youth unemployment > 35%', 'Placement rate ≥ 60%', beneficiaries.toLocaleString('en-IN')], ['Women Entrepreneurship', 'Low female workforce participation', 'SHG formation + income growth', `${Math.round(beneficiaries * 0.5).toLocaleString('en-IN')}`]],
    WATER_SANITATION: [['Clean Drinking Water', '< 40% piped water coverage', '≥ 90% HH safe water', beneficiaries.toLocaleString('en-IN')], ['Sanitation', 'Open defecation prevalent', 'ODF status achieved', `${Math.round(beneficiaries * 0.7).toLocaleString('en-IN')}`]],
    INFRASTRUCTURE:   [['Community Structures', 'No functional community halls', 'Structures built & operational', beneficiaries.toLocaleString('en-IN')], ['Road Connectivity', 'Unpaved roads > 70%', '≥ 80% paved connectivity', `${Math.round(beneficiaries * 0.9).toLocaleString('en-IN')}`]],
  };
  const needsRows = sectorNeeds[sector] ?? sectorNeeds['EDUCATION'];
  s2.addTable(
    [needsHeader as any, ...needsRows.map(r => r.map(c => ({ text: c, options: { fontSize: F.small, color: C.dark } })))],
    { x: 0.3, y: 4.5, w: 12.7, h: 1.08 * (needsRows.length + 1), colW: [3.3, 3.3, 3.3, 2.8], border: { type: 'solid', color: C.border, pt: 0.5 }, fontSize: F.small },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 3 — PROPOSED SOLUTION + GAP ANALYSIS + MILESTONES & TIMELINE
  // ─────────────────────────────────────────────────────────────────────────────
  const s3 = pptx.addSlide();
  addHeader(pptx, s3, 'Proposed Solution · Gap Analysis · Milestones & Timeline', 3, TOTAL);
  addFooter(s3, donorName);

  // Proposed Solution (4 pillars)
  s3.addText('PROPOSED SOLUTION', { x: 0.3, y: 0.78, w: 5, h: 0.28, fontSize: F.small, color: C.green, bold: true, charSpacing: 1.5 });
  const pillars = [
    { n: '01', label: 'Community Engagement', desc: 'Participatory planning with local stakeholders for need-based delivery' },
    { n: '02', label: 'Capacity Building', desc: 'Training of local personnel to ensure sustainable operations post-project' },
    { n: '03', label: 'Technology Integration', desc: 'Digital MIS for real-time monitoring and transparent reporting' },
    { n: '04', label: 'Partnership Ecosystem', desc: 'Govt., NGO & corporate tie-ups to amplify reach and resource efficiency' },
  ];
  pillars.forEach((p, i) => {
    const bx = 0.3 + i * 3.26;
    s3.addShape(pptx.ShapeType.roundRect, { x: bx, y: 1.1, w: 3.1, h: 1.5, fill: { color: C.slate }, line: { color: C.border }, rectRadius: 0.12 });
    s3.addShape(pptx.ShapeType.ellipse, { x: bx + 1.15, y: 1.15, w: 0.7, h: 0.45, fill: { color: C.navy }, line: { color: C.navy } });
    s3.addText(p.n, { x: bx + 1.15, y: 1.16, w: 0.7, h: 0.44, fontSize: F.body, color: C.white, bold: true, align: 'center', valign: 'middle' });
    s3.addText(p.label, { x: bx + 0.1, y: 1.65, w: 2.9, h: 0.32, fontSize: F.small + 1, color: C.navy, bold: true, align: 'center' });
    s3.addText(p.desc, { x: bx + 0.1, y: 1.98, w: 2.9, h: 0.58, fontSize: F.small, color: C.muted, align: 'center', lineSpacingMultiple: 1.25 });
  });

  // Gap Analysis (summary boxes)
  s3.addText('GAP ANALYSIS', { x: 0.3, y: 2.75, w: 4, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const totalBudgetRequired = (budMin > 0 ? (budMin + budMax) / 2 : 5_000_000);
  const fundingGapPct = 62;
  const gapItems = [
    { label: 'FUNDING REQUIRED', val: crore(totalBudgetRequired), bg: C.slate },
    { label: 'FUNDING GAP', val: `${fundingGapPct}% Unfunded`, bg: 'FEF3C7' },
    { label: 'RESOURCE DEFICIT', val: `${Math.ceil(beneficiaries / 1000)} FTEs needed`, bg: 'FEE2E2' },
    { label: 'CSR CONTRIBUTION', val: `Covers ${100 - fundingGapPct}% of Gap`, bg: 'DCFCE7' },
  ];
  gapItems.forEach((g, i) => {
    box(pptx, s3, 0.3 + i * 3.26, 3.08, 3.1, 0.88, g.bg, g.label, g.val, C.muted, C.dark, F.body + 1);
  });

  // Milestones table
  s3.addText('MILESTONES & TIMELINE', { x: 0.3, y: 4.1, w: 5, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const allMilestones = matches.flatMap(m => m.initiative.milestones.map(ms => ({
    ...ms, initiative: m.initiative.title,
  }))).slice(0, 5);

  const defaultMilestones = [
    { title: 'Project Kickoff & Community Mobilisation', status: 'PENDING', dueDate: null, budgetAllocated: totalBudgetRequired * 0.1, initiative: matches[0]?.initiative.title ?? 'Initiative' },
    { title: 'Infrastructure & Resource Setup',         status: 'PENDING', dueDate: null, budgetAllocated: totalBudgetRequired * 0.25, initiative: matches[0]?.initiative.title ?? 'Initiative' },
    { title: 'Programme Delivery Phase 1',              status: 'PENDING', dueDate: null, budgetAllocated: totalBudgetRequired * 0.3,  initiative: matches[0]?.initiative.title ?? 'Initiative' },
    { title: 'Mid-Term Review & Course Correction',     status: 'PENDING', dueDate: null, budgetAllocated: totalBudgetRequired * 0.2,  initiative: matches[0]?.initiative.title ?? 'Initiative' },
    { title: 'Final Impact Assessment & Closure',       status: 'PENDING', dueDate: null, budgetAllocated: totalBudgetRequired * 0.15, initiative: matches[0]?.initiative.title ?? 'Initiative' },
  ];
  const milestoneRows = (allMilestones.length > 0 ? allMilestones : defaultMilestones).map((ms, i) => [
    { text: `Q${i + 1}`, options: { fontSize: F.small, color: C.muted, bold: true } },
    { text: ms.title, options: { fontSize: F.small, color: C.dark } },
    { text: ms.dueDate ? new Date(ms.dueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : `Month ${(i + 1) * 3}`, options: { fontSize: F.small, color: C.muted } },
    { text: ms.budgetAllocated ? crore(ms.budgetAllocated) : '-', options: { fontSize: F.small, color: C.dark, bold: true } },
    { text: (ms.status ?? 'PENDING').replace(/_/g, ' '), options: { fontSize: F.small, color: ms.status === 'COMPLETED' ? C.green : C.muted } },
  ]);
  s3.addTable(
    [
      [
        { text: 'Phase', options: { bold: true, color: C.white, fill: { color: C.navy } } },
        { text: 'Milestone', options: { bold: true, color: C.white, fill: { color: C.navy } } },
        { text: 'Target Date', options: { bold: true, color: C.white, fill: { color: C.navy } } },
        { text: 'Budget', options: { bold: true, color: C.white, fill: { color: C.navy } } },
        { text: 'Status', options: { bold: true, color: C.white, fill: { color: C.navy } } },
      ] as any,
      ...milestoneRows,
    ],
    { x: 0.3, y: 4.4, w: 12.7, h: 2.58, colW: [0.8, 5.2, 2.0, 1.8, 2.9], border: { type: 'solid', color: C.border, pt: 0.5 }, fontSize: F.small },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 4 — BUDGET BREAKDOWN + EXPECTED IMPACT + MONITORING + RISKS
  // ─────────────────────────────────────────────────────────────────────────────
  const s4 = pptx.addSlide();
  addHeader(pptx, s4, 'Budget · Expected Impact · Monitoring & Reporting · Risks', 4, TOTAL);
  addFooter(s4, donorName);

  // Budget breakdown (left)
  s4.addText('BUDGET BREAKDOWN', { x: 0.3, y: 0.78, w: 4, h: 0.28, fontSize: F.small, color: C.green, bold: true, charSpacing: 1.5 });
  const budgetCategories = [
    { cat: 'Programme Delivery',    pct: 45 },
    { cat: 'Infrastructure & Setup', pct: 20 },
    { cat: 'Human Resources',       pct: 18 },
    { cat: 'Monitoring & Evaluation', pct: 10 },
    { cat: 'Admin & Overheads',     pct: 7  },
  ];
  budgetCategories.forEach((bc, i) => {
    const total = totalBudgetRequired;
    const amt   = crore(total * bc.pct / 100);
    s4.addShape(pptx.ShapeType.rect, { x: 0.3, y: 1.1 + i * 0.56, w: bc.pct / 100 * 5.5, h: 0.38, fill: { color: C.navy }, line: { color: C.navy } });
    s4.addText(`${bc.cat}`, { x: 0.3, y: 1.1 + i * 0.56, w: 4.0, h: 0.38, fontSize: F.small, color: C.white, valign: 'middle' });
    s4.addText(`${bc.pct}%  ${amt}`, { x: 5.55, y: 1.1 + i * 0.56, w: 1.4, h: 0.38, fontSize: F.small, color: C.dark, valign: 'middle', bold: true });
  });

  // Expected Impact (KPIs, right)
  s4.addText('EXPECTED IMPACT (KPIs)', { x: 7.2, y: 0.78, w: 5.8, h: 0.28, fontSize: F.small, color: C.green, bold: true, charSpacing: 1.5 });
  const kpis = sectorKPIs(sector, beneficiaries);
  kpis.forEach((kp, i) => {
    s4.addShape(pptx.ShapeType.roundRect, { x: 7.2 + i * 2.0, y: 1.1, w: 1.9, h: 1.4, fill: { color: C.slate }, line: { color: C.border }, rectRadius: 0.1 });
    s4.addText(kp[0], { x: 7.2 + i * 2.0 + 0.1, y: 1.15, w: 1.7, h: 0.55, fontSize: F.small, color: C.muted, align: 'center', lineSpacingMultiple: 1.2 });
    s4.addText(kp[1], { x: 7.2 + i * 2.0 + 0.1, y: 1.72, w: 1.7, h: 0.5, fontSize: F.heading, color: C.navy, bold: true, align: 'center' });
  });

  // Monitoring & Reporting (left bottom)
  s4.addText('MONITORING & REPORTING', { x: 0.3, y: 4.0, w: 6, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const monRows = [
    ['Monthly', 'Field visit reports, beneficiary counts, photographic evidence'],
    ['Quarterly', 'Financial utilisation reports, milestone progress updates'],
    ['Half-Yearly', 'Mid-term outcome assessment, stakeholder review meeting'],
    ['Annual', 'Third-party impact evaluation, audited financial statements'],
  ];
  s4.addTable(
    [
      [{ text: 'Frequency', options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: 'Reporting Deliverable', options: { bold: true, color: C.white, fill: { color: C.navy } } }] as any,
      ...monRows.map(r => r.map(c => ({ text: c, options: { fontSize: F.small, color: C.dark } }))),
    ],
    { x: 0.3, y: 4.32, w: 6.4, h: 1.62 * 1.05, colW: [1.4, 5.0], border: { type: 'solid', color: C.border, pt: 0.5 }, fontSize: F.small },
  );

  // Risks (right bottom)
  s4.addText('RISKS & MITIGATION', { x: 7.2, y: 4.0, w: 5.8, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  const riskRows = [
    { risk: 'Funding Delay',    sev: 'Med', mit: 'Advance disbursement schedule' },
    { risk: 'Staff Attrition',  sev: 'Low', mit: 'Competitive pay + documented SOPs' },
    { risk: 'Regulatory Change',sev: 'Low', mit: 'Legal liaison + compliance team' },
    { risk: 'Low Uptake',       sev: 'Med', mit: 'Community mobilisation drives' },
  ];
  s4.addTable(
    [
      [{ text: 'Risk', options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: 'Severity', options: { bold: true, color: C.white, fill: { color: C.navy } } }, { text: 'Mitigation', options: { bold: true, color: C.white, fill: { color: C.navy } } }] as any,
      ...riskRows.map(r => [
        { text: r.risk, options: { fontSize: F.small, color: C.dark } },
        { text: r.sev, options: { fontSize: F.small, color: r.sev === 'Med' ? C.amber : C.green, bold: true } },
        { text: r.mit, options: { fontSize: F.small, color: C.dark } },
      ]),
    ],
    { x: 7.2, y: 4.32, w: 5.83, h: 1.62 * 1.05, colW: [1.8, 0.9, 3.13], border: { type: 'solid', color: C.border, pt: 0.5 }, fontSize: F.small },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // SLIDE 5 — NGO CREDIBILITY + FUNDING ASK + AUTHORIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const s5 = pptx.addSlide();
  addHeader(pptx, s5, 'NGO Credibility · Funding Ask · Authorization', 5, TOTAL);
  addFooter(s5, donorName);

  // NGO Credibility cards
  s5.addText('NGO CREDIBILITY', { x: 0.3, y: 0.78, w: 4, h: 0.28, fontSize: F.small, color: C.green, bold: true, charSpacing: 1.5 });
  matches.slice(0, 3).forEach((m, i) => {
    const score = Math.round(m.overallScore);
    const init  = m.initiative;
    s5.addShape(pptx.ShapeType.roundRect, { x: 0.3 + i * 4.35, y: 1.08, w: 4.1, h: 1.55, fill: { color: C.slate }, line: { color: C.border }, rectRadius: 0.12 });
    s5.addText(init.title, { x: 0.45 + i * 4.35, y: 1.12, w: 3.8, h: 0.38, fontSize: F.body + 1, color: C.navy, bold: true, lineSpacingMultiple: 1.1 });
    s5.addText(init.tenant?.name ?? 'NGO Partner', { x: 0.45 + i * 4.35, y: 1.5, w: 3.8, h: 0.28, fontSize: F.small, color: C.muted });
    s5.addShape(pptx.ShapeType.rect, { x: 0.45 + i * 4.35, y: 1.82, w: score / 100 * 3.8, h: 0.2, fill: { color: score >= 70 ? C.green : C.amber }, line: { color: 'FFFFFF' } });
    s5.addText(`AI Match Score: ${score}%`, { x: 0.45 + i * 4.35, y: 2.06, w: 3.8, h: 0.28, fontSize: F.small, color: C.dark, bold: true });
  });
  if (matches.length === 0) {
    s5.addText('No matched initiatives found.', { x: 0.3, y: 1.1, w: 12.7, h: 0.5, fontSize: F.body, color: C.muted, italic: true });
  }

  // Funding Ask (dark box)
  s5.addShape(pptx.ShapeType.roundRect, { x: 0.3, y: 2.82, w: 12.7, h: 1.3, fill: { color: C.navyDark }, line: { color: C.navyDark }, rectRadius: 0.15 });
  s5.addText('FUNDING ASK', { x: 0.6, y: 2.9, w: 4, h: 0.28, fontSize: F.small, color: C.border, bold: true, charSpacing: 2 });
  s5.addText(budLabel, { x: 0.6, y: 3.22, w: 5, h: 0.65, fontSize: 26, color: C.green, bold: true });
  s5.addText(
    `Your CSR investment of ${budLabel} will directly impact ${beneficiaries.toLocaleString('en-IN')} lives in ${stateLabel} through ${matches.length} rigorously vetted NGO programme${matches.length !== 1 ? 's' : ''} — delivering measurable, auditable outcomes aligned with Schedule VII of the Companies Act.`,
    { x: 6.0, y: 2.9, w: 6.8, h: 1.1, fontSize: F.small + 1, color: C.border, lineSpacingMultiple: 1.4 },
  );

  // Authorization (3 columns)
  s5.addText('AUTHORIZATION', { x: 0.3, y: 4.28, w: 4, h: 0.28, fontSize: F.small, color: C.muted, bold: true, charSpacing: 1.5 });
  s5.addShape(pptx.ShapeType.rect, { x: 0.3, y: 4.28, w: 12.7, h: 0.04, fill: { color: C.border }, line: { color: C.border } });

  const signatories = [
    { role: 'Prepared By', name: 'Programme Manager', org: 'NGO Impact Platform' },
    { role: 'Reviewed By', name: 'CSR Relationship Manager', org: donorName },
    { role: 'Authorized By', name: 'Executive Director', org: 'NGO Partner' },
  ];
  signatories.forEach((sig, i) => {
    const x = 0.5 + i * 4.28;
    // Accent top bar
    s5.addShape(pptx.ShapeType.rect, { x, y: 4.42, w: 3.9, h: 0.06, fill: { color: C.navy }, line: { color: C.navy } });
    s5.addText(sig.role.toUpperCase(), { x, y: 4.52, w: 3.9, h: 0.32, fontSize: F.small + 1, color: C.navy, bold: true, align: 'center', charSpacing: 1 });
    // Signature box
    s5.addShape(pptx.ShapeType.rect, { x: x + 0.15, y: 4.9, w: 3.6, h: 1.1, fill: { color: C.slate }, line: { type: 'solid', color: C.border, pt: 1 } });
    s5.addText('Digital Signature', { x: x + 0.15, y: 5.3, w: 3.6, h: 0.35, fontSize: F.small, color: C.border, align: 'center', italic: true });
    // Fields
    const fields_list = [
      { lbl: 'Name:', val: sig.name },
      { lbl: 'Org:', val: sig.org },
      { lbl: 'Date:', val: new Date().toLocaleDateString('en-IN') },
    ];
    fields_list.forEach((fld, fi) => {
      s5.addText(fld.lbl, { x, y: 6.08 + fi * 0.35, w: 0.9, h: 0.3, fontSize: F.small, color: C.muted });
      s5.addShape(pptx.ShapeType.rect, { x: x + 0.9, y: 6.1 + fi * 0.35, w: 2.9, h: 0.25, fill: { color: C.slate }, line: { color: C.border } });
      s5.addText(fld.val, { x: x + 0.9, y: 6.1 + fi * 0.35, w: 2.9, h: 0.25, fontSize: F.small, color: C.dark, align: 'center' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE & RETURN BUFFER
  // ─────────────────────────────────────────────────────────────────────────────
  const data = await pptx.write({ outputType: 'nodebuffer' });
  return data as Buffer;
}
