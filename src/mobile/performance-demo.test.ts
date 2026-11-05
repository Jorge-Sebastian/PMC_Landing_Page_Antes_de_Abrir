import { describe, it, expect } from 'vitest';
import { SIMULATED_7_DAYS, SIMULATION_NOTICE, copySimulatedReport, simulatedMean } from './performance-demo';

describe('Android demo metrics are not real evidence', () => {
  it('contains exactly seven distinct fixed demonstration days with positive times', () => {
    expect(SIMULATED_7_DAYS).toHaveLength(7);
    expect(new Set(SIMULATED_7_DAYS.map(day => day.date)).size).toBe(7);
    for (const day of SIMULATED_7_DAYS) {
      expect(Object.values(day.averagesMs)).toHaveLength(7);
      expect(Object.values(day.averagesMs).every(v => v > 0)).toBe(true);
    }
  });
  it('is clearly and repeatedly labelled simulated in copied evidence', () => {
    const report = copySimulatedReport();
    expect(report.startsWith(SIMULATION_NOTICE)).toBe(true);
    expect(report).toContain('valores inventados');
    expect(report).toContain('No válido como evidencia');
    expect(report.split('\n').filter(x => /^2026-/.test(x))).toHaveLength(7);
  });
  it('computes the demonstration mean only from the fixture', () => {
    expect(simulatedMean('app_ready')).toBe(1400);
  });
});
