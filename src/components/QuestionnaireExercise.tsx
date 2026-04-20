import { useEffect, useState } from 'react';
import { resolveExercise } from '../utils/resolveExercise';
import { submitExercise } from '../utils/submitExercise';

interface QuestionnaireQuestion {
  id: string;
  enunciado: string;
  tipo: 'opcion-multiple' | 'abierta';
  opciones?: string[];
  respuesta_correcta: string | number;
}

interface QuestionnaireExerciseProps {
  activity: { id: string; title: string };
  preguntas?: QuestionnaireQuestion[];
  onBack: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  resolvePath?: string;
  submitPath?: string;
}

export function QuestionnaireExercise({ activity, preguntas = [], onBack, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, resolvePath, submitPath }: QuestionnaireExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(configurableResponse?.respuestas || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  const canSubmit = preguntas.length > 0 && preguntas.every((question) => String(answers[question.id] || '').trim().length > 0);

  useEffect(() => {
    const nextAnswers = configurableResponse?.respuestas || {};
    setAnswers((currentAnswers) => JSON.stringify(currentAnswers) === JSON.stringify(nextAnswers) ? currentAnswers : nextAnswers);
  }, [configurableResponse]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ respuestas: answers });
  }, [answers, configurableMode, onConfigurableResponseChange]);

  const handlePreview = async () => {
    if (!canSubmit) return;
    const result = await resolveExercise(activity.id, { respuestas: answers }, resolvePath);
    if (result.status === 400 || result.status === 200) {
      const data: any = result.data || {};
      setFeedback(data?.retroalimentacion || '');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`${result.status === 200 ? 'Correcta (preview)' : 'Incorrecta (preview)'}${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      return;
    }

    alert(`Error: ${result.message || 'No se pudo validar'}`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    const res = await submitExercise(activity.id, { respuestas: answers }, estudianteId || undefined, submitPath);

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
        <h3 className="font-semibold text-[#3A4A5B]">{activity.title}</h3>
        {!embedded ? <button onClick={onBack} className="text-sm text-gray-600 hover:text-[#3A4A5B]">Volver</button> : null}
      </div>

      {preguntas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          Este cuestionario no tiene preguntas configuradas.
        </div>
      ) : (
        <div className="space-y-6">
          {preguntas.map((pregunta, index) => (
            <div key={pregunta.id} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 text-sm font-semibold text-[#3A4A5B]">{index + 1}. {pregunta.enunciado}</div>
              {pregunta.tipo === 'abierta' ? (
                <textarea
                  value={answers[pregunta.id] || ''}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [pregunta.id]: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  placeholder="Registrar respuesta"
                />
              ) : (
                <div className="space-y-2">
                  {(pregunta.opciones || []).map((option, optionIndex) => (
                    <button
                      key={`${pregunta.id}-${optionIndex}`}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [pregunta.id]: option }))}
                      className="w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors"
                      style={{ borderColor: answers[pregunta.id] === option ? '#4A90E2' : '#E5E7EB', backgroundColor: answers[pregunta.id] === option ? '#EAF3FF' : 'white' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {configurableMode ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Responde todas las preguntas y luego usa el botón principal Evaluar miniproyecto.
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={handlePreview} disabled={!canSubmit} className="rounded-lg border px-6 py-2 disabled:opacity-50">Preview</button>
          <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting || aprobado} className="rounded-lg px-6 py-2 text-white" style={{ backgroundColor: (!canSubmit || isSubmitting || aprobado) ? '#9CA3AF' : '#4A90E2' }}>
            {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}

      {feedback && (
        <div className="mt-4 text-sm text-gray-700">
          {feedback}
          {puntos !== null ? <div className="mt-1 text-blue-600">Puntos: {puntos}</div> : null}
        </div>
      )}
    </div>
  );
}

export default QuestionnaireExercise;