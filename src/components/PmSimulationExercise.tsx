import React, { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { resolveExercise } from '../utils/resolveExercise';
import { submitExercise } from '../utils/submitExercise';

const QUADRANT_LABELS: Record<string, string> = {
  gestionar_cerca: 'Gestionar de cerca (alto poder / alto interés)',
  mantener_satisfecho: 'Mantener satisfecho (alto poder / bajo interés)',
  mantener_informado: 'Mantener informado (bajo poder / alto interés)',
  monitorear: 'Monitorear (bajo poder / bajo interés)',
};

const QUADRANT_KEYS = Object.keys(QUADRANT_LABELS);

/** Colores inline: evita texto blanco sin fondo si Tailwind no aplica gradientes en producción. */
const EDT_STYLE_FILLED: CSSProperties = {
  background: 'linear-gradient(180deg, #0ea5e9 0%, #1e3a8a 100%)',
  color: '#ffffff',
  borderColor: '#0c4a6e',
};
const EDT_STYLE_EMPTY: CSSProperties = {
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  borderColor: '#93c5fd',
};

function shuffleEdtPool<T>(items: T[], seedKey: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) seed = (seed * 31 + seedKey.charCodeAt(i)) >>> 0;
  if (!seed) seed = 2166136261;
  const out = [...items];
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PmSimulationExerciseProps {
  activity: { id: string; title: string };
  ejercicio: {
    id: number;
    configuracion?: { tipo?: string; variante?: string; spec?: Record<string, any> };
    actividad?: { descripcion?: string };
  };
  onBack: () => void;
  onComplete?: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

function buildInitialAnswer(variante: string, spec: Record<string, any>, existing?: any) {
  const ex = existing?.respuesta || {};
  if (variante === 'mapa_poder') {
    return { placements: { ...(ex.placements || {}) } };
  }
  if (variante === 'edt') {
    return { slotFill: { ...(ex.slotFill || {}) } };
  }
  return {};
}

export function PmSimulationExercise({
  activity,
  ejercicio,
  onBack,
  onComplete,
  embedded = false,
  configurableMode = false,
  configurableResponse,
  onConfigurableResponseChange,
  resolvePath,
  submitPath,
}: PmSimulationExerciseProps) {
  const cfg = ejercicio.configuracion || {};
  const variante = (cfg.variante || 'mapa_poder') as string;
  const varianteSoportada = variante === 'mapa_poder' || variante === 'edt';
  const spec = cfg.spec || {};

  const [answer, setAnswer] = useState(() => buildInitialAnswer(variante, spec, configurableResponse));
  const [dragId, setDragId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setAnswer(buildInitialAnswer(variante, spec, configurableResponse));
  }, [variante, JSON.stringify(spec), activity.id]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuesta: { ...answer } });
  }, [configurableMode, onConfigurableResponseChange, answer, variante]);

  const enunciadoHtml =
    (cfg as any).enunciado ||
    ejercicio.actividad?.descripcion ||
    'Completa la simulación según las instrucciones de tu docente.';

  const mapaStakeholders: Array<{ id: string; nombre: string; descripcion?: string }> = spec.stakeholders || [];

  const edtTareas: Array<{ id: string; titulo: string; parentCorrect: string | null; orden: number }> = useMemo(() => {
    const raw = spec.tareas;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r: any, idx: number) => {
        const id = r?.id != null && String(r.id) !== '' ? String(r.id) : '';
        const tituloRaw = r?.titulo ?? r?.nombre ?? r?.title ?? r?.label ?? r?.texto ?? r?.name ?? '';
        let titulo = String(tituloRaw).trim();
        if (!titulo && id) titulo = id;
        if (!titulo) titulo = 'Ítem sin nombre';
        const pc = r?.parentCorrect;
        const parentCorrect =
          pc === undefined || pc === null || String(pc).trim() === '' ? null : String(pc);
        const ordenRaw = r?.orden;
        const orden = Number.isFinite(Number(ordenRaw)) ? Number(ordenRaw) : idx;
        return { id, titulo, parentCorrect, orden };
      })
      .filter((t) => t.id !== '');
  }, [JSON.stringify(spec.tareas ?? null)]);

  const edtRaizTitulo = useMemo(() => {
    const r = spec.raiz as Record<string, unknown> | undefined;
    const s = String(r?.titulo ?? r?.nombre ?? r?.title ?? '').trim();
    if (s) return s;
    const rootRow = edtTareas.find((t) => t.parentCorrect == null);
    return rootRow?.titulo || 'Proyecto';
  }, [spec.raiz, edtTareas]);

  const edtAsignables = edtTareas.filter((t) => t.parentCorrect != null);
  const edtRootId = String(
    (spec.raiz as { id?: string } | undefined)?.id ?? edtTareas.find((t) => t.parentCorrect == null)?.id ?? ''
  );

  const edtByParent = useMemo(() => {
    const m = new Map<string, Array<{ id: string; titulo: string; parentCorrect: string | null; orden: number }>>();
    for (const t of edtTareas) {
      if (t.parentCorrect == null) continue;
      const p = String(t.parentCorrect);
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(t);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
    }
    return m;
  }, [edtTareas]);

  const edtLevel1 = edtByParent.get(edtRootId) || [];

  const edtSlotFill = ((answer as any).slotFill || {}) as Record<string, string>;

  const edtEntregablesList = useMemo(
    () => edtAsignables.filter((t) => String(t.parentCorrect) === edtRootId),
    [edtAsignables, edtRootId]
  );
  const edtPaquetesList = useMemo(
    () => edtAsignables.filter((t) => String(t.parentCorrect) !== edtRootId),
    [edtAsignables, edtRootId]
  );

  const edtPoolOrderEnt = useMemo(
    () => shuffleEdtPool(edtEntregablesList, `${activity.id}-ent`),
    [activity.id, edtEntregablesList]
  );
  const edtPoolOrderPaq = useMemo(
    () => shuffleEdtPool(edtPaquetesList, `${activity.id}-paq`),
    [activity.id, edtPaquetesList]
  );

  const edtPlacedChipIds = useMemo(
    () => new Set(Object.values(edtSlotFill).map(String)),
    [edtSlotFill]
  );
  const edtChipsPoolEnt = edtPoolOrderEnt.filter((t) => !edtPlacedChipIds.has(String(t.id)));
  const edtChipsPoolPaq = edtPoolOrderPaq.filter((t) => !edtPlacedChipIds.has(String(t.id)));

  const dropOnQuadrant = (q: string) => {
    if (!dragId) return;
    setAnswer((a: any) => ({
      ...a,
      placements: { ...a.placements, [dragId]: q },
    }));
    setDragId(null);
  };

  const handleSubmit = async () => {
    if (!varianteSoportada) {
      toast.error('Ejercicio desactualizado', {
        description: 'Esta simulación ya no está disponible. Pide a tu docente que use mapa de poder o EDT.',
      });
      return;
    }

    let body: any = { ...answer };
    if (variante === 'edt') {
      const sf = (answer as any).slotFill || {};
      const missing = edtAsignables.some((t) => sf[t.id] == null || String(sf[t.id]) === '');
      if (missing) {
        toast.error('Completa la EDT', { description: 'Coloca todas las cajas del listado en el diagrama antes de enviar.' });
        return;
      }
      body = { slotFill: sf };
    }

    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const res = await submitExercise(activity.id, body, estudianteId || undefined, submitPath);
    const data: any = res.data || {};

    if (res.status === 429) {
      toast.warning('Envío en proceso', { description: res.message || '' });
    } else if (res.status === 409) {
      setAprobado(true);
      onComplete?.();
      toast.info('Ejercicio aprobado', { description: res.message || '' });
    } else if (res.status === 400) {
      setFeedback(data?.retroalimentacion || '');
      setAprobado(false);
      toast.error('Revisa la actividad', { description: data?.retroalimentacion || '' });
    } else if (res.status === 200) {
      setFeedback(data?.retroalimentacion || '');
      setAprobado(true);
      onComplete?.();
      toast.success('Correcto', { description: data?.retroalimentacion || '' });
    } else {
      toast.error('Error del servidor', { description: res.message || '' });
    }
    setIsSubmitting(false);
  };

  const handlePreview = async () => {
    const body: any = { respuesta: { ...answer } };
    const result = await resolveExercise(activity.id, body, resolvePath);
    const data: any = result.data || {};
    if (result.status === 400 || result.status === 200) {
      setFeedback(data?.retroalimentacion || '');
      alert(`${result.status === 200 ? 'Vista previa: correcto' : 'Vista previa: incorrecto'}\n${data?.retroalimentacion || ''}`);
    } else {
      alert(result.message || 'No se pudo validar');
    }
  };

  const dropOnEdtSlot = (slotTaskId: string) => {
    if (!dragId) return;
    const chip = String(dragId);
    if (!edtAsignables.some((t) => String(t.id) === chip)) return;
    setAnswer((a: any) => {
      const sf = { ...(a.slotFill || {}) };
      for (const k of Object.keys(sf)) {
        if (String(sf[k]) === chip) delete sf[k];
      }
      sf[String(slotTaskId)] = chip;
      return { ...a, slotFill: sf };
    });
    setDragId(null);
  };

  const dropEdtPool = () => {
    if (!dragId) return;
    const chip = String(dragId);
    if (!edtAsignables.some((t) => String(t.id) === chip)) return;
    setAnswer((a: any) => {
      const sf = { ...(a.slotFill || {}) };
      for (const k of Object.keys(sf)) {
        if (String(sf[k]) === chip) delete sf[k];
      }
      return { ...a, slotFill: sf };
    });
    setDragId(null);
  };

  const edtTituloForChip = (chipId: string | undefined) => {
    if (!chipId) return null;
    return edtTareas.find((t) => String(t.id) === String(chipId))?.titulo ?? null;
  };

  const renderEdtSlotBox = (slotTaskId: string, tier: 'entregable' | 'paquete') => {
    const sid = String(slotTaskId);
    const chipPlaced = edtSlotFill[sid];
    const texto = edtTituloForChip(chipPlaced);
    const pad = tier === 'entregable' ? 'py-3 px-2 min-h-[4.5rem]' : 'py-2.5 px-2 min-h-[3.5rem]';
    const filled = Boolean(texto);
    const flexAlign =
      filled && tier === 'paquete' ? 'items-center justify-start' : 'items-center justify-center';
    const tipoTexto =
      filled && tier === 'paquete'
        ? 'font-medium normal-case text-[10px] sm:text-[11px] leading-snug text-left px-1'
        : filled
          ? 'uppercase font-semibold text-[9px] sm:text-[10px] text-center'
          : 'text-xs font-medium uppercase tracking-wide text-center';
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => dropOnEdtSlot(sid)}
        draggable={Boolean(chipPlaced)}
        onDragStart={() => {
          if (chipPlaced) setDragId(String(chipPlaced));
        }}
        style={filled ? EDT_STYLE_FILLED : EDT_STYLE_EMPTY}
        className={`w-full rounded-xl border-2 shadow-md transition-colors ${
          chipPlaced ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${pad} flex ${flexAlign} ${tipoTexto}`}
      >
        {texto ? (
          <span className={`select-none ${tier === 'paquete' ? 'w-full' : ''}`}>{texto}</span>
        ) : (
          <span>Soltar aquí</span>
        )}
      </div>
    );
  };

  return (
    <div>
      {!embedded && (
        <button type="button" onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      )}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <div className="mb-4">
          <h3 className="font-semibold text-[#3A4A5B]">{activity.title}</h3>
          <p className="text-xs text-slate-500 mt-1 capitalize">Simulación GP · {variante.replace(/_/g, ' ')}</p>
        </div>

        <div className="html-content text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: enunciadoHtml }} />

        {!varianteSoportada ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Simulación no disponible</p>
            <p className="mt-1 text-amber-900/90">
              Este contenido usa la variante <span className="font-mono">{variante.replace(/_/g, ' ')}</span>, que ya no está
              activa. Solo se ofrecen <strong>mapa de poder</strong> y <strong>EDT</strong>. Pide a tu docente que actualice el
              ejercicio.
            </p>
          </div>
        ) : null}

        {varianteSoportada && variante === 'mapa_poder' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Arrastra cada interesado al cuadrante del mapa poder / interés.</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase">Interesados</div>
              {mapaStakeholders.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing"
                >
                  <div className="font-medium text-slate-800">{s.nombre}</div>
                  {s.descripcion ? <div className="text-xs text-slate-500 mt-1">{s.descripcion}</div> : null}
                  {(answer as any).placements?.[s.id] ? (
                    <div className="mt-2 text-xs text-blue-600">
                      Asignado: {QUADRANT_LABELS[(answer as any).placements[s.id]] || (answer as any).placements[s.id]}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <h4 className="text-center text-base sm:text-lg font-semibold tracking-wide text-slate-800 uppercase">
              Aquí está la matriz de poder
            </h4>

            <div className="relative rounded-xl p-1">
              <div
                className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-xl"
                aria-hidden
              >
                <div className="absolute left-1/2 top-2 bottom-2 w-[3px] -translate-x-1/2 rounded-full bg-red-600 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
                <div className="absolute top-1/2 left-2 right-2 h-[3px] -translate-y-1/2 rounded-full bg-red-600 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]" />
              </div>
              <div className="relative z-0 grid grid-cols-2 gap-2 min-h-[280px]">
                {QUADRANT_KEYS.map((q) => (
                  <div
                    key={q}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropOnQuadrant(q)}
                    className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-3 flex flex-col gap-2"
                  >
                    <div className="text-xs font-semibold text-slate-600 leading-tight">{QUADRANT_LABELS[q]}</div>
                    <div className="flex flex-wrap gap-1">
                      {mapaStakeholders
                        .filter((s) => (answer as any).placements?.[s.id] === q)
                        .map((s) => (
                          <span key={s.id} className="rounded-full bg-white px-2 py-0.5 text-[11px] border border-slate-200">
                            {s.nombre}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {varianteSoportada && variante === 'edt' && (
          <div className="space-y-6">
            {spec.contexto ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{spec.contexto as string}</p>
            ) : null}

            <div className="rounded-xl border border-blue-100 bg-slate-50/80 p-4 overflow-x-auto">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide text-center mb-3">
                Diagrama EDT (completa cada casilla)
              </p>
              <div className="min-w-[880px] pb-2">
                <div className="flex justify-center mb-2">
                  <div
                    style={EDT_STYLE_FILLED}
                    className="max-w-[920px] w-full rounded-xl border-2 px-4 py-4 text-center uppercase font-bold text-[10px] sm:text-xs leading-snug shadow-lg"
                  >
                    {edtRaizTitulo}
                  </div>
                </div>
                <div className="flex justify-center h-6 relative">
                  <div className="w-px bg-blue-900" />
                </div>
                <div className="flex justify-center px-4">
                  <div className="h-1 bg-blue-900 rounded-full w-[92%] max-w-[880px]" />
                </div>
                <div className="flex justify-between gap-2 px-1 -mt-0.5 items-start">
                  {edtLevel1.map((ent) => {
                    const pkgs = edtByParent.get(String(ent.id)) || [];
                    return (
                      <div key={ent.id} className="flex flex-col items-center flex-1 min-w-0 max-w-[24%]">
                        <div className="w-px h-4 shrink-0 bg-blue-900" />
                        <div className="w-full px-0.5">{renderEdtSlotBox(String(ent.id), 'entregable')}</div>
                        <div className="w-px h-3 shrink-0 bg-blue-900" />
                        <div className="w-full flex flex-col gap-2">
                          {pkgs.map((p) => (
                            <div key={p.id} className="w-full px-0.5">
                              {renderEdtSlotBox(String(p.id), 'paquete')}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-6"
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropEdtPool}
            >
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Carril 1 — Entregables (nivel 2)</div>
                <p className="text-xs text-slate-500 mb-2">
                  Cuentas de control bajo el proyecto. Arrastra cada uno a la casilla de entregable del diagrama; devuélvelo soltándolo en
                  cualquier zona de esta tarjeta.
                </p>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 min-h-[48px] rounded-lg border border-dashed border-slate-300 bg-white/80 p-3">
                  {edtChipsPoolEnt.length === 0 ? (
                    <span className="text-xs text-slate-400 self-center sm:col-span-full justify-self-center py-2">
                      (todos colocados)
                    </span>
                  ) : null}
                  {edtChipsPoolEnt.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      style={EDT_STYLE_FILLED}
                      className="cursor-grab select-none w-full max-w-full rounded-xl border-2 px-3 py-2.5 text-left text-[11px] sm:text-xs font-semibold uppercase leading-snug shadow-md active:cursor-grabbing [overflow-wrap:anywhere]"
                    >
                      {t.titulo}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                  Carril 2 — Paquetes de trabajo (nivel 3)
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Descomposición de cada entregable. Arrastra cada paquete a su casilla bajo el entregable correspondiente; devuélvelo
                  soltándolo en cualquier zona de esta tarjeta.
                </p>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-h-[48px] rounded-lg border border-dashed border-slate-300 bg-white/80 p-3">
                  {edtChipsPoolPaq.length === 0 ? (
                    <span className="text-xs text-slate-400 self-center sm:col-span-full justify-self-center py-2">
                      (todos colocados)
                    </span>
                  ) : null}
                  {edtChipsPoolPaq.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      style={EDT_STYLE_FILLED}
                      className="cursor-grab select-none w-full max-w-full rounded-xl border-2 px-3 py-2.5 text-left text-[11px] sm:text-xs font-medium normal-case leading-snug shadow-md active:cursor-grabbing [overflow-wrap:anywhere]"
                    >
                      {t.titulo}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {configurableMode ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Esta simulación se evaluará con el botón principal del miniproyecto o al enviar este ítem.
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
            >
              Validar (sin enviar)
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || aprobado || !varianteSoportada}
              className="rounded-lg px-8 py-2.5 text-sm font-medium text-white shadow-sm transition-all disabled:bg-slate-400"
              style={{
                backgroundColor: isSubmitting || aprobado || !varianteSoportada ? undefined : '#4A90E2',
              }}
            >
              {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        )}

        {feedback ? (
          <p className={`mt-4 text-sm ${aprobado ? 'text-green-700' : 'text-red-700'}`}>
            {feedback}
          </p>
        ) : null}
      </div>
    </div>
  );
}
