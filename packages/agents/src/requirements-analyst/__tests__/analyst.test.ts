import { describe, it, expect } from "vitest";
import { ExtractionSchema, buildConfidenceMap } from "../schema";

describe("ExtractionSchema", () => {
  it("validates a complete extraction result", () => {
    const mockResult = {
      sector: "EDUCATION",
      sectorConfidence: 0.95,
      companyName: "Infosys Foundation",
      companyNameConf: 0.95,
      geography: { state: "Maharashtra", stateConf: 0.9, districts: ["Wardha"], districtsConf: 0.8 },
      budget: { minInr: 3500000, maxInr: 5000000, conf: 0.95 },
      durationMonths: { value: 18, conf: 0.95 },
      primaryKpis: [{ metric: "students enrolled", target: 1000, unit: "students", conf: 0.9 }],
      reportingCadence: { value: "QUARTERLY", conf: 0.9 },
      constraints: [{ type: "FCRA_REQUIRED", value: true, conf: 1.0 }],
      requiresHumanReview: false,
      lowConfidenceFields: [],
    };

    const result = ExtractionSchema.safeParse(mockResult);
    expect(result.success).toBe(true);
  });

  it("rejects invalid sector values", () => {
    const bad = {
      sector: "INVALID_SECTOR",
      sectorConfidence: 0.9,
      geography: { state: null, stateConf: 0, districts: [], districtsConf: 0 },
      budget: { minInr: null, maxInr: null, conf: 0 },
      durationMonths: { value: null, conf: 0 },
      primaryKpis: [],
      reportingCadence: { value: null, conf: 0 },
      constraints: [],
      requiresHumanReview: true,
      lowConfidenceFields: ["sector"],
    };
    expect(ExtractionSchema.safeParse(bad).success).toBe(false);
  });

  it("buildConfidenceMap returns all expected keys", () => {
    const result = ExtractionSchema.parse({
      sector: "EDUCATION",
      sectorConfidence: 0.9,
      companyName: "TCS Ltd",
      companyNameConf: 0.9,
      geography: { state: "Maharashtra", stateConf: 0.9, districts: [], districtsConf: 0.5 },
      budget: { minInr: 100000, maxInr: 500000, conf: 0.8 },
      durationMonths: { value: 12, conf: 0.85 },
      primaryKpis: [{ metric: "students", target: 100, unit: "persons", conf: 0.7 }],
      reportingCadence: { value: "QUARTERLY", conf: 0.9 },
      constraints: [],
      requiresHumanReview: false,
      lowConfidenceFields: [],
    });

    const map = buildConfidenceMap(result);
    expect(Object.keys(map)).toEqual(
      expect.arrayContaining(["sector", "state", "budget", "durationMonths", "reportingCadence", "primaryKpis"])
    );
    expect(map.sector).toBe(0.9);
  });
});