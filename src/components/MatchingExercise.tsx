import { useEffect, useMemo, useState } from 'react';
import { resolveExercise } from '../utils/resolveExercise';
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

export function MatchingExercise({ activity, enunciado = 'Relaciona cada concepto con su definición', pares = [{ concepto: 'Concepto A', definicion: 'Definición A' }, { concepto: 'Concepto B', definicion: 'Definición B' }], onBack, onComplete, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, resolvePath, submitPath }: MatchingExerciseProps) {
  const [left] = useState<Pair[]>(pares);
  // Aleatorizar definiciones pero mantener orden de conceptos
  const rightAleatorio = useMemo(() => {
    return [...pares].sort(() => Math.random() - 0.5);
  }, [JSON.stringify(pares)]);
  const [right] = useState<Pair[]>(rightAleatorio);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  const pickRight = (idx: number) => {
    if (selectedLeft === null) return;
    setMatches(prev => ({ ...prev, [selectedLeft]: idx }));
    setSelectedLeft(null);
  };

  const buildParejas = () => {
    const entries = Object.entries(matches);
    const matchesObj: Record<string, string> = {};
    entries.forEach(([l, r]) => {
      matchesObj[left[Number(l)].concepto] = right[Number(r)].definicion;
    });
    return matchesObj;
  };

  useEffect(() => {
    const rawMatches = configurableResponse?.respuesta?.matches;
    if (!rawMatches || typeof rawMatches !== 'object') {
      setMatches((currentMatches) => Object.keys(currentMatches).length === 0 ? currentMatches : {});
      return;
    }

    const nextMatches: Record<number, number> = {};
    Object.entries(rawMatches).forEach(([concepto, definicion]) => {
      const leftIndex = left.findIndex((item) => item.concepto === concepto);
      const rightIndex = right.findIndex((item) => item.definicion === definicion);
      if (leftIndex >= 0 && rightIndex >= 0) {
        nextMatches[leftIndex] = rightIndex;
      }
    });
    setMatches((currentMatches) => JSON.stringify(currentMatches) === JSON.stringify(nextMatches) ? currentMatches : nextMatches);
  }, [configurableResponse, left, right]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuesta: { matches: buildParejas() } });
  }, [configurableMode, matches, onConfigurableResponseChange]);

  const handlePreview = async () => {
    const result = await resolveExercise(activity.id, { respuesta: { matches: buildParejas() } }, resolvePath);
    if (result.status === 400 || result.status === 200) {
      const data: any = result.data || {};
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`${result.status === 200 ? 'Correcta (preview)' : 'Incorrecta (preview)'}${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
    } else {
      alert(`Error: ${result.message || 'No se pudo validar'}`);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const res = await submitExercise(activity.id, { matches: buildParejas() }, estudianteId || undefined, submitPath);
    if (res.status === 429) {
      alert(`${res.message || 'Otro envío en proceso; intenta de nuevo'}`);
    } else if (res.status === 409) {
      setAprobado(true);
      onComplete?.();
      alert(`${res.message || 'Ejercicio ya aprobado'}`);
    } else if (res.status === 400) {
      const data: any = res.data || {};
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`Incorrecta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      setAprobado(false);
    } else if (res.status === 200) {
      const data: any = res.data || {};
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(true);
      onComplete?.();
      alert(`Correcta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
    } else {
      alert(`Error del servidor: ${res.message || 'Error desconocido'}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[#3A4A5B] font-semibold">{activity.title}</h3>
        {!embedded ? <button onClick={onBack} className="text-sm text-gray-600 hover:text-[#3A4A5B]">Volver</button> : null}
      </div>
      <div
        className="html-content text-gray-700 mb-4"
        dangerouslySetInnerHTML={{ __html: enunciado }}
      />
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          {left.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedLeft(idx)}
              className={`w-full text-left p-3 rounded-lg border ${selectedLeft === idx ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
            >
              {p.concepto}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((p, idx) => (
            <button
              key={idx}
              onClick={() => pickRight(idx)}
              className="w-full text-left p-3 rounded-lg border border-gray-200"
            >
              {p.definicion}
            </button>
          ))}
        </div>
      </div>
      {Object.keys(matches).length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Selecciones: {Object.entries(matches).map(([l, r]) => `${left[Number(l)].concepto} → ${right[Number(r)].definicion}`).join(', ')}
        </div>
      )}
      {configurableMode ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Las relaciones elegidas se evaluarán junto con el resto del miniproyecto.
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={handlePreview} className="px-6 py-2 rounded-lg border">Preview</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || aprobado}
            className="px-6 py-2 rounded-lg text-white"
            style={{ backgroundColor: (isSubmitting || aprobado) ? '#9CA3AF' : '#4A90E2' }}
          >
            {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
      {feedback && (
        <div className="mt-4 text-sm text-gray-700">
          {feedback}
          {puntos !== null && <div className="mt-1 text-blue-600">Puntos: {puntos}</div>}
        </div>
      )}
    </div>
  );
}

export default MatchingExercise;
