import { useEffect, useMemo, useState } from 'react';
import { resolveExercise } from '../utils/resolveExercise';
import { submitExercise } from '../utils/submitExercise';

interface OrderingExerciseProps {
  activity: { id: string; title: string };
  enunciado?: string;
  items?: string[];
  onBack: () => void;
  onComplete?: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

export function OrderingExercise({ activity, enunciado = 'Ordena los elementos correctamente', items = ['Paso 1', 'Paso 2', 'Paso 3'], onBack, onComplete, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, resolvePath, submitPath }: OrderingExerciseProps) {
  // Aleatorizar items inicialmente
  const itemsAleatorios = useMemo(() => {
    return [...items].sort(() => Math.random() - 0.5);
  }, [JSON.stringify(items)]);
  const [list, setList] = useState<string[]>(Array.isArray(configurableResponse?.respuesta?.orden) ? configurableResponse.respuesta.orden : itemsAleatorios);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuesta: { orden: list } });
  }, [configurableMode, list, onConfigurableResponseChange]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  const areListsEqual = (leftList: string[], rightList: string[]) => (
    leftList.length === rightList.length && leftList.every((item, index) => item === rightList[index])
  );

  useEffect(() => {
    const nextList = Array.isArray(configurableResponse?.respuesta?.orden)
      ? configurableResponse.respuesta.orden
      : itemsAleatorios;

    setList((currentList) => areListsEqual(currentList, nextList) ? currentList : nextList);
  }, [configurableResponse, itemsAleatorios]);

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...list];
    const ni = i + dir;
    if (ni < 0 || ni >= arr.length) return;
    const [it] = arr.splice(i, 1);
    arr.splice(ni, 0, it);
    setList(arr);
  };

  // Simple HTML5 drag & drop for better UX
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const onDragStart = (idx: number) => setDragIndex(idx);
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return;
    const arr = [...list];
    const [item] = arr.splice(dragIndex, 1);
    arr.splice(idx, 0, item);
    setList(arr);
    setDragIndex(null);
  };

  const handlePreview = async () => {
    const result = await resolveExercise(activity.id, { respuesta: { orden: list } }, resolvePath);
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
    const res = await submitExercise(activity.id, { orden: list }, estudianteId || undefined, submitPath);
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
      <div className="space-y-2">
        {list.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2" draggable onDragStart={() => onDragStart(idx)} onDragOver={onDragOver} onDrop={() => onDrop(idx)}>
            <span className="w-6 text-gray-500 text-sm">{idx + 1}.</span>
            <div className="flex-1 p-3 border rounded-lg bg-white">{it}</div>
            <button className="px-2 py-1 border rounded" onClick={() => move(idx, -1)}>↑</button>
            <button className="px-2 py-1 border rounded" onClick={() => move(idx, 1)}>↓</button>
          </div>
        ))}
      </div>
      {configurableMode ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          El orden actual se tomará en cuenta cuando evalúes el miniproyecto completo.
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

export default OrderingExercise;
