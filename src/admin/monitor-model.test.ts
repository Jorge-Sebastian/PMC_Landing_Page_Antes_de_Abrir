import { describe, expect, it } from 'vitest';
import { activityState, demoDevices, monitorTotals } from './monitor-model';

describe('SmartGuard device monitor truthfulness', () => {
  const now = Date.parse('2026-10-29T15:00:00Z');
  it('distinguishes recent activity from always-online guarantees', () => {
    expect(activityState(new Date(now - 1000).toISOString(), now)).toBe('online');
    expect(activityState(new Date(now - 16 * 60_000).toISOString(), now)).toBe('idle');
    expect(activityState(new Date(now - 25 * 60 * 60_000).toISOString(), now)).toBe('offline');
    expect(activityState(null, now)).toBe('unknown');
    expect(activityState('nonsense', now)).toBe('unknown');
  });
  it('computes the correct aggregate without inventing unknown color counts', () => {
    const sample = demoDevices(now);
    const summary = monitorTotals(sample, now);
    expect(summary.devices).toBe(6);
    expect(summary.active).toBe(4);
    expect(summary.analyses).toBe(273);
    expect(summary.green + summary.orange + summary.red).toBe(273);
    expect(monitorTotals([{...sample[0],green:null,orange:null,red:null}]).analyses).toBe(86);
  });
  it('labels simulated devices with non-production identifiers', () => {
    expect(demoDevices(now).every(d => d.id.startsWith('demo-'))).toBe(true);
  });
});
