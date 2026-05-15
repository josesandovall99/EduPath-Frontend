import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, TrendingUp } from 'lucide-react';
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

/** Cuadro informativo: tono ámbar (decisión), verde (cierre), o azul tipo intro CPM. */
function feedbackPanelStyle(step: number, needsDecision: boolean): { bg: string; bd: string; tx: string } {
  if (needsDecision) return { bg: '#fffbeb', bd: '#fde68a', tx: '#92400e' };
  if (step >= 6) return { bg: '#f0fdf4', bd: '#bbf7d0', tx: '#14532d' };
  /** Misma familia visual que el recuadro introductorio del CPM (azul muy suave + borde claro). */
  return { bg: '#f0f7ff', bd: '#d1e9ff', tx: '#1e3a8a' };
}

/** Markdown del texto del tutor: título en negrita + cuerpo (lista o párrafo como en CPMSimulationViewer). */
function buildFeedbackMarkdown(step: number, feedbackLines: string[]): string {
  const title = '**Simulación de la Curva S — Valor ganado (EVM)**';

  if (step === 0 && feedbackLines.length <= 1) {
    const main = feedbackLines[0] || '';
    return `${title}\n\n${main}\n\nObserva la **tabla de valores** debajo y el **gráfico** a la derecha. Presiona **Siguiente mes** para avanzar.`;
  }

  const bullets = feedbackLines.map((line) => `- ${line}`).join('\n');
  return `${title}\n\n${bullets}`;
}

const evmTutorMarkdownComponents: Partial<Components> = {
  p: ({ children }) => (
    <p className="mb-2.5 text-[13px] leading-relaxed last:mb-0 [&:has(>strong:only-child)]:mb-2 [&:has(>strong:only-child)]:text-[15px] [&:has(>strong:only-child)]:font-extrabold [&:has(>strong:only-child)]:leading-snug [&:has(>strong:only-child)]:text-inherit">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-0 mt-3 flex list-none flex-col gap-2.5 text-[13px] leading-relaxed">{children}</ul>
  ),
  ol: ({ children }) => <ol className="mb-0 mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-[1.125rem] leading-relaxed before:absolute before:left-0 before:top-[0.58em] before:h-1 before:w-1 before:rounded-full before:bg-current before:opacity-50 [&_p]:mb-0 [&_p]:inline">
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
};

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

  const feedbackMarkdown = useMemo(() => buildFeedbackMarkdown(step, feedbackLines), [step, feedbackLines]);

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

  const panelStyle = useMemo(() => feedbackPanelStyle(step, needsDecision), [step, needsDecision]);

  const restart = useCallback(() => {
    setStep(0);
    setDecision(null);
  }, []);

  return (
    <div className="mb-6">
      <div
        className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f8fafc] font-sans shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
      >
        <header
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-white"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, #142d61)`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner">
              <TrendingUp className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-white/70">Simulación interactiva</p>
              <h2 className="m-0 truncate text-base font-extrabold">{title}</h2>
              <p className="m-0 text-[11px] text-white/80">Curva S y EVM (CACATUMBO)</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">{MONTH_LABELS[step]}</span>
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] text-white/85">
              {step + 1} / {N + 1}
            </span>
          </div>
        </header>

        {descripcionHtml ? (
          <div
            className="html-content max-h-44 overflow-y-auto border-b border-slate-200 bg-white px-5 py-3 text-sm text-slate-700"
            dangerouslySetInnerHTML={{ __html: descripcionHtml }}
          />
        ) : null}

        {/* Cuerpo: panel lateral fijo (~210px) + área principal, como CPMSimulationViewer */}
        <div className="flex min-h-[280px] flex-1 overflow-hidden">
          <aside className="w-[210px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-3.5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Meses · simulación</p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1a56db]">
                  <th className="px-2 py-1.5 text-left text-[11px] font-bold text-white">Mes</th>
                  <th className="px-2 py-1.5 text-center text-[11px] font-bold text-white">Estado</th>
                </tr>
              </thead>
              <tbody>
                {MONTH_LABELS.map((m, i) => {
                  const done = i < step;
                  const cur = i === step;
                  return (
                    <tr
                      key={m}
                      className={`border-b border-slate-100 ${cur ? 'bg-amber-50' : done ? 'bg-slate-50/90' : 'bg-white'}`}
                    >
                      <td className={`px-2 py-1.5 font-bold ${cur ? 'text-amber-900' : 'text-slate-800'}`}>{m}</td>
                      <td className="px-2 py-1.5 text-center">
                        {done ? (
                          <CheckCircle2 className="inline h-4 w-4 text-emerald-600" aria-label="Pasado" />
                        ) : cur ? (
                          <span className="text-[11px] font-semibold text-amber-700">► Ahora</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] leading-snug text-slate-500">
              BAC referencia ≈{' '}
              <span className="font-semibold text-slate-700">{BAC.toLocaleString('es-CO')}</span> miles COP.
            </p>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden bg-[#f1f5f9]">
            <p className="px-3 pt-3 text-center text-[11px] font-medium text-slate-600">
              Curva acumulada (miles COP) · 0 = inicio del proyecto
            </p>
            <div className="w-full px-2 pb-3" style={{ height: CHART_H, minHeight: CHART_H }}>
              {chartMount ? (
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <ComposedChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 16 }} syncId="evm-curva-s">
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
                    <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '12px', paddingBottom: 4 }} />
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
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-100/80 text-sm text-slate-500">
                  Cargando gráfico…
                </div>
              )}
            </div>
          </div>
        </div>

        {needsDecision ? (
          <div className="border-t border-amber-200 bg-amber-50/90 px-4 py-5 lg:px-8">
            <p className="mb-3 text-sm font-semibold text-amber-950">Decisión en mes 3</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pickDecision('crash')}
                className="rounded-xl border-2 border-emerald-600 bg-white p-4 text-left shadow-sm transition-all hover:bg-emerald-50/80 hover:shadow-md"
              >
                <div className="text-sm font-bold text-emerald-900">Opción A — Inyectar recursos (crashing)</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                  Refuerzo de equipo u horas: AC sube más en el mes 4, pero EV se recupera para acercarse a la meta al cierre.
                </p>
              </button>
              <button
                type="button"
                onClick={() => pickDecision('none')}
                className="rounded-xl border-2 border-slate-400 bg-white p-4 text-left shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
              >
                <div className="text-sm font-bold text-slate-900">Opción B — No hacer nada</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                  Sin acción correctiva: el proyecto tiende a cerrar con sobrecosto y retraso frente al plan.
                </p>
              </button>
            </div>
          </div>
        ) : null}

        {/* Pie: mensaje tipo CPM + tabla dinámica + controles centrados */}
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-slate-200 bg-white px-4 py-3 lg:px-[18px]">
          <div
            className="rounded-xl border px-5 py-5 transition-colors"
            style={{
              background: panelStyle.bg,
              borderColor: panelStyle.bd,
              color: panelStyle.tx,
              borderWidth: 1,
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              boxShadow: '0 1px 3px rgba(30, 58, 138, 0.06)',
            }}
          >
            <div className="evm-tutor-markdown [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={evmTutorMarkdownComponents}>
                {feedbackMarkdown}
              </ReactMarkdown>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200/90 bg-white/[0.85] p-3 shadow-sm">
              <p
                className="mb-2.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ color: panelStyle.tx, opacity: 0.85 }}
              >
                Valores al cierre de {MONTH_LABELS[step]}
              </p>
              <table className="w-full border-collapse text-[12px]" style={{ border: '1px solid rgba(15, 23, 42, 0.14)' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.07)' }}>
                    <th
                      className="px-2.5 py-2 text-left text-[11px] font-bold"
                      style={{ borderBottom: '1px solid rgba(15,23,42,0.14)' }}
                    >
                      Indicador
                    </th>
                    <th
                      className="px-2.5 py-2 text-right text-[11px] font-bold"
                      style={{ borderBottom: '1px solid rgba(15,23,42,0.14)' }}
                    >
                      Valor
                    </th>
                  </tr>
                </thead>
              <tbody className="tabular-nums">
                <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                  <td className="px-2.5 py-2 opacity-90">PV · planificado</td>
                  <td className="px-2.5 py-2 text-right font-semibold">{curPv.toLocaleString('es-CO')} <span className="font-normal opacity-75">mil COP</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                  <td className="px-2.5 py-2 opacity-90">AC · costo real</td>
                  <td className="px-2.5 py-2 text-right font-semibold text-red-700">{step > 0 ? `${curAc.toLocaleString('es-CO')} mil COP` : '—'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                  <td className="px-2.5 py-2 opacity-90">EV · valor ganado</td>
                  <td className="px-2.5 py-2 text-right font-semibold text-amber-800">{step > 0 ? `${curEv.toLocaleString('es-CO')} mil COP` : '—'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
                  <td className="px-2.5 py-2 opacity-90">CPI = EV ÷ AC</td>
                  <td className="px-2.5 py-2 text-right font-bold">{step > 0 ? cpi.toFixed(3) : '—'}</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-2 opacity-90">SPI = EV ÷ PV</td>
                  <td className="px-2.5 py-2 text-right font-bold">{step > 0 ? spi.toFixed(3) : '—'}</td>
                </tr>
              </tbody>
            </table>
            <p className="mb-0 mt-2 text-[10px] text-slate-600">
              PV, AC y EV en miles COP. CPI y SPI son índices adimensionales.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={restart}
              title="Reiniciar simulación"
              className="rounded-2xl border border-solid border-slate-200 bg-slate-100 px-4 py-2 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-200"
            >
              ↺ Reiniciar
            </button>
            <button
              type="button"
              onClick={goPrev}
              disabled={step <= 0}
              className={`rounded-2xl border px-4 py-2 text-[13px] font-bold transition-colors ${
                step <= 0
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-[#bfd3f5] bg-[#dbeafe] text-[#1a56db]'
              }`}
            >
              ← Mes anterior
            </button>
          </div>
          <p className="order-last mb-0 w-full min-w-0 shrink-0 basis-full text-center text-[11px] text-slate-600 sm:order-none sm:w-auto sm:basis-auto sm:flex-1 sm:px-2">
            Mes en simulación:{' '}
            <span className="font-semibold text-slate-900">{MONTH_LABELS[step]}</span>
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={step >= 6 || needsDecision}
            className="rounded-2xl border-none px-5 py-2 text-[13px] font-bold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            style={
              step >= 6 || needsDecision
                ? {}
                : { background: `linear-gradient(135deg, ${accentColor}, #142d61)`, boxShadow: '0 2px 8px rgba(26,86,219,0.35)' }
            }
          >
            Siguiente mes →
          </button>
        </div>

        {finished ? (
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onComplete?.()}
              className="rounded-2xl px-6 py-2.5 text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: '#16a34a' }}
            >
              Marcar contenido como visto
            </button>
            <p className="self-center text-xs text-slate-600">Has recorrido los 6 meses. Marca visto para registrar tu progreso.</p>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
