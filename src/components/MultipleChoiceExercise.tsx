import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { submitExercise } from '../utils/submitExercise';

interface MultipleChoiceExerciseProps {
  activity: { id: string; title: string };
  enunciado?: string;
  opciones?: string[];
  onBack: () => void;
  onComplete?: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

export function MultipleChoiceExercise({ activity, enunciado = 'Selecciona la opción correcta', opciones = ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'], onBack, onComplete, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, submitPath }: MultipleChoiceExerciseProps) {
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

  const handleSubmit = async () => {
    if (!selectedOption) return;
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const opcionSeleccionada = selectedOption;
    const res = await submitExercise(activity.id, { opcion: opcionSeleccionada }, estudianteId || undefined, submitPath);
    const data: any = res.data || {};
    const puntosTxt = typeof data?.puntosObtenidos === 'number' ? `Puntos: ${data.puntosObtenidos}` : undefined;

    if (res.status === 429) {
      toast.warning('Envío en proceso', { description: res.message || 'Otro envío en proceso; intenta de nuevo' });
    } else if (res.status === 409) {
      setAprobado(true);
      onComplete?.();
      toast.info('Ejercicio aprobado', { description: res.message || 'Ya tienes este ejercicio aprobado.' });
    } else if (res.status === 400) {
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(false);
      toast.error('Respuesta incorrecta', { description: data?.retroalimentacion || puntosTxt });
    } else if (res.status === 200) {
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(true);
      onComplete?.();
      toast.success('Respuesta correcta', { description: data?.retroalimentacion || puntosTxt });
    } else {
      toast.error('Error del servidor', { description: res.message || 'Error desconocido' });
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
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting || aprobado}
            className="px-8 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all"
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
