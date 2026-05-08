import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { submitExercise } from '../utils/submitExercise';

interface Pair { concepto: string; definicion: string }

interface MatchingExerciseProps {
  activity: { id: string; title: string };
  enunciado?: string;
  pares?: Pair[];
  onBack: () => void;
  onComplete?: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

/**
 * Paleta para identificar cada pareja. Colores suaves (bg/badge) y
 * borde + texto más saturados para que el chip sea legible sin agobiar.
 */
const PAIR_PALETTE = [
  { bg: '#EFF6FF', border: '#60A5FA', text: '#1E40AF', badge: '#DBEAFE' }, // azul
  { bg: '#F0FDF4', border: '#4ADE80', text: '#15803D', badge: '#DCFCE7' }, // verde
  { bg: '#FFF7ED', border: '#FB923C', text: '#C2410C', badge: '#FFEDD5' }, // naranja
  { bg: '#FDF4FF', border: '#C084FC', text: '#7E22CE', badge: '#F3E8FF' }, // violeta
  { bg: '#FFFBEB', border: '#FACC15', text: '#854D0E', badge: '#FEF9C3' }, // amarillo
  { bg: '#ECFEFF', border: '#22D3EE', text: '#0E7490', badge: '#CFFAFE' }, // cian
];

export function MatchingExercise({
  activity,
  enunciado = 'Relaciona cada concepto con su definición',
  pares = [
    { concepto: 'Concepto A', definicion: 'Definición A' },
    { concepto: 'Concepto B', definicion: 'Definición B' },
  ],
  onBack,
  onComplete,
  embedded = false,
  configurableMode = false,
  configurableResponse,
  onConfigurableResponseChange,
  submitPath,
}: MatchingExerciseProps) {
  const [left] = useState<Pair[]>(pares);

  /** Las definiciones del lado derecho se aleatorizan una sola vez al montar. */
  const rightAleatorio = useMemo(
    () => [...pares].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(pares)]
  );
  const [right] = useState<Pair[]>(rightAleatorio);

  /**
   * Índice del concepto (columna izquierda) actualmente seleccionado y
   * pendiente de ser emparejado con una definición.
   */
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

  /**
   * Mapa de parejas confirmadas: { leftIndex → rightIndex }.
   * Un par relacionado comparte el mismo slot de color en PAIR_PALETTE.
   */
  const [matches, setMatches] = useState<Record<number, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Devuelve el índice de color asignado a un par dado el leftIndex.
   * El orden de inserción determina el slot de color.
   */
  const getPairColorIndex = (leftIdx: number): number => {
    const keys = Object.keys(matches).map(Number);
    const pos = keys.indexOf(leftIdx);
    return pos >= 0 ? pos % PAIR_PALETTE.length : -1;
  };

  /** Devuelve el índice de color del rightIndex ya emparejado (si existe). */
  const getRightColorIndex = (rightIdx: number): number => {
    const entry = Object.entries(matches).find(([, r]) => Number(r) === rightIdx);
    if (!entry) return -1;
    return getPairColorIndex(Number(entry[0]));
  };

  const buildParejas = () => {
    const matchesObj: Record<string, string> = {};
    Object.entries(matches).forEach(([l, r]) => {
      matchesObj[left[Number(l)].concepto] = right[Number(r)].definicion;
    });
    return matchesObj;
  };

  // ── Interacción ───────────────────────────────────────────────────────────

  const handleSelectLeft = (idx: number) => {
    if (aprobado) return;
    // Si ya tiene pareja, permite re-seleccionarlo para cambiar el par.
    setSelectedLeft((prev) => (prev === idx ? null : idx));
  };

  const handlePickRight = (idx: number) => {
    if (selectedLeft === null || aprobado) return;
    setMatches((prev) => ({ ...prev, [selectedLeft]: idx }));
    setSelectedLeft(null);
  };

  /** Elimina el par relacionado de un concepto. */
  const handleRemovePair = (leftIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMatches((prev) => {
      const next = { ...prev };
      delete next[leftIdx];
      return next;
    });
  };

  // ── Sincronización con modo configurable ─────────────────────────────────

  useEffect(() => {
    const rawMatches = configurableResponse?.respuesta?.matches;
    if (!rawMatches || typeof rawMatches !== 'object') {
      setMatches((cur) => (Object.keys(cur).length === 0 ? cur : {}));
      return;
    }
    const nextMatches: Record<number, number> = {};
    Object.entries(rawMatches).forEach(([concepto, definicion]) => {
      const li = left.findIndex((p) => p.concepto === concepto);
      const ri = right.findIndex((p) => p.definicion === definicion);
      if (li >= 0 && ri >= 0) nextMatches[li] = ri;
    });
    setMatches((cur) =>
      JSON.stringify(cur) === JSON.stringify(nextMatches) ? cur : nextMatches
    );
  }, [configurableResponse, left, right]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuesta: { matches: buildParejas() } });
  }, [configurableMode, matches, onConfigurableResponseChange]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const estudianteId =
      localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const res = await submitExercise(
      activity.id,
      { matches: buildParejas() },
      estudianteId || undefined,
      submitPath
    );
    const data: any = res.data || {};
    const ptosTxt =
      typeof data?.puntosObtenidos === 'number'
        ? `Puntos: ${data.puntosObtenidos}`
        : undefined;

    if (res.status === 429) {
      toast.warning('Envío en proceso', { description: res.message || 'Intenta de nuevo en unos segundos.' });
    } else if (res.status === 409) {
      setAprobado(true);
      onComplete?.();
      toast.info('Ejercicio aprobado', { description: res.message || 'Ya tienes este ejercicio aprobado.' });
    } else if (res.status === 400) {
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(false);
      toast.error('Respuesta incorrecta', { description: data?.retroalimentacion || ptosTxt });
    } else if (res.status === 200) {
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(true);
      onComplete?.();
      toast.success('Respuesta correcta', { description: data?.retroalimentacion || ptosTxt });
    } else {
      toast.error('Error del servidor', { description: res.message || 'Error desconocido' });
    }
    setIsSubmitting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const matchedLeftIndices  = new Set(Object.keys(matches).map(Number));
  const matchedRightIndices = new Set(Object.values(matches).map(Number));
  const allMatched = left.length > 0 && matchedLeftIndices.size === left.length;

  return (
    <div>
      {!embedded && (
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
        <div className="mb-4">
          <h3 className="text-[#3A4A5B] font-semibold">{activity.title}</h3>
        </div>

        <div
          className="html-content text-gray-700 mb-5"
          dangerouslySetInnerHTML={{ __html: enunciado }}
        />

        {/* Leyenda de instrucción */}
        {!aprobado && (
          <p className="mb-4 text-xs text-slate-500">
            {selectedLeft !== null
              ? `Concepto seleccionado: "${left[selectedLeft].concepto}" — elige su definición en la columna derecha.`
              : 'Selecciona un concepto y luego su definición correspondiente.'}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Columna izquierda — conceptos */}
          <div className="space-y-2">
            {left.map((p, idx) => {
              const colorIdx   = getPairColorIndex(idx);
              const isMatched  = matchedLeftIndices.has(idx);
              const isSelected = selectedLeft === idx;
              const palette    = colorIdx >= 0 ? PAIR_PALETTE[colorIdx] : null;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectLeft(idx)}
                  disabled={aprobado}
                  className="relative w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all"
                  style={
                    isSelected
                      ? { borderColor: '#4A90E2', backgroundColor: '#EFF6FF', color: '#1E40AF', boxShadow: '0 0 0 3px #BFDBFE' }
                      : isMatched && palette
                        ? { borderColor: palette.border, backgroundColor: palette.bg, color: palette.text, boxShadow: `0 1px 3px ${palette.border}55` }
                        : { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', color: '#374151' }
                  }
                >
                  {/* Chip de color que indica el par */}
                  {isMatched && palette && (
                    <span
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: palette.border }}
                    />
                  )}
                  <span className={isMatched && palette ? 'pl-3' : ''}>{p.concepto}</span>

                  {/* Botón para eliminar el par */}
                  {isMatched && !aprobado && (
                    <span
                      role="button"
                      aria-label="Eliminar par"
                      onClick={(e) => handleRemovePair(idx, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Columna derecha — definiciones */}
          <div className="space-y-2">
            {right.map((p, idx) => {
              const colorIdx   = getRightColorIndex(idx);
              const isMatched  = matchedRightIndices.has(idx);
              const palette    = colorIdx >= 0 ? PAIR_PALETTE[colorIdx] : null;
              const isClickable = selectedLeft !== null && !isMatched && !aprobado;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePickRight(idx)}
                  disabled={aprobado || (isMatched && selectedLeft === null)}
                  className="relative w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all"
                  style={
                    isMatched && palette
                      ? { borderColor: palette.border, backgroundColor: palette.bg, color: palette.text, cursor: 'default', boxShadow: `0 1px 3px ${palette.border}55` }
                      : isClickable
                        ? { borderColor: '#60A5FA', backgroundColor: '#F0F9FF', color: '#1E3A5F', cursor: 'pointer', boxShadow: '0 0 0 2px #BFDBFE' }
                        : { borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', color: '#374151', cursor: selectedLeft !== null ? 'pointer' : 'default' }
                  }
                >
                  {isMatched && palette && (
                    <span
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: palette.border }}
                    />
                  )}
                  <span className={isMatched && palette ? 'pl-3' : ''}>{p.definicion}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen de pares formados */}
        {matchedLeftIndices.size > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pares relacionados ({matchedLeftIndices.size} / {left.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(matches).map(([l, r], i) => {
                const palette = PAIR_PALETTE[i % PAIR_PALETTE.length];
                return (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: palette.badge, color: palette.text, border: `1px solid ${palette.border}` }}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: palette.border }} />
                    {left[Number(l)].concepto} → {right[Number(r)].definicion}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        {configurableMode ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Las relaciones elegidas se evaluarán junto con el resto del miniproyecto.
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || aprobado || !allMatched}
              className="px-8 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all"
              style={{
                backgroundColor:
                  isSubmitting || aprobado || !allMatched ? '#9CA3AF' : '#4A90E2',
              }}
              title={!allMatched ? 'Relaciona todos los pares antes de enviar' : undefined}
            >
              {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        )}

        {feedback && (
          <div className="mt-4 text-sm text-gray-700">
            {feedback}
            {puntos !== null && (
              <div className="mt-1 text-blue-600">Puntos: {puntos}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchingExercise;
