import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MONTH_LABELS = ['Mes 0', 'Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6'];
const N = 6;
/** Miles de COP — escala pedagógica (caso CACATUMBO). */
const BAC = 12_000;

function sAccum(i: number): number {
  const t = i / N;
  return (1 - Math.cos(Math.PI * t)) / 2;
}

function buildPv(): number[] {
  return Array.from({ length: N + 1 }, (_, i) => Math.round(BAC * sAccum(i)));
}

type Decision = 'crash' | 'none' | null;

function buildEvAc(decision: Decision): { ev: number[]; ac: number[] } {
  const pv = buildPv();
  const ev = [...pv];
  const ac = [...pv];

  ev[0] = 0;
  ac[0] = 0;
  ev[1] = Math.round(pv[1] * 0.97);
  ac[1] = Math.round(ev[1] * 1.03);
  ev[2] = Math.round(pv[2] * 0.93);
  ac[2] = Math.round(ev[2] * 1.06);
  /* Crisis mes 3: error en módulo de pagos */
  ev[3] = Math.round(pv[3] * 0.72);
  ac[3] = Math.round(pv[3] * 1.38);

  const restCrash = () => {
    ev[4] = Math.round(pv[4] * 0.94);
    ac[4] = Math.round(ev[4] * 1.14);
    ev[5] = Math.round(pv[5] * 0.99);
    ac[5] = Math.round(ev[5] * 1.09);
    ev[6] = pv[6];
    ac[6] = Math.round(ev[6] * 1.06);
  };

  const restNone = () => {
    ev[4] = Math.round(pv[4] * 0.66);
    ac[4] = Math.round(pv[4] * 1.42);
    ev[5] = Math.round(pv[5] * 0.7);
    ac[5] = Math.round(pv[5] * 1.48);
    ev[6] = Math.round(pv[6] * 0.74);
    ac[6] = Math.round(pv[6] * 1.52);
  };

  if (decision === 'crash') {
    restCrash();
  } else if (decision === 'none') {
    restNone();
  } else {
    restNone();
  }

  return { ev, ac };
}

