import { describe, it, expect } from 'vitest';
import {
  scoreSector, scoreGeography, scoreBudget,
  scoreKpis, scoreTrackRecord, computeOverallScore
} from '../scorer';

describe('scoreSector', () => {
  it('returns 100 for exact sector match', () => {
    expect(scoreSector('EDUCATION', 'EDUCATION')).toBe(100);
  });

  it('returns 0 for sector mismatch', () => {
    expect(scoreSector('EDUCATION', 'HEALTHCARE')).toBe(0);
  });

  it('returns 50 when required sector is unknown', () => {
    expect(scoreSector(null, 'EDUCATION')).toBe(50);
  });
});

describe('scoreGeography', () => {
  const maharashtraGeo = { state: 'Maharashtra', stateConf: 0.9, districts: ['Wardha'], districtsConf: 0.9 };

  it('returns 100 for state + district match', () => {
    expect(scoreGeography(maharashtraGeo, { state: 'Maharashtra', district: 'Wardha' })).toBe(100);
  });

  it('returns 80 for state-only match', () => {
    expect(scoreGeography(maharashtraGeo, { state: 'Maharashtra', district: 'Pune' })).toBe(80);
  });

  it('returns 30 for state mismatch', () => {
    expect(scoreGeography(maharashtraGeo, { state: 'Karnataka', district: 'Bangalore' })).toBe(30);
  });

  it('returns 50 when required state is unknown', () => {
    const noState = { state: null, stateConf: 0, districts: [], districtsConf: 0 };
    expect(scoreGeography(noState, { state: 'Maharashtra' })).toBe(50);
  });
});

describe('scoreBudget', () => {
  const budget35to50L = { minInr: 3500000, maxInr: 5000000, conf: 0.9 };

  it('returns 100 when funding gap is within range', () => {
    expect(scoreBudget(budget35to50L, 4000000, 0)).toBe(100);
  });

  it('returns 10 for fully funded initiative', () => {
    expect(scoreBudget(budget35to50L, 4000000, 4000000)).toBe(10);
  });

  it('returns > 0 but < 100 for partial fit', () => {
    const score = scoreBudget(budget35to50L, 15000000, 0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it('returns 50 when budget is unknown', () => {
    expect(scoreBudget({ minInr: null, maxInr: null, conf: 0 }, 1000000, 0)).toBe(50);
  });
});

describe('scoreTrackRecord', () => {
  it('returns high score for well-evidenced initiative', () => {
    expect(scoreTrackRecord(3, 4, 10)).toBeGreaterThan(70);
  });

  it('returns 40 for initiative with no milestones yet', () => {
    expect(scoreTrackRecord(0, 0, 0)).toBe(40);
  });

  it('caps at 100', () => {
    expect(scoreTrackRecord(10, 10, 20)).toBeLessThanOrEqual(100);
  });
});

describe('computeOverallScore', () => {
  it('applies correct weights', () => {
    const result = computeOverallScore({
      sector: 100, geography: 100, budget: 100, kpi: 100, trackRecord: 100,
    });
    expect(result).toBe(100);
  });

  it('reflects sector weight dominance', () => {
    const withBadSector = computeOverallScore({
      sector: 0, geography: 100, budget: 100, kpi: 100, trackRecord: 100,
    });
    expect(withBadSector).toBeLessThan(75);
  });
});