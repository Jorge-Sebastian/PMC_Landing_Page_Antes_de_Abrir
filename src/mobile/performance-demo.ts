/**
 * Educational, deterministic example dataset. These values are INVENTED.
 * They never come from a phone, UptimeRobot, PageSpeed or Firebase, and must
 * never be uploaded to Firebase or counted as evidence of seven days' uptime.
 */
export type DemoMetricKind = 'app_ready' | 'manual_analysis' | 'notification_analysis' |
  'family_create' | 'family_join' | 'family_manual' | 'family_upload';

export type SimulatedDay = {
  date: string;
  label: string;
  averagesMs: Record<DemoMetricKind, number>;
  analyses: number;
  familyAlerts: number;
  errors: number;
};

const SAMPLE_DATES = [
  ['2026-10-30', '30 oct.'], ['2026-10-31', '31 oct.'],
  ['2026-11-01', '1 nov.'], ['2026-11-02', '2 nov.'],
  ['2026-11-03', '3 nov.'], ['2026-11-04', '4 nov.'],
  ['2026-11-05', '5 nov.'],
] as const;

const SAMPLE_MS: Record<DemoMetricKind, readonly number[]> = {
  app_ready: [1480, 1390, 1510, 1350, 1420, 1280, 1370],
  manual_analysis: [1710, 1650, 1560, 1490, 1510, 1420, 1460],
  notification_analysis: [1820, 1770, 1690, 1640, 1710, 1580, 1610],
  family_create: [940, 890, 920, 860, 830, 810, 800],
  family_join: [810, 760, 730, 710, 690, 650, 640],
  family_manual: [1780, 1710, 1620, 1580, 1500, 1430, 1410],
  family_upload: [1080, 1040, 980, 970, 890, 910, 830],
};

/** Fixed fixture for a demonstrative seven-day period, NOT observations. */
export const SIMULATED_7_DAYS: readonly SimulatedDay[] = SAMPLE_DATES.map(([date, label], i) => ({
  date,
  label,
  averagesMs: {
    app_ready: SAMPLE_MS.app_ready[i],
    manual_analysis: SAMPLE_MS.manual_analysis[i],
    notification_analysis: SAMPLE_MS.notification_analysis[i],
    family_create: SAMPLE_MS.family_create[i],
    family_join: SAMPLE_MS.family_join[i],
    family_manual: SAMPLE_MS.family_manual[i],
    family_upload: SAMPLE_MS.family_upload[i],
  },
  analyses: [12, 14, 17, 15, 19, 22, 24][i],
  familyAlerts: [2, 3, 4, 3, 5, 6, 6][i],
  errors: [1, 0, 1, 0, 0, 0, 1][i],
}));

export const SIMULATION_NOTICE =
  'SIMULADO — Ejemplo educativo. Ninguna cifra es una medición real de SmartGuard, Firebase, PageSpeed o UptimeRobot.';

export function simulatedMean(kind: DemoMetricKind): number {
  return Math.round(SIMULATED_7_DAYS.reduce((sum, day) => sum + day.averagesMs[kind], 0) / SIMULATED_7_DAYS.length);
}

export function copySimulatedReport(): string {
  const lines = [
    SIMULATION_NOTICE,
    'Semana ilustrativa: 30 de octubre al 5 de noviembre de 2026 (7 días; valores inventados).',
    'Fecha | Inicio ms | Análisis manual ms | Notificaciones ms | Crear familia ms | Unirse ms | Análisis familiar ms | Sincronización ms | Análisis simulados | Alertas simuladas | Errores simulados',
  ];
  for (const day of SIMULATED_7_DAYS) {
    const m = day.averagesMs;
    lines.push([
      day.date, m.app_ready, m.manual_analysis, m.notification_analysis,
      m.family_create, m.family_join, m.family_manual, m.family_upload,
      day.analyses, day.familyAlerts, day.errors,
    ].join(' | '));
  }
  lines.push('No válido como evidencia de disponibilidad durante siete días ni como resultados experimentales reales.');
  return lines.join('\n');
}
