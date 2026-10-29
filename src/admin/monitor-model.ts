/** Pure client-side presentation helpers. Backend RLS, not these functions, protects device data. */
export type DeviceState = 'online' | 'idle' | 'offline' | 'unknown';
export type MonitorDevice = {
  id: string;
  name: string;
  version: string;
  seen: string | number | null;
  total: number;
  green: number | null;
  orange: number | null;
  red: number | null;
  local?: boolean;
  protectionEnabled?: boolean;
};
export const activityState = (lastSeen: string | number | null, now = Date.now()): DeviceState => {
  if (lastSeen == null) return 'unknown';
  const timestamp = typeof lastSeen === 'number' ? lastSeen : Date.parse(lastSeen);
  if (!Number.isFinite(timestamp) || timestamp > now + 60_000) return 'unknown';
  const age = Math.max(0, now - timestamp);
  if (age <= 15 * 60_000) return 'online';
  if (age <= 24 * 60 * 60_000) return 'idle';
  return 'offline';
};
export const monitorTotals = (devices: MonitorDevice[], now = Date.now()) => ({
  devices: devices.length,
  active: devices.filter(d => d.local ? d.protectionEnabled : activityState(d.seen, now) === 'online').length,
  analyses: devices.reduce((n, d) => n + Math.max(0, d.total), 0),
  green: devices.reduce((n, d) => n + (d.green ?? 0), 0),
  orange: devices.reduce((n, d) => n + (d.orange ?? 0), 0),
  red: devices.reduce((n, d) => n + (d.red ?? 0), 0),
});
export const demoDevices = (now = Date.now()): MonitorDevice[] => [
  ['demo-01', 'ANDROID · CASA', '0.5.7', 2, 86, 58, 17, 11],
  ['demo-02', 'ANDROID · MAMÁ', '0.5.7', 4, 42, 32, 7, 3],
  ['demo-03', 'ANDROID · PAPÁ', '0.5.6', 7, 75, 51, 15, 9],
  ['demo-04', 'ANDROID · ABUELO', '0.5.6', 12, 21, 14, 4, 3],
  ['demo-05', 'ANDROID · TÍA', '0.5.5', 78, 18, 11, 6, 1],
  ['demo-06', 'ANDROID · PRUEBA', '0.5.5', 3500, 31, 22, 6, 3],
].map(([id, name, version, ageMinutes, total, green, orange, red]) => ({
  id: String(id), name: String(name), version: String(version),
  seen: new Date(now - Number(ageMinutes) * 60_000).toISOString(), total: Number(total),
  green: Number(green), orange: Number(orange), red: Number(red),
}));