function formatAxisMil(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function tutorFeedback(step: number, decision: Decision, cpi: number, spi: number): string[] {
  const lines: string[] = [];

  if (step === 0) {
    lines.push(
      'Aquí ves tu presupuesto planificado (BAC). Es una curva en «S» porque al inicio y al final el gasto es lento, y se acelera en la fase de desarrollo (meses 3 y 4).'
    );
    return lines;
  }

  if (step >= 1 && step < 3) {
    lines.push(
      'Mes a mes aparecen el costo real (AC) y el valor ganado (EV). Observa si EV se mantiene cerca de la línea base (PV): ahí el proyecto rinde lo planeado.'
    );
  }

  if (step === 3 && !decision) {
    lines.push(
      '⚠️ Hubo un error crítico en el módulo de pagos (CACATUMBO): el costo real (AC) se dispara y el avance (EV) queda por debajo de lo planeado. El área sombreada muestra la brecha de cronograma (PV vs EV).'
    );
    lines.push('Debes elegir una estrategia de recuperación antes de continuar.');
    return lines;
  }

  if (step === 3 && decision) {
    lines.push(
      decision === 'crash'
        ? 'Elegiste inyectar recursos (crashing): aceptas más costo en el corto plazo para recuperar el avance físico del trabajo.'
        : 'Elegiste no intervenir: el sobrecosto y el retraso tenderán a acumularse hasta el cierre.'
    );
  }

  if (step >= 1) {
    const cpiPct = (cpi * 100).toFixed(1);
    const spiPct = (spi * 100).toFixed(1);
    lines.push(
      `Tu CPI es ${cpi.toFixed(3)}: por cada peso invertido produces ${cpiPct} centavos de valor ganado (EV/AC).${
        cpi < 1 ? ' ¡Estás por encima del costo planificado para el valor obtenido!' : ''
      }`
    );
    lines.push(
      `Tu SPI es ${spi.toFixed(3)} (${spiPct}% del ritmo planificado en EV/PV): ${
        spi < 1 ? `vas un ${(100 - Number(spiPct)).toFixed(0)}% más lento que lo planeado en términos de valor ganado.` : 'vas en línea o por encima del plan.'
      }`
    );
  }

  if (step >= 6) {
    lines.push(decision === 'crash' ? 'Simulación completada con intervención activa.' : 'Simulación completada sin recuperación: revisa el cierre con sobrecosto y retraso.');
  }

  return lines;
}

export interface EvmCurvaSContentProps {
  title: string;
  descripcionHtml?: string;
  accentColor?: string;
  onComplete?: () => void;
}

export function EvmCurvaSContent({
  title,
  descripcionHtml,
  accentColor = '#4A90E2',
  onComplete,
}: EvmCurvaSContentProps) {
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  /** Evita que ResponsiveContainer mida alto 0 en el primer paint (grid / flex anidado). */
  const [chartMount, setChartMount] = useState(false);

  const CHART_H = 420;

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartMount(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pv = useMemo(() => buildPv(), []);
  const { ev, ac } = useMemo(() => buildEvAc(decision), [decision]);

  const chartData = useMemo(() => {
    return MONTH_LABELS.map((mes, i) => {
      const showExec = step > 0 && i <= step;
      const evVal = showExec ? ev[i] : null;
      const acVal = showExec ? ac[i] : null;
      const pvVal = pv[i];
      return {
        mes,
        idx: i,
        pv: pvVal,
        ev: evVal,
        ac: acVal,
      };
    });
  }, [step, ev, ac, pv]);

  const lastIdx = step;
  const curPv = pv[lastIdx] || 0;
  const curEv = step > 0 ? ev[lastIdx] : 0;
  const curAc = step > 0 ? ac[lastIdx] : 0;
  const cpi = curAc > 0 ? curEv / curAc : 0;
  const spi = curPv > 0 ? curEv / curPv : 0;

  const feedbackLines = useMemo(() => tutorFeedback(step, decision, cpi, spi), [step, decision, cpi, spi]);

  const goNext = useCallback(() => {
    if (step >= 6) return;
    if (step === 3 && !decision) return;
    setStep((s) => Math.min(6, s + 1));
  }, [step, decision]);

  const goPrev = useCallback(() => {
    setStep((s) => {
      const next = Math.max(0, s - 1);
      if (next < 3) {
        setDecision(null);
      }
      return next;
    });
  }, []);

  const pickDecision = (d: 'crash' | 'none') => {
    setDecision(d);
  };

  const needsDecision = step === 3 && !decision;
  const finished = step >= 6;

  return (
    <div className="mb-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-6 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #1e293b)` }}
            >
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#3A4A5B] truncate">{title}</h2>
              <p className="text-xs text-slate-500">Simulador evolutivo · Curva S y EVM (CACATUMBO)</p>
            </div>
          </div>
        </div>

        {descripcionHtml ? (
          <div
            className="px-6 py-4 border-b border-slate-100 html-content text-sm text-slate-700 max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: descripcionHtml }}
          />
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 lg:p-6">
          <div className="xl:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panel de control</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-left text-xs uppercase text-slate-600">
                    <th className="px-3 py-2">Indicador</th>
                    <th className="px-3 py-2 text-right">Valor (miles COP)</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-600">PV · planificado</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">{curPv.toLocaleString('es-CO')}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-600">AC · costo real</td>
                    <td className="px-3 py-2 text-right font-medium text-red-700">{step > 0 ? curAc.toLocaleString('es-CO') : '—'}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-600">EV · valor ganado</td>
                    <td className="px-3 py-2 text-right font-medium text-amber-700">{step > 0 ? curEv.toLocaleString('es-CO') : '—'}</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-white">
                    <td className="px-3 py-2 text-slate-600">CPI = EV/AC</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{step > 0 ? cpi.toFixed(3) : '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-600">SPI = EV/PV</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{step > 0 ? spi.toFixed(3) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Eje del gráfico: tiempo (meses 0–6) vs valor acumulado. BAC referencia ≈ {BAC.toLocaleString('es-CO')} miles COP.
            </p>
          </div>

          <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4 min-w-0">
            <p className="mb-2 text-center text-[11px] font-medium text-slate-500">
              Curva acumulada (miles COP) · 0 = inicio del proyecto
            </p>
            <div className="w-full mx-auto" style={{ height: CHART_H, minHeight: CHART_H }}>
              {chartMount ? (
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 16, right: 16, left: 8, bottom: 16 }}
                    syncId="evm-curva-s"
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      type="category"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      padding={{ left: 8, right: 8 }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => formatAxisMil(Number(v))}
                      width={56}
                      axisLine={false}
                      domain={[0, Math.round(BAC * 1.15)]}
                    />
                    <Tooltip
                      formatter={(value: number | string) => {
                        if (value == null || value === '') return [];
                        return [`${Number(value).toLocaleString('es-CO')} mil COP`];
                      }}
                      labelFormatter={(l) => String(l)}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      wrapperStyle={{ fontSize: '12px', paddingBottom: 4 }}
                    />
                    {step >= 2 ? (
                      <ReferenceArea
                        x1="Mes 2"
                        x2="Mes 4"
                        yAxisId={0}
                        fill="#fecaca"
                        fillOpacity={0.18}
                        ifOverflow="visible"
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="pv"
                      name="PV (planificado)"
                      stroke="#64748b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#64748b', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive
                      animationDuration={450}
                    />
                    <Line
                      type="monotone"
                      dataKey="ev"
                      name="EV (ganado)"
                      stroke="#ca8a04"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ca8a04', strokeWidth: 0 }}
                      connectNulls={false}
                      isAnimationActive
                      animationDuration={450}
                    />
                    <Line
                      type="monotone"
                      dataKey="ac"
                      name="AC (real)"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }}
                      connectNulls={false}
                      isAnimationActive
                      animationDuration={450}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100/80 text-sm text-slate-500"
                  style={{ height: CHART_H }}
                >
                  Cargando gráfico…
                </div>
              )}
            </div>
          </div>
        </div>

        {needsDecision ? (
          <div className="border-t border-amber-200 bg-amber-50/90 px-4 py-5 lg:px-8">
            <p className="text-sm font-semibold text-amber-950 mb-3">Decisión en mes 3</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pickDecision('crash')}
                className="rounded-xl border-2 border-emerald-600 bg-white p-4 text-left shadow-sm transition-all hover:bg-emerald-50/80 hover:shadow-md"
              >
                <div className="text-sm font-bold text-emerald-900">Opción A — Inyectar recursos (crashing)</div>
                <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                  Refuerzo de equipo u horas: AC sube más en el mes 4, pero EV se recupera para acercarse a la meta al cierre.
                </p>
              </button>
              <button
                type="button"
                onClick={() => pickDecision('none')}
                className="rounded-xl border-2 border-slate-400 bg-white p-4 text-left shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              >
                <div className="text-sm font-bold text-slate-900">Opción B — No hacer nada</div>
                <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                  Sin acción correctiva: el proyecto tiende a cerrar con sobrecosto y retraso frente al plan.
                </p>
              </button>
            </div>
          </div>
        ) : null}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 lg:px-8 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Feedback del tutor</h3>
            <ul className="space-y-2 text-sm text-slate-800 leading-relaxed list-disc pl-5">
              {feedbackLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={step <= 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Mes anterior
            </button>
            <div className="text-xs font-medium text-slate-500">
              Mes actual en simulación: <span className="text-slate-900">{MONTH_LABELS[step]}</span>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={step >= 6 || needsDecision}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-opacity"
              style={{ backgroundColor: accentColor }}
            >
              Siguiente mes
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {finished ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onComplete?.()}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-md"
                style={{ backgroundColor: '#16a34a' }}
              >
                Marcar contenido como visto
              </button>
              <p className="text-xs text-slate-600 self-center">Has recorrido los 6 meses. Marca visto para registrar tu progreso.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
