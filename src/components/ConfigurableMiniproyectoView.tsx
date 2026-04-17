import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, MoreVertical, Settings, Target, TrendingUp } from 'lucide-react';
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

  const updateExerciseResponse = (exerciseId: string, response: any) => {
    setExerciseResponses((prev) => {
      const currentResponse = prev[exerciseId];
      if (serializeConfigurableResponse(currentResponse) === serializeConfigurableResponse(response)) return prev;
      return { ...prev, [exerciseId]: response };
    });
  };

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
      exerciseContent = <ProgrammingContentView content={contentProps} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} exerciseData={{ id: Number(selectedExercise.id), contenido_id: 0, puntos: selectedExercise.puntos || 100, resultado_ejercicio: selectedExercise.resultado_ejercicio || '', codigoEstructura: selectedExercise.codigoEstructura || undefined, tipo_ejercicio: selectedExercise.tipo_ejercicio, configuracion: selectedExercise.configuracion, actividad: { titulo: selectedExercise.titulo, descripcion: selectedExercise.descripcion } }} executePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Opción única') {
      exerciseContent = <MultipleChoiceExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} opciones={selectedExercise.configuracion?.opciones} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Ordenar') {
      exerciseContent = <OrderingExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} items={selectedExercise.configuracion?.items} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Relacionar') {
      exerciseContent = <MatchingExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} enunciado={selectedExercise.configuracion?.enunciado} pares={selectedExercise.configuracion?.pares} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} resolvePath={resolvePath} submitPath={submitPath} />;
    } else if (normalizedType === 'Diagramas UML') {
      exerciseContent = <UMLDiagramView activity={{ id: String(selectedExercise.id), title: exerciseTitle }} onBack={() => undefined} configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} resolvePath={resolvePath} submitPath={submitPath} feedbackPath={feedbackPath} />;
    } else if (normalizedType === 'Preguntas') {
      exerciseContent = <QuestionnaireExercise activity={{ id: String(selectedExercise.id), title: exerciseTitle }} preguntas={Array.isArray(selectedExercise.configuracion?.preguntas) ? selectedExercise.configuracion?.preguntas : []} onBack={() => undefined} embedded configurableMode configurableResponse={exerciseResponses[String(selectedExercise.id)]} onConfigurableResponseChange={(response: any) => updateExerciseResponse(String(selectedExercise.id), response)} resolvePath={resolvePath} submitPath={submitPath} />;
    } else {
      exerciseContent = <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-sm text-amber-800">El tipo de ejercicio {normalizedType} todavía no está habilitado dentro del miniproyecto configurable.</div>;
    }

    return (
      <article key={selectedExercise.id} className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(58,74,91,0.08)] ${isLargeExercise ? 'md:col-span-2' : ''}`}>
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-semibold text-[#3978E8]">Ejercicio {index + 1}</div>
              <h3 className="mt-4 text-[1.65rem] font-semibold leading-tight text-[#213547]">{exerciseTitle}</h3>
              <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{normalizedType}</div>
              {selectedExercise.descripcion ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{selectedExercise.descripcion}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${approved ? 'bg-emerald-50 text-emerald-700' : hasDraft ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {approved ? 'Correcto' : hasDraft ? 'Respondido' : 'Pendiente'}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{selectedExercise.puntos || 100} pts</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-0">{exerciseContent}</div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F7FAFF_0%,#F5F7FB_48%,#F3F4F6_100%)]">
      <header className="border-b border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-4 py-3 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#14B8E6_0%,#2563EB_100%)] text-sm font-semibold text-white" style={{ width: '32px', height: '32px' }}>MP</div>
            <div className="min-w-0">
              <h1 className="truncate text-[1.05rem] font-semibold leading-5 text-[#223449]">{miniproyecto?.Actividad?.titulo || content.title}</h1>
              <p className="truncate text-sm text-slate-500">Miniproyecto configurado por opciones</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuracion</span>
            </button>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" aria-label="Mas opciones">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-4 py-6 lg:px-5 lg:py-6">
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-gray-500 shadow-sm">Cargando miniproyecto configurable...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-700 shadow-sm">{error}</div>
        ) : (
          <div className="space-y-7">
            <section className="pt-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <article className="rounded-[22px] bg-[linear-gradient(135deg,#3B82F6_0%,#2563EB_100%)] px-6 py-5 text-white shadow-[0_18px_34px_rgba(37,99,235,0.28)]"><div className="flex items-start justify-between gap-4"><div><div className="text-sm font-medium text-white/80">Ejercicios</div><div className="mt-2 text-[2.15rem] font-semibold leading-none">{totalExercises}</div></div><div className="rounded-2xl bg-white/16 p-3"><ClipboardList className="h-5 w-5" /></div></div></article>
                <article className="rounded-[22px] bg-[linear-gradient(135deg,#22C55E_0%,#05B34B_100%)] px-6 py-5 text-white shadow-[0_18px_34px_rgba(5,179,75,0.25)]"><div className="flex items-start justify-between gap-4"><div><div className="text-sm font-medium text-white/80">Completados</div><div className="mt-2 text-[2.15rem] font-semibold leading-none">{correctExercises}/{totalExercises}</div></div><div className="rounded-2xl bg-white/16 p-3"><Target className="h-5 w-5" /></div></div></article>
                <article className="rounded-[22px] bg-[linear-gradient(135deg,#C026D3_0%,#7C3AED_100%)] px-6 py-5 text-white shadow-[0_18px_34px_rgba(124,58,237,0.24)]"><div className="flex items-start justify-between gap-4"><div><div className="text-sm font-medium text-white/80">Precisión</div><div className="mt-2 text-[2.15rem] font-semibold leading-none">{accuracy}%</div></div><div className="rounded-2xl bg-white/16 p-3"><TrendingUp className="h-5 w-5" /></div></div></article>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#C9E2FF] bg-[linear-gradient(180deg,#EEF7FF_0%,#F2FBFF_100%)] px-5 py-6 shadow-[0_16px_36px_rgba(80,140,220,0.12)]">
              <h2 className="text-[1.7rem] font-semibold text-[#213547]">Ruta del miniproyecto</h2>
              <p className="mt-8 text-sm leading-6 text-slate-500">En esta categoría resuelves cada ejercicio y luego estudias el miniproyecto completo como un solo resultado final.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.75fr)]">
                <div className="rounded-[22px] bg-white px-5 py-5 shadow-sm ring-1 ring-slate-100">
                  <div className="text-sm font-semibold text-[#243447]">Descripción del miniproyecto</div>
                  {hasRenderableDescription(miniproyectoDescripcion) ? (
                    <div className="prose prose-sm mt-4 max-w-none text-slate-600 prose-headings:text-[#243447] prose-p:text-slate-600 prose-li:text-slate-600" dangerouslySetInnerHTML={{ __html: miniproyectoDescripcion }} />
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-slate-500">Este miniproyecto no tiene una descripción adicional configurada.</p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="rounded-[22px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Nivel</div><div className="mt-2 text-base font-semibold text-[#243447]">{miniproyectoNivel || 'No definido'}</div></div>
                  <div className="rounded-[22px] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Entregable esperado</div><div className="mt-2 text-sm leading-6 text-slate-600">{miniproyectoEntregable || 'No se definió un entregable para este miniproyecto.'}</div></div>
                </div>
              </div>
              <div className="mt-9 rounded-[22px] bg-white px-4 py-5 shadow-sm ring-1 ring-slate-100">
                <div className="text-sm font-semibold text-[#243447]">Resumen global</div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-2xl px-2 py-1"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><div><div className="text-xs text-slate-400">Correctas</div><div className="text-[1.65rem] font-semibold leading-none text-emerald-600">{correctExercises}/{totalExercises}</div></div></div>
                  <div className="flex items-center gap-3 rounded-2xl px-2 py-1"><Circle className="h-5 w-5 text-[#4A90E2]" /><div><div className="text-xs text-slate-400">Respondidas</div><div className="text-[1.65rem] font-semibold leading-none text-[#3779F1]">{answeredExercises}/{totalExercises}</div></div></div>
                  <div className="flex items-center gap-3 rounded-2xl px-2 py-1"><Circle className="h-5 w-5 text-rose-500" /><div><div className="text-xs text-slate-400">Incorrectas</div><div className="text-[1.65rem] font-semibold leading-none text-rose-500">{incorrectExercises}</div></div></div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#3B82F6_0%,#2F74E8_100%)] px-4 py-3 text-sm font-medium text-white shadow-sm">Nota: El miniproyecto se evaluará en un solo resultado final. {readyToEvaluate ? 'Ya puedes usar el botón principal de evaluación.' : `Todavía faltan ${Math.max(totalExercises - answeredExercises, 0)} ejercicios por responder.`}</div>
            </section>

            {showChatbot ? (
              <section className="space-y-4">
                <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(135deg,#F2F8FF_0%,#F8FCFF_100%)] px-5 py-4 text-sm leading-6 text-slate-600 shadow-sm"><span className="font-semibold text-[#1F3A5F]">Apóyate del chatbot</span> para entender el contexto del caso, aclarar dudas del cliente simulado y resolver mejor los ejercicios del miniproyecto.</div>
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_34px_rgba(58,74,91,0.08)]">
                  <MiniproyectoChatbotPanel chatbotType="MINIPROYECTO" areaId={miniproyecto?.Area?.id || content.areaId || null} miniproyectoId={miniproyecto?.id || content.id} title="Petitbot" subtitle="Chatbot configurado para este miniproyecto" contextLabel={miniproyecto?.Actividad?.titulo || content.title} />
                </div>
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {exercises.map((exercise, index) => renderExerciseCard(exercise, index))}
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white px-6 py-6 shadow-[0_16px_34px_rgba(58,74,91,0.08)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-[1.65rem] font-semibold text-[#213547]">Evaluación del miniproyecto</h3>
                  <p className="mt-2 text-sm text-slate-500">Cuando hayas resuelto todos los ejercicios, usa este botón para evaluar tu solución del proyecto.</p>
                </div>
                <button onClick={handleEvaluateMiniproyecto} disabled={!readyToEvaluate || isEvaluating || isCompleted} className="inline-flex items-center justify-center rounded-full border-2 border-[#3779F1] px-5 py-2.5 text-sm font-semibold text-[#3779F1] transition-colors hover:bg-[#EFF5FF] disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                  {isCompleted ? 'Miniproyecto evaluado' : isEvaluating ? 'Evaluando...' : 'Evaluar miniproyecto'}
                </button>
              </div>
              <div className="mt-8">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-500"><span>Progreso</span><span className="font-semibold text-[#111827]">{correctExercises}/{totalExercises} completado</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0F172A_0%,#111827_45%,#334155_100%)] transition-all duration-300" style={{ width: `${completionProgress}%` }} /></div>
                {typeof progressSummary?.retroalimentacionGeneral === 'string' && progressSummary.retroalimentacionGeneral.trim() ? <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{progressSummary.retroalimentacionGeneral}</div> : null}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}