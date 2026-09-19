"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireRole } from "@/lib/auth/useRequireRole";
import {
  ApiClientError,
  fetchMeters,
  fetchElectricalReadings,
  createElectricalReading,
} from "@/lib/api-client";
import type { MeterOption, ElectricalReadingDTO, ElectricalStats, ElectricalAlert } from "@/types/electrical";

function meterLabel(m: MeterOption): string {
  const unit = [m.unitName, m.unitNumber && `#${m.unitNumber}`].filter(Boolean).join(" ");
  return `${m.propertyTitle}${unit ? ` — ${unit}` : ""} (${m.electricityNumber})`;
}

function buildAreaPath(values: number[]): { line: string; area: string } {
  if (values.length === 0) return { line: "", area: "" };
  const w = 600;
  const h = 200;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area };
}

export default function ElectricalMonitoringPage() {
  const { ready } = useRequireRole(["admin", "real_estate_officer", "project_manager"], "/dashboard");

  const [meters, setMeters] = useState<MeterOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [metersStatus, setMetersStatus] = useState<"loading" | "error" | "ready">("loading");

  const [readings, setReadings] = useState<ElectricalReadingDTO[]>([]);
  const [stats, setStats] = useState<ElectricalStats | null>(null);
  const [alerts, setAlerts] = useState<ElectricalAlert[]>([]);
  const [dataStatus, setDataStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");

  const [form, setForm] = useState({ watts: "", kwh: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setMetersStatus("loading");
      try {
        const res = await fetchMeters();
        setMeters(res.data);
        if (res.data.length > 0) setSelected(res.data[0].electricityNumber);
        setMetersStatus("ready");
      } catch {
        setMetersStatus("error");
      }
    })();
  }, [ready]);

  const loadReadings = useCallback(async (electricityNumber: string) => {
    if (!electricityNumber) return;
    setDataStatus("loading");
    try {
      const res = await fetchElectricalReadings(electricityNumber, 50);
      setReadings(res.data);
      setStats(res.stats);
      setAlerts(res.alerts);
      setDataStatus("ready");
    } catch {
      setDataStatus("error");
    }
  }, []);

  useEffect(() => {
    if (selected) loadReadings(selected);
  }, [selected, loadReadings]);

  async function handleLogReading(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createElectricalReading({
        electricityNumber: selected,
        watts: form.watts,
        kwh: form.kwh,
      });
      setForm({ watts: "", kwh: "" });
      await loadReadings(selected);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Failed to log reading.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  const chart = buildAreaPath(readings.map((r) => r.watts));

  return (
    <div className="wv-theme min-h-[calc(100vh-64px)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="wv-label mb-1">WattVision</p>
        <h1 className="wv-title">Electrical Monitoring</h1>
        <p className="wv-label mt-2 max-w-xl">
          Manual meter readings per unit. Log a reading below after checking a meter — there&apos;s no
          automatic smart-meter integration yet.
        </p>

        {/* Meter picker */}
        <div className="mt-6">
          {metersStatus === "loading" && <p className="wv-label">Cargando medidores…</p>}
          {metersStatus === "error" && (
            <p className="text-sm text-wv-red">No se pudieron cargar los medidores.</p>
          )}
          {metersStatus === "ready" && meters.length === 0 && (
            <p className="wv-label">
              No hay medidores todavía. Agrega un número de electricidad a una unidad dentro de un
              edificio (Build) para que aparezca aquí.
            </p>
          )}
          {metersStatus === "ready" && meters.length > 0 && (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-md border border-wv-border bg-wv-surface px-3 py-2 text-sm text-wv-text sm:w-96"
            >
              {meters.map((m) => (
                <option key={m.electricityNumber} value={m.electricityNumber}>
                  {meterLabel(m)}
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && dataStatus !== "idle" && (
          <>
            {/* Row 1 — 3 KPI cards */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="wv-card">
                <p className="wv-kpi-label">Última lectura</p>
                <p className="wv-kpi-value mt-2">
                  {stats?.latestWatts != null ? `${stats.latestWatts} W` : "—"}
                </p>
                <span className="wv-live-dot mt-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-wv-green" />
                  {readings.length} lecturas
                </span>
              </div>
              <div className="wv-card">
                <p className="wv-kpi-label">Hoy</p>
                <p className="wv-kpi-value mt-2">{stats?.todayKwh ?? 0} kWh</p>
                <p className="wv-label mt-3">≈ Bs. {stats?.todayCostBs ?? 0}</p>
              </div>
              <div className="wv-card">
                <p className="wv-kpi-label">Este mes</p>
                <p className="wv-kpi-value mt-2">{stats?.monthKwh ?? 0} kWh</p>
                <p className="wv-label mt-3">≈ Bs. {stats?.monthCostBs ?? 0}</p>
              </div>
            </div>

            {/* Row 2 — chart (8 cols) + alerts (4 cols) */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="wv-card lg:col-span-8">
                <div className="flex items-center justify-between">
                  <p className="wv-kpi-label">Consumo (últimas {readings.length} lecturas)</p>
                </div>
                {readings.length > 0 ? (
                  <svg viewBox="0 0 600 200" className="mt-4 w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wvAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#30D158" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[40, 80, 120, 160].map((y) => (
                      <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#2C2C2E" strokeWidth="1" />
                    ))}
                    <path d={chart.area} fill="url(#wvAreaFill)" />
                    <path d={chart.line} fill="none" stroke="#00E5FF" strokeWidth="2" />
                  </svg>
                ) : (
                  <p className="wv-label mt-6">Aún no hay lecturas registradas para este medidor.</p>
                )}
              </div>

              <div className="lg:col-span-4">
                <p className="wv-kpi-label mb-3">Alertas</p>
                {alerts.length === 0 ? (
                  <p className="wv-label">Sin alertas por ahora.</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((a, i) => (
                      <div key={i} className="wv-alert">
                        <p className="font-semibold">{a.message}</p>
                        <p className="mt-1 text-wv-text-secondary">{a.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Log reading form */}
                <form onSubmit={handleLogReading} className="wv-card mt-4 space-y-3">
                  <p className="wv-kpi-label">Registrar lectura</p>
                  {formError && <p className="text-sm text-wv-red">{formError}</p>}
                  <div>
                    <label className="wv-label mb-1 block">Watts</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.watts}
                      onChange={(e) => setForm((f) => ({ ...f, watts: e.target.value }))}
                      className="w-full rounded-md border border-wv-border bg-wv-bg px-3 py-2 text-sm text-wv-text"
                    />
                  </div>
                  <div>
                    <label className="wv-label mb-1 block">kWh (desde la última lectura)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={form.kwh}
                      onChange={(e) => setForm((f) => ({ ...f, kwh: e.target.value }))}
                      className="w-full rounded-md border border-wv-border bg-wv-bg px-3 py-2 text-sm text-wv-text"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-wv-cyan px-4 py-2 text-sm font-semibold text-wv-bg transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Guardando…" : "Registrar"}
                  </button>
                </form>
              </div>
            </div>

            {/* Row 3 — table */}
            <div className="wv-card mt-6">
              <p className="wv-kpi-label mb-3">Lecturas recientes</p>
              {readings.length === 0 ? (
                <p className="wv-label">Sin datos.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="wv-table-row wv-label">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 font-medium">Watts</th>
                      <th className="pb-2 font-medium">kWh</th>
                      <th className="pb-2 font-medium">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...readings]
                      .reverse()
                      .slice(0, 10)
                      .map((r) => (
                        <tr key={r._id} className="wv-table-row">
                          <td className="py-2.5 text-wv-text">
                            {new Date(r.recordedAt).toLocaleString()}
                          </td>
                          <td className="py-2.5" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                            {r.watts} W
                          </td>
                          <td className="py-2.5" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                            {r.kwh} kWh
                          </td>
                          <td className="py-2.5" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                            Bs. {r.costBs}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
