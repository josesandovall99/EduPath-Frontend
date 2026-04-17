import { useEffect, useMemo, useState } from 'react';
import { resolveExercise } from '../utils/resolveExercise';
import { submitExercise } from '../utils/submitExercise';

interface MultipleChoiceExerciseProps {
  activity: { id: string; title: string };
  enunciado?: string;
  opciones?: string[];
  onBack: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

export function MultipleChoiceExercise({ activity, enunciado = 'Selecciona la opción correcta', opciones = ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'], onBack, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, resolvePath, submitPath }: MultipleChoiceExerciseProps) {
  // Aleatorizar opciones manteniendo el texto original
  const opcionesAleatorias = useMemo(() => {
    return [...opciones].sort(() => Math.random() - 0.5);
  }, [JSON.stringify(opciones)]);

  const [selectedOption, setSelectedOption] = useState<string>((configurableResponse?.respuesta?.opcion || '').toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  useEffect(() => {
    const nextOption = (configurableResponse?.respuesta?.opcion || '').toString();
    setSelectedOption((currentOption) => currentOption === nextOption ? currentOption : nextOption);
  }, [configurableResponse]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuesta: { opcion: selectedOption } });
  }, [configurableMode, onConfigurableResponseChange, selectedOption]);

  const handlePreview = async () => {
    if (!selectedOption) return;
    const opcionSeleccionada = selectedOption;
    const result = await resolveExercise(activity.id, { respuesta: { opcion: opcionSeleccionada } }, resolvePath);
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
    if (!selectedOption) return;
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const opcionSeleccionada = selectedOption;
    const res = await submitExercise(activity.id, { opcion: opcionSeleccionada }, estudianteId || undefined, submitPath);
    if (res.status === 429) {
      alert(`${res.message || 'Otro envío en proceso; intenta de nuevo'}`);
    } else if (res.status === 409) {
      setAprobado(true);
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
      <p className="text-gray-700 mb-4">{enunciado}</p>
      <div className="space-y-3">
        {opcionesAleatorias.map((op, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedOption(op)}
            className="w-full text-left p-3 rounded-lg border"
            style={{ borderColor: selectedOption === op ? '#4A90E2' : '#E5E7EB', backgroundColor: selectedOption === op ? '#4A90E222' : 'white' }}
          >
            {op}
          </button>
        ))}
      </div>
      {configurableMode ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          La respuesta de este ejercicio se evaluará cuando uses el botón principal Evaluar miniproyecto.
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={handlePreview}
            disabled={!selectedOption}
            className="px-6 py-2 rounded-lg border"
          >
            Preview
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting || aprobado}
            className="px-6 py-2 rounded-lg text-white"
            style={{ backgroundColor: (!selectedOption || isSubmitting || aprobado) ? '#9CA3AF' : '#4A90E2' }}
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

export default MultipleChoiceExercise;
