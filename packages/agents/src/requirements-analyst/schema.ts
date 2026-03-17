import { z } from "zod";

export const ExtractionSchema = z.object({
  sector: z.enum([
    "EDUCATION", "HEALTHCARE", "LIVELIHOOD",
    "ENVIRONMENT", "WATER_SANITATION", "OTHER",
  ]).describe("Primary sector focus of the CSR requirement"),

  sectorConfidence: z.number().min(0).max(1)
    .describe("Confidence 0.0-1.0 that the sector was correctly identified"),

  geography: z.object({
    state: z.string().nullable().describe("Indian state name, or null if not specified"),
    stateConf: z.number().min(0).max(1),
    districts: z.array(z.string()).describe("Specific districts, empty array if not mentioned"),
    districtsConf: z.number().min(0).max(1),
  }),

  budget: z.object({
    minInr: z.number().nullable().describe("Minimum budget in Indian Rupees, or null"),
    maxInr: z.number().nullable().describe("Maximum budget in Indian Rupees, or null"),
    conf: z.number().min(0).max(1),
  }),

  durationMonths: z.object({
    value: z.number().nullable().describe("Project duration in months, or null"),
    conf: z.number().min(0).max(1),
  }),

  primaryKpis: z.array(z.object({
    metric: z.string().describe("KPI description e.g. students enrolled"),
    target: z.number().nullable().describe("Numeric target if stated, or null"),
    unit: z.string().nullable().describe("Unit of measurement"),
    conf: z.number().min(0).max(1),
  })).describe("Key performance indicators mentioned in the document"),

  reportingCadence: z.object({
    value: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUALLY", "MILESTONE_BASED"]).nullable(),
    conf: z.number().min(0).max(1),
  }),

  constraints: z.array(z.object({
    type: z.string().describe("e.g. FCRA_REQUIRED, CSR_SCHEDULE_VII, MIN_BENEFICIARIES"),
    value: z.unknown(),
    conf: z.number().min(0).max(1),
  })).describe("Any specific requirements or constraints mentioned"),

  requiresHumanReview: z.boolean()
    .describe("True if ANY field confidence is below 0.75 — triggers DRM review"),

  lowConfidenceFields: z.array(z.string())
    .describe("Names of fields where confidence < 0.75"),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export function buildConfidenceMap(result: ExtractionResult): Record<string, number> {
  return {
    sector: result.sectorConfidence,
    state: result.geography.stateConf,
    districts: result.geography.districtsConf,
    budget: result.budget.conf,
    durationMonths: result.durationMonths.conf,
    reportingCadence: result.reportingCadence.conf,
    primaryKpis: result.primaryKpis.length > 0
      ? result.primaryKpis.reduce((sum, k) => sum + k.conf, 0) / result.primaryKpis.length
      : 0,
  };
}