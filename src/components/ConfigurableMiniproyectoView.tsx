import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, Settings } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { MiniproyectoChatbotPanel } from './MiniproyectoChatbotPanel';
import { ProgrammingContentView } from './ProgrammingContentView';
import { UMLDiagramView } from './UMLDiagramView';
import { MultipleChoiceExercise } from './MultipleChoiceExercise';
import { OrderingExercise } from './OrderingExercise';
import { MatchingExercise } from './MatchingExercise';
import { QuestionnaireExercise } from './QuestionnaireExercise';
import { ConfigurableMiniproyectoPayload, EmbeddedExercise, parseConfigurableMiniproyecto } from './configurableEmbeddedExercises';

interface ConfigurableMiniproyectoViewProps {
  content: {
    id: string;
    title: string;
    areaId?: number;
    areaNombre?: string;
  };
  onBack: () => void;
}

interface ChatbotInfo {
  id: number;
  nombre: string;
  estado?: boolean;
}

interface MiniproyectoResponse {
  id: number;
  entregable?: string;
  respuesta_miniproyecto?: string;
  Area?: { id?: number; nombre?: string };
  Actividad?: { titulo?: string; descripcion?: string; nivel_dificultad?: string };
  chatbots?: ChatbotInfo[];
}

interface LegacyExerciseResponse {
  id: number;
  tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar';
  configuracion?: EmbeddedExercise['configuracion'];
  actividad?: { titulo?: string; descripcion?: string };
}

interface ConfigurableProgressItem {
  id: string;
  aprobado?: boolean;
  esCorrecta?: boolean;
  respondido?: boolean;
}

interface ConfigurableProgressResponse {
  completado?: boolean;
  listoParaEvaluar?: boolean;
  ejerciciosRespondidos?: number;
  ejerciciosCorrectos?: number;
  calificacion?: number;
  retroalimentacionGeneral?: string;
  fechaEvaluacion?: string | null;
  ejercicios?: ConfigurableProgressItem[];
}

function hasDraftResponse(response: any) {
  if (!response || typeof response !== 'object') return false;
  if (typeof response.codigo === 'string') return response.codigo.trim().length > 0;
  if (typeof response.respuesta?.opcion === 'string') return response.respuesta.opcion.trim().length > 0;
  if (Array.isArray(response.respuesta?.orden)) return response.respuesta.orden.length > 0;
  if (response.respuesta?.matches && typeof response.respuesta.matches === 'object') return Object.keys(response.respuesta.matches).length > 0;
  if (response.respuestas && typeof response.respuestas === 'object') return Object.keys(response.respuestas).length > 0;
  if (response.respuesta?.diagram && typeof response.respuesta.diagram === 'object') return true;
  return false;
}

function serializeConfigurableResponse(response: any) {
  try {
    return JSON.stringify(response ?? null);
  } catch {
    return String(response);
  }
}

function stripHtmlContent(value?: string | null) {
  return (value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasRenderableDescription(value?: string | null) {
  return stripHtmlContent(value).length > 0;
}

function normalizeExerciseType(exercise: EmbeddedExercise | LegacyExerciseResponse) {
  if (exercise.tipo_ejercicio !== 'Preguntas') return exercise.tipo_ejercicio;
  const configType = String(exercise.configuracion?.tipo || '').trim().toLowerCase();
  if (configType === 'opcion-unica') return 'Opción única';
  if (configType === 'ordenar') return 'Ordenar';
  if (configType === 'relacionar') return 'Relacionar';
  return 'Preguntas';
}

export function ConfigurableMiniproyectoView({ content, onBack }: ConfigurableMiniproyectoViewProps) {
  const [miniproyecto, setMiniproyecto] = useState<MiniproyectoResponse | null>(null);
  const [payload, setPayload] = useState<ConfigurableMiniproyectoPayload | null>(null);
  const [legacyExercises, setLegacyExercises] = useState<LegacyExerciseResponse[]>([]);
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [exerciseResponses, setExerciseResponses] = useState<Record<string, any>>({});
  const [progressSummary, setProgressSummary] = useState<ConfigurableProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfigurableProgress = async (miniproyectoId: string | number) => {
    try {
      const progressResponse = await fetch(`${API_BASE_URL}/miniproyectos/${miniproyectoId}/configurable-progress`);
      if (!progressResponse.ok) return { map: {}, summary: null as ConfigurableProgressResponse | null };
      const progressData: ConfigurableProgressResponse = await progressResponse.json();
      const nextMap = Object.fromEntries(Array.isArray(progressData?.ejercicios) ? progressData.ejercicios.map((item) => [String(item.id), Boolean(item.esCorrecta ?? item.aprobado)]) : []);
      return { map: nextMap, summary: progressData };
    } catch {
      return { map: {}, summary: null as ConfigurableProgressResponse | null };
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadConfigurableMiniproyecto = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/miniproyectos/${content.id}`);
        if (!response.ok) throw new Error('No se pudo cargar el miniproyecto.');
        const miniproyectoData: MiniproyectoResponse = await response.json();
        if (cancelled) return;

        const parsedPayload = parseConfigurableMiniproyecto(miniproyectoData.respuesta_miniproyecto);
        if (!parsedPayload) throw new Error('Este miniproyecto no está configurado como paquete de ejercicios.');

        let embeddedCorrectMap: Record<string, boolean> = {};
        let embeddedProgressSummary: ConfigurableProgressResponse | null = null;
        let fetchedLegacyExercises: LegacyExerciseResponse[] = [];

        if (parsedPayload.exercises.length > 0) {
          const progressState = await loadConfigurableProgress(content.id);
          embeddedCorrectMap = progressState.map;
          embeddedProgressSummary = progressState.summary;
        } else if ((parsedPayload.exerciseIds || []).length > 0) {
          fetchedLegacyExercises = await Promise.all((parsedPayload.exerciseIds || []).map(async (exerciseId) => {
            const exerciseResponse = await fetch(`${API_BASE_URL}/ejercicios/${exerciseId}`);
            if (!exerciseResponse.ok) throw new Error(`No se pudo cargar el ejercicio ${exerciseId}.`);
            return exerciseResponse.json();
          }));
        }

        if (cancelled) return;
        setMiniproyecto(miniproyectoData);
        setPayload(parsedPayload);
        setLegacyExercises(fetchedLegacyExercises);
        setCorrectMap(embeddedCorrectMap);
        setProgressSummary(embeddedProgressSummary);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el miniproyecto configurable.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadConfigurableMiniproyecto();
    return () => { cancelled = true; };
  }, [content.id]);

  const exercises = useMemo(() => {
    if (payload?.exercises?.length) return payload.exercises;
    return legacyExercises.map((exercise) => ({
      id: String(exercise.id),
      titulo: exercise.actividad?.titulo || `Ejercicio ${exercise.id}`,
      descripcion: exercise.actividad?.descripcion || '',
      tipo_ejercicio: exercise.tipo_ejercicio,
      configuracion: exercise.configuracion,
      puntos: 100,
    })) as EmbeddedExercise[];
  }, [legacyExercises, payload]);

  const totalExercises = exercises.length;
  const draftedResponses = Object.values(exerciseResponses).filter((response) => hasDraftResponse(response)).length;
  const answeredExercises = Math.max(Number(progressSummary?.ejerciciosRespondidos || 0), draftedResponses);
  const correctExercises = Number(progressSummary?.ejerciciosCorrectos || 0);
  const incorrectExercises = Math.max(0, answeredExercises - correctExercises);
  const isCompleted = Boolean(progressSummary?.completado);
  const readyToEvaluate = totalExercises > 0 && exercises.every((exercise) => hasDraftResponse(exerciseResponses[String(exercise.id)]));
  const showChatbot = Boolean(payload?.chatbot?.enabled) || Boolean(miniproyecto?.chatbots?.some((chatbot) => chatbot.estado !== false));
  const accuracy = totalExercises > 0 ? Math.round((correctExercises / totalExercises) * 100) : 0;
  const completionProgress = totalExercises > 0 ? Math.round((correctExercises / totalExercises) * 100) : 0;
  const miniproyectoDescripcion = miniproyecto?.Actividad?.descripcion || '';
  const miniproyectoEntregable = (miniproyecto?.entregable || '').trim();
  const miniproyectoNivel = (miniproyecto?.Actividad?.nivel_dificultad || '').trim();

  const updateExerciseResponse = useCallback((exerciseId: string, response: any) => {
    setExerciseResponses((prev) => {
      const currentResponse = prev[exerciseId];
      if (serializeConfigurableResponse(currentResponse) === serializeConfigurableResponse(response)) return prev;
      return { ...prev, [exerciseId]: response };
    });
  }, []);

  const configurableResponseHandlers = useMemo(() => {
    return Object.fromEntries(
      exercises.map((exercise) => [
        String(exercise.id),
        (response: any) => updateExerciseResponse(String(exercise.id), response),
      ])
    ) as Record<string, (response: any) => void>;
  }, [exercises, updateExerciseResponse]);

  const handleEvaluateMiniproyecto = async () => {
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      alert('No se encontró la sesión del estudiante. Inicia sesión nuevamente.');
      return;
    }
    setIsEvaluating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/miniproyectos/${content.id}/evaluar-configurable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudiante_id: estudianteId, respuestas: exerciseResponses }),
      });
      const data = await response.json().catch(() => ({}));
      const progressState = await loadConfigurableProgress(content.id);
      setCorrectMap(progressState.map);
      setProgressSummary(progressState.summary);
      alert(data?.message || (response.ok ? 'El miniproyecto fue evaluado correctamente.' : 'No fue posible evaluar el miniproyecto configurable.'));
    } catch {
      alert('Ocurrió un error técnico al evaluar el miniproyecto configurable.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const renderExerciseCard = (selectedExercise: EmbeddedExercise, index: number) => {
    const exerciseTitle = selectedExercise.titulo || `Ejercicio ${selectedExercise.id}`;
    const normalizedType = normalizeExerciseType(selectedExercise);
    const contentProps = { id: String(selectedExercise.id), title: exerciseTitle, type: 'activity' as const };
    const resolvePath = `/miniproyectos/${content.id}/ejercicios/${selectedExercise.id}/resolver`;
    const submitPath = `/miniproyectos/${content.id}/ejercicios/${selectedExercise.id}/enviar`;
    const feedbackPath = `/miniproyectos/${content.id}/ejercicios/${selectedExercise.id}/retroalimentacion`;
    const approved = Boolean(correctMap[String(selectedExercise.id)]);
    const hasDraft = hasDraftResponse(exerciseResponses[String(selectedExercise.id)]);
    const isLargeExercise = normalizedType === 'Compilador' || normalizedType === 'Diagramas UML' || normalizedType === 'Preguntas';

    let exerciseContent: React.ReactNode;
    if (normalizedType === 'Compilador') {
      exerciseContent = <ProgrammingContentView content={contentProps} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} exerciseData={{ id: Number(selectedExercise.id), contenido_id: 0, puntos: selectedExercise.puntos || 100, resultado_ejercicio: selectedExercise.resultado_ejercicio || '', codigoEstructura: selectedExercise.codigoEstructura || undefined, tipo_ejercicio: selectedExercise.tipo_ejercicio, configuracion: selectedExercise.configuracion, actividad: { titulo: selectedExercise.titulo, descripcion: selectedExercise.descripcion } }} executePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Opción única') {
      exerciseContent = <MultipleChoiceExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} opciones={selectedExercise.configuracion?.opciones} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Ordenar') {
      exerciseContent = <OrderingExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} items={selectedExercise.configuracion?.items} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Relacionar') {
      exerciseContent = <MatchingExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} pares={selectedExercise.configuracion?.pares} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Diagramas UML') {
      exerciseContent = <UMLDiagramView activity={{ id: String(selectedExercise.id), title: exerciseTitle }} onBack={() => undefined} configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} resolvePath={resolvePath} submitPath={submitPath} feedbackPath={feedbackPath} />;
    } else if (normalizedType === 'Preguntas') {
      exerciseContent = <QuestionnaireExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} preguntas={Array.isArray(selectedExercise.configuracion?.preguntas) ? selectedExercise.configuracion?.preguntas : []} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={configurableResponseHandlers[String(selectedExercise.id)]} resolvePath={resolvePath} submitPath={submitPath} />;
    } else {
      exerciseContent = <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-800">El tipo de ejercicio {normalizedType} todavía no está habilitado dentro del miniproyecto configurable.</div>;
    }

    return (
      <article
        key={selectedExercise.id}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        style={isLargeExercise ? { gridColumn: '1 / -1' } : undefined}
      >
        <div className="border-b border-slate-100 px-5 py-3" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="text-sm font-semibold" style={{ color: '#2563EB' }}>Ejercicio {index + 1}</span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>{normalizedType}</span>
            </div>
            {exerciseTitle !== `Ejercicio ${selectedExercise.id}` && (
              <p className="mt-0.5 text-sm font-medium text-[#1e293b] truncate">{exerciseTitle}</p>
            )}
            {selectedExercise.descripcion ? (
              <p className="mt-0.5 text-xs leading-5 text-slate-400" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{selectedExercise.descripcion}</p>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span className="text-xs font-medium text-slate-400">{selectedExercise.puntos || 100} pts</span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={approved ? { backgroundColor: '#f0fdf4', color: '#16a34a' } : hasDraft ? { backgroundColor: '#fffbeb', color: '#d97706' } : { backgroundColor: '#f1f5f9', color: '#64748b' }}
            >
              {approved ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              {approved ? 'Correcto' : hasDraft ? 'Respondido' : 'Pendiente'}
            </span>
          </div>
        </div>
        <div>{exerciseContent}</div>
      </article>
    );
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    width: '100%',
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div style={containerStyle} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-bold text-white" style={{ width: '36px', height: '36px' }}>MP</div>
            <div className="min-w-0">
              <h1 className="truncate text-[0.95rem] font-semibold leading-5 text-[#1e293b]">{miniproyecto?.Actividad?.titulo || content.title}</h1>
              <p className="truncate text-xs text-slate-400">Miniproyecto configurado por opciones</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              <Settings className="h-3.5 w-3.5" />
              <span>Configuración</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── escala: 16px · 24px · 32px · 40px ── */}
      <main style={{ paddingTop: '40px', paddingBottom: '40px' }}>
        <div style={containerStyle}>
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500 shadow-sm">Cargando miniproyecto configurable...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700 shadow-sm">{error}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* ── Stats cards ── */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <article style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '16px', borderLeft: '5px solid #2563EB', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>Total ejercicios</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{totalExercises}</p>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EAF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ClipboardList style={{ width: '22px', height: '22px', color: '#2563EB' }} />
                </div>
              </article>

              <article style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '16px', borderLeft: '5px solid #16a34a', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>Respuestas correctas</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{correctExercises}</p>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 style={{ width: '22px', height: '22px', color: '#16a34a' }} />
                </div>
              </article>

              <article style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '16px', borderLeft: '5px solid #dc2626', padding: '24px 28px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>Respuestas incorrectas</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{incorrectExercises}</p>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Circle style={{ width: '22px', height: '22px', color: '#dc2626' }} />
                </div>
              </article>
            </section>

            {/* ── Descripción / Nivel / Entregable ── */}
            {(hasRenderableDescription(miniproyectoDescripcion) || miniproyectoNivel || miniproyectoEntregable) && (
              <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {hasRenderableDescription(miniproyectoDescripcion) && (
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '10px' }}>Descripción</p>
                      <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: miniproyectoDescripcion }} />
                    </div>
                  )}
                  {miniproyectoNivel && (
                    <div style={{ flex: '0 0 auto', minWidth: '90px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '10px' }}>Nivel</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{miniproyectoNivel}</p>
                    </div>
                  )}
                  {miniproyectoEntregable && (
                    <div style={{ flex: '0 0 auto', maxWidth: '220px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '10px' }}>Entregable</p>
                      <p style={{ fontSize: '14px', color: '#475569' }}>{miniproyectoEntregable}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Chatbot ── */}
            {showChatbot && (
              <section style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <MiniproyectoChatbotPanel chatbotType="MINIPROYECTO" areaId={miniproyecto?.Area?.id || content.areaId || null} miniproyectoId={miniproyecto?.id || content.id} title="Petitbot" subtitle="Chatbot configurado para este miniproyecto" contextLabel={miniproyecto?.Actividad?.titulo || content.title} />
              </section>
            )}

            {/* ── Ejercicios ── */}
            <section>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Ejercicios</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '24px' }}>
                {exercises.map((exercise, index) => renderExerciseCard(exercise, index))}
              </div>
            </section>

            {/* ── Evaluación ── */}
            <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Evaluación del miniproyecto</p>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {readyToEvaluate ? 'Todos los ejercicios han sido respondidos. Puedes evaluar.' : `Restan ${Math.max(totalExercises - answeredExercises, 0)} ejercicio(s) por responder.`}
                  </p>
                </div>
                <button
                  onClick={handleEvaluateMiniproyecto}
                  disabled={!readyToEvaluate || isEvaluating || isCompleted}
                  style={{ flexShrink: 0, padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: readyToEvaluate && !isEvaluating && !isCompleted ? 'pointer' : 'not-allowed', background: readyToEvaluate && !isCompleted ? '#2563EB' : '#e2e8f0', color: readyToEvaluate && !isCompleted ? '#fff' : '#94a3b8', border: 'none', transition: 'background 0.2s' }}
                >
                  {isCompleted ? 'Miniproyecto evaluado' : isEvaluating ? 'Evaluando...' : 'Evaluar miniproyecto'}
                </button>
              </div>

              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  <span>Progreso</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{correctExercises}/{totalExercises} completado</span>
                </div>
                <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: '#2563EB', width: `${completionProgress}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              {typeof progressSummary?.retroalimentacionGeneral === 'string' && progressSummary.retroalimentacionGeneral.trim() ? (
                <div style={{ marginTop: '16px', background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  {progressSummary.retroalimentacionGeneral}
                </div>
              ) : null}
            </section>

          </div>
        )}
        </div>
      </main>
    </div>
  );
}