import PptxGenJS from 'pptxgenjs';
import { prisma } from '@ngo/database';
import type { ExtractionResult } from '../requirements-analyst/schema';

const COLOURS = {
  primary:   '1D4ED8',
  accent:    '059669',
  light:     'F1F5F9',
  dark:      '1E293B',
  muted:     '64748B',
  white:     'FFFFFF',
  watermark: 'CBD5E1',
};

const FONT = {
  title:     28,
  heading:   20,
  body:      13,
  caption:   10,
  watermark: 60,
};

function addDraftWatermark(slide: PptxGenJS.Slide): void {
  slide.addText('DRAFT', {
    x: 1, y: 1.5, w: 11, h: 4,
    fontSize:     FONT.watermark,
    color:        COLOURS.watermark,
    bold:         true,
    align:        'center',
    valign:       'middle',
    rotate:       -35,
    transparency: 75,
  });
}

function scoreColour(score: number): string {
  if (score >= 75) return '059669';
  if (score >= 50) return 'D97706';
  return 'DC2626';
}

export async function buildPitchDeck(
  requirementId:    string,
  approvedMatchIds: string[],
  tenantId:         string
): Promise<Buffer> {
  const requirement = await prisma.sponsorRequirement.findFirstOrThrow({
    where:   { id: requirementId, tenantId },
    include: { donor: { select: { orgName: true, type: true } } },
  });

  const fields = requirement.extractedFields as ExtractionResult;

  const matches = await prisma.matchResult.findMany({
    where:   { requirementId, id: { in: approvedMatchIds } },
    include: {
      initiative: {
        include: {
          milestones: {
            select: {
              title: true, status: true, dueDate: true,
              budgetAllocated: true,
            },
            orderBy: { sequenceOrder: 'asc' },
          },
          _count: { select: { beneficiaries: true } },
        },
      },
    },
    orderBy: { rank: 'asc' },
  });

  const pptx = new PptxGenJS();
  pptx.layout  = 'LAYOUT_WIDE';
  pptx.author  = 'NGO Impact Platform';
  pptx.subject = `Impact Partnership Proposal — ${requirement.donor?.orgName ?? 'Donor'}`;

  // SLIDE 1: COVER
  const cover = pptx.addSlide();
  cover.background = { color: COLOURS.primary };

  cover.addText('IMPACT PARTNERSHIP PROPOSAL', {
    x: 0.5, y: 1.5, w: 12, h: 0.6,
    fontSize: FONT.caption, color: COLOURS.white,
    bold: true, align: 'center', charSpacing: 4,
  });

  cover.addText(requirement.donor?.orgName ?? 'Corporate Partner', {
    x: 0.5, y: 2.2, w: 12, h: 1.0,
    fontSize: FONT.title + 8, color: COLOURS.white,
    bold: true, align: 'center',
  });

  cover.addText(
    `Sector: ${fields.sector}   |   Geography: ${fields.geography?.state ?? 'Pan-India'}   |   Budget: ₹${(((fields.budget?.minInr) ?? 0) / 100000).toFixed(1)}L – ₹${(((fields.budget?.maxInr) ?? 0) / 100000).toFixed(1)}L`,
    {
      x: 0.5, y: 3.5, w: 12, h: 0.5,
      fontSize: FONT.body, color: COLOURS.white, align: 'center',
    }
  );

  addDraftWatermark(cover);

  // SLIDE 2: SUMMARY TABLE
  const summary = pptx.addSlide();
  summary.background = { color: COLOURS.white };

  summary.addText('Proposed Initiatives', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: FONT.heading, color: COLOURS.dark, bold: true,
  });

  summary.addText(`${matches.length} initiatives selected based on ${fields.sector} alignment`, {
    x: 0.5, y: 0.9, w: 12, h: 0.3,
    fontSize: FONT.body, color: COLOURS.muted,
  });

  const tableRows: PptxGenJS.TableRow[] = [
    [
      { text: '#',          options: { bold: true, color: COLOURS.white, fill: { color: COLOURS.primary } } },
      { text: 'Initiative', options: { bold: true, color: COLOURS.white, fill: { color: COLOURS.primary } } },
      { text: 'Score',      options: { bold: true, color: COLOURS.white, fill: { color: COLOURS.primary } } },
      { text: 'Budget Gap', options: { bold: true, color: COLOURS.white, fill: { color: COLOURS.primary } } },
      { text: 'Geography',  options: { bold: true, color: COLOURS.white, fill: { color: COLOURS.primary } } },
    ],
    ...matches.map((m, i) => {
      const gap = Number(m.initiative.budgetRequired) - Number(m.initiative.budgetFunded);
      const geo = m.initiative.geography as { state?: string };
      return [
        { text: `${i + 1}`,                      options: { align: 'center' as const } },
        { text: m.initiative.title },
        { text: `${m.overallScore}/100`,          options: { align: 'center' as const, color: scoreColour(m.overallScore) } },
        { text: `₹${(gap / 100000).toFixed(1)}L`, options: { align: 'center' as const } },
        { text: geo.state ?? 'Multiple',          options: { align: 'center' as const } },
      ] as PptxGenJS.TableRow;
    }),
  ];

  summary.addTable(tableRows, {
    x: 0.5, y: 1.3, w: 12.3, h: 4.5,
    border:   { type: 'solid', color: 'E2E8F0', pt: 0.5 },
    fontSize: FONT.body,
    rowH:     0.55,
    align:    'left',
  });

  addDraftWatermark(summary);

  // SLIDES 3+: ONE PER INITIATIVE
  for (const match of matches) {
    const init       = match.initiative;
    const geo        = init.geography as { state?: string; district?: string };
    const fundingGap = Number(init.budgetRequired) - Number(init.budgetFunded);
    const completed  = init.milestones.filter(m => m.status === 'COMPLETED').length;
    const subScores  = match.subScores as Record<string, number>;

    const slide = pptx.addSlide();
    slide.background = { color: COLOURS.white };

    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 1.0,
      fill: { color: COLOURS.primary },
    });

    slide.addText(init.title, {
      x: 0.5, y: 0.15, w: 9, h: 0.7,
      fontSize: FONT.heading, color: COLOURS.white, bold: true,
    });

    slide.addText(`Match Score: ${match.overallScore}/100`, {
      x: 9.8, y: 0.2, w: 2.8, h: 0.6,
      fontSize: FONT.body + 2, color: COLOURS.white,
      bold: true, align: 'right',
    });

    slide.addText('Initiative Overview', {
      x: 0.5, y: 1.2, w: 6, h: 0.35,
      fontSize: FONT.body + 1, color: COLOURS.primary, bold: true,
    });

    const details = [
      `Sector: ${init.sector}`,
      `Geography: ${geo.state ?? 'Multiple'}${geo.district ? `, ${geo.district}` : ''}`,
      `Target Beneficiaries: ${init.targetBeneficiaries.toLocaleString('en-IN')}`,
      `Budget Required: ₹${(Number(init.budgetRequired) / 100000).toFixed(1)}L`,
      `Funding Gap: ₹${(fundingGap / 100000).toFixed(1)}L`,
      `Milestones Completed: ${completed}/${init.milestones.length}`,
      `SDG Tags: ${init.sdgTags.join(', ')}`,
    ].join('\n');

    slide.addText(details, {
      x: 0.5, y: 1.65, w: 5.5, h: 3.5,
      fontSize: FONT.body, color: COLOURS.dark, lineSpacingMultiple: 1.4,
    });

    slide.addText('Why This Match', {
      x: 6.5, y: 1.2, w: 6, h: 0.35,
      fontSize: FONT.body + 1, color: COLOURS.primary, bold: true,
    });

    slide.addText(match.explanation, {
      x: 6.5, y: 1.65, w: 6, h: 1.8,
      fontSize: FONT.body, color: COLOURS.dark,
      lineSpacingMultiple: 1.5, wrap: true,
    });

    slide.addText('Score Breakdown', {
      x: 6.5, y: 3.6, w: 6, h: 0.3,
      fontSize: FONT.caption + 1, color: COLOURS.muted, bold: true,
    });

    const scoreLabels: [string, number][] = [
      ['Sector Alignment', subScores.sector],
      ['Geography Match',  subScores.geography],
      ['Budget Fit',       subScores.budget],
      ['KPI Alignment',    subScores.kpi],
      ['Track Record',     subScores.trackRecord],
    ];

    scoreLabels.forEach(([label, score], i) => {
      slide.addText(`${label}: ${score}/100`, {
        x: 6.5, y: 3.95 + i * 0.4, w: 6, h: 0.35,
        fontSize: FONT.caption + 1,
        color: scoreColour(score),
      });
    });

    addDraftWatermark(slide);
  }

  // SLIDE: NEXT STEPS
  const nextSteps = pptx.addSlide();
  nextSteps.background = { color: COLOURS.light };

  nextSteps.addText('Next Steps', {
    x: 0.5, y: 0.5, w: 12, h: 0.7,
    fontSize: FONT.heading, color: COLOURS.dark, bold: true, align: 'center',
  });

  nextSteps.addText(
    '1.  Review proposed initiatives and shortlist preferred partners\n\n' +
    '2.  Schedule site visits to verify ground operations\n\n' +
    '3.  Execute CSR partnership agreement and disbursement schedule\n\n' +
    '4.  Receive quarterly progress reports and verified evidence\n\n' +
    '5.  Review impact outcomes at milestone completion',
    {
      x: 1.5, y: 1.5, w: 10, h: 4.5,
      fontSize: FONT.body + 1, color: COLOURS.dark, lineSpacingMultiple: 1.8,
    }
  );

  addDraftWatermark(nextSteps);

  const data = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return data;
}