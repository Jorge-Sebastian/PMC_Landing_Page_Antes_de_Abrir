import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, BellRing, CheckCircle2, Clock3, Cloud, Database,
  History, RefreshCcw, Settings2, Shield, ShieldCheck, Smartphone,
} from "lucide-react";
import {
  Protection, type DeviceMetric, type DevicePerformanceStatus,
  type ProtectionStatus,
} from "./native";

const METRIC_NAMES: Record<string, string> = {
  app_ready: "Inicio de la aplicación",
  manual_analysis: "Análisis manual",
  notification_analysis: "Análisis de notificaciones",
  family_create: "Creación de familia",
  family_join: "Ingreso a familia",
  family_manual: "Análisis familiar",
  family_upload: "Sincronización familiar",
};

function formatMs(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("es-CO") + " ms";
}

function MetricCard({ title, metric }: { title: string; metric: DeviceMetric }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-3 text-2xl font-black text-[#0d5660]">
        {metric.count > 0 ? formatMs(metric.averageMs) : "Sin muestras"}
      </p>
      <p className="mt-1 text-xs text-slate-500">Promedio medido</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>{metric.count} mediciones</span>
        <span>p95: {metric.count ? formatMs(metric.p95Ms) : "—"}</span>
        <span>{metric.errors} errores</span>
      </div>
    </div>
  );
}

/** Observation-only dashboard. Permissions are configured from Inicio. */
export function ProtectionInsights({ onOpenSettings, onOpenActivity }: {
  onOpenSettings: () => void;
  onOpenActivity: () => void;
}) {
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [performance, setPerformance] = useState<DevicePerformanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    const [native, metrics] = await Promise.allSettled([
      Protection.status(), Protection.performanceStatus(),
    ]);
    setStatus(native.status === "fulfilled" ? native.value : null);
    setPerformance(metrics.status === "fulfilled" ? metrics.value : null);
    setError(native.status === "rejected" && metrics.status === "rejected"
      ? "No se pudieron consultar las mediciones de este dispositivo." : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const active = Boolean(status?.enabled && status.access && status.notifications);
  const connectedApps = useMemo(() =>
    status ? Object.values(status.apps || {}).filter(Boolean).length : null, [status]);
  const metrics = performance?.metrics ?? {};
  const latest = useMemo(() => {
    if (!status?.lastAt) return null;
    const timestamp = status.lastAt < 1e11 ? status.lastAt * 1000 : status.lastAt;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString("es-CO");
  }, [status?.lastAt]);

  return (
    <div className="section-shell mx-auto max-w-4xl space-y-6 py-7">
      <section className="rounded-[2rem] bg-[#103640] p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200">ESTADO Y ESTADÍSTICAS</p>
        <div className="mt-4 flex items-center gap-3">
          {active ? <ShieldCheck className="size-10 text-teal-200" /> : <Shield className="size-10 text-teal-200" />}
          <div>
            <h1 className="text-3xl font-black">Protección</h1>
            <p className="mt-1 text-sm text-slate-200">
              {loading && !status ? "Consultando el dispositivo..." : active ? "Servicio automático activo" : "Servicio automático no activo"}
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200">
          Consulta lo que SmartGuard ha procesado, sus tiempos de respuesta y el estado técnico de este teléfono.
          La configuración de permisos vive en Inicio.
        </p>
      </section>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Indicadores del dispositivo">
        <div className="rounded-2xl border bg-white p-4">
          <Activity className="size-5 text-teal-800" />
          <p className="mt-3 text-3xl font-black">{status?.processed ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-600">Enlaces procesados</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <Smartphone className="size-5 text-teal-800" />
          <p className="mt-3 text-3xl font-black">{connectedApps ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-600">Apps seleccionadas</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <History className="size-5 text-teal-800" />
          <p className="mt-3 text-3xl font-black">{status?.history?.length ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-600">Registros locales disponibles</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-black">Salud del dispositivo</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="inline-flex items-center gap-2 text-sm"><BellRing className="size-4 text-slate-600" /> Alertas automáticas</span>
            <span className={"text-sm font-bold " + (active ? "text-teal-800" : "text-amber-800")}>
              {active ? "Activas" : "No activas"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="inline-flex items-center gap-2 text-sm"><Cloud className="size-4 text-slate-600" /> Envío de métricas</span>
            <span className="text-right text-xs font-bold text-slate-700">
              {performance?.sharing ? "Autorizado y activo" :
                performance?.firebaseReady ? "No activo" : "Solo medición local"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <span className="inline-flex items-center gap-2 text-sm"><Database className="size-4 text-slate-600" /> Comprobaciones externas</span>
            <span className="text-xs font-bold text-slate-700">
              {status?.externalReady ? "Configuradas" : "No configuradas"}
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {latest ? "Última actividad registrada: " + latest : "Aún no hay una hora de actividad registrada."}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Rendimiento real</h2>
            <p className="mt-1 text-sm text-slate-600">Tiempos medidos por la APK. No equivalen a disponibilidad del servidor.</p>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={loading}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">
            <RefreshCcw className="size-4" /> Actualizar
          </button>
        </div>
        {performance && Object.keys(metrics).length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(metrics).map(([id, metric]) => (
              <MetricCard key={id} title={METRIC_NAMES[id] ?? id} metric={metric} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border bg-white p-5 text-sm text-slate-600">
            {loading ? "Consultando las mediciones..." : "Todavía no hay métricas técnicas disponibles."}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={onOpenActivity}
          className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-left text-sm font-bold text-slate-800">
          <History className="size-5 text-teal-700" /> Ver historial de actividad
        </button>
        <button type="button" onClick={onOpenSettings}
          className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-left text-sm font-bold text-slate-800">
          <Settings2 className="size-5 text-teal-700" /> Configuración en Inicio
        </button>
      </section>
      <p className="text-xs leading-relaxed text-slate-500">
        Los registros son locales y dependen de los permisos, del dispositivo y de la activación del historial.
        No se infiere una tasa de acierto o de disponibilidad a partir de estos contadores.
      </p>
    </div>
  );
}
