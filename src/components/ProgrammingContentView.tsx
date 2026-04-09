import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Trash2, XCircle } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { toast } from 'sonner';
import { executeExercise, submitExercise } from '../utils/submitExercise';
import { API_BASE_URL } from '../utils/constants';

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
  isMiniproyecto?: boolean;
  actividadId?: number;
}

interface ProgrammingContentViewProps {
  content: Content;
  onBack: () => void;
  embedded?: boolean;
}

interface MetodoConfiguracion {
  nombre?: string;
  retorno?: string;
  parametros?: Array<{ nombre: string; tipo: string }>;
  plantilla?: string;
}

interface CasoPruebaConfigurado {
  inputs?: string;
  output?: string;
}

interface Ejercicio {
  id: number;
  contenido_id: number;
  puntos: number;
  resultado_ejercicio: string;
  codigoEstructura?: string;
  tipo_ejercicio: string;
  configuracion?: {
    tipo?: string;
    lenguajesPermitidos?: number[];
    sintaxis?: string[];
    metodo?: MetodoConfiguracion;
    casos_prueba?: CasoPruebaConfigurado[];
  };
  actividad?: {
    titulo: string;
    descripcion?: string;
    nivel_dificultad?: string;
  };
}

interface CasoPruebaResultado {
  caseNum: number;
  paso?: boolean;
  error?: string | null;
  omitido?: boolean;
  outputEsperado?: string;
  outputObtenido?: string;
  statusDescription?: string;
}

type ResultMode = 'idle' | 'execution' | 'evaluation';

function getCaseVisualState(caso: CasoPruebaResultado) {
  if (caso.statusDescription && /accepted/i.test(caso.statusDescription)) {
    return {
      label: 'Ejecutado',
      icon: CheckCircle2,
      cardClass: 'border-sky-200 bg-sky-50',
      iconClass: 'text-sky-600',
      badgeClass: 'bg-sky-100 text-sky-700'
    };
  }

  if (caso.omitido) {
    return {
      label: 'Omitido',
      icon: AlertCircle,
      cardClass: 'border-amber-200 bg-amber-50',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700'
    };
  }

  if (caso.paso) {
    return {
      label: 'Superado',
      icon: CheckCircle2,
      cardClass: 'border-emerald-200 bg-emerald-50',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700'
    };
  }

  return {
    label: 'Fallo',
    icon: XCircle,
    cardClass: 'border-rose-200 bg-rose-50',
    iconClass: 'text-rose-600',
    badgeClass: 'bg-rose-100 text-rose-700'
  };
}

function getCaseMessage(caso: CasoPruebaResultado) {
  if (caso.statusDescription && !caso.paso && !caso.error && caso.outputObtenido) {
    return `Salida obtenida: ${caso.outputObtenido}`;
  }

  if (caso.omitido) {
    return caso.error || 'La revisión se detuvo antes de ejecutar este caso.';
  }

  if (caso.paso) {
    return 'La solución cumplió correctamente con este caso.';
  }

  return caso.error || 'La solución no produjo el resultado esperado para este caso.';
}

function stripMarkdownCodeFences(value: string) {
  const text = (value || '').trim();
  if (!text) return '';

  return text
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function buildMethodSignature(metodo?: MetodoConfiguracion) {
  if (!metodo?.nombre) {
    return 'public static void resolver()';
  }

  const retorno = metodo.retorno || 'void';
  const parametros = Array.isArray(metodo.parametros)
    ? metodo.parametros.map((param) => `${param.tipo} ${param.nombre}`).join(', ')
    : '';

  return `public static ${retorno} ${metodo.nombre}(${parametros})`;
}

function normalizeCaseValue(value?: string) {
  const normalized = (value || '').trim();
  return normalized || 'Sin datos';
}

export function ProgrammingContentView({ content, onBack, embedded = false }: ProgrammingContentViewProps) {
  const subjectColor = '#4A90E2';

  const [code, setCode] = useState('public static int resolver() {\n    // Escribe tu solución aquí\n    return 0;\n}');
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [puntos, setPuntos] = useState<number | null>(null);
  const [casosPruebaResultados, setCasosPruebaResultados] = useState<CasoPruebaResultado[]>([]);
  const [resultMode, setResultMode] = useState<ResultMode>('idle');

  const metodo = ejercicio?.configuracion?.metodo;
  const methodSignature = buildMethodSignature(metodo);
  const difficultyLabel = ejercicio?.actividad?.nivel_dificultad;
  const configuredCases = Array.isArray(ejercicio?.configuracion?.casos_prueba)
    ? ejercicio?.configuracion?.casos_prueba
    : [];

  useEffect(() => {
    const cargarEjercicio = async () => {
      setIsLoadingExercise(true);
      try {
        const response = await fetch(`${API_BASE_URL}/ejercicios?contenido_id=${content.id}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const ejercicioMasReciente = data[0];
          setEjercicio(ejercicioMasReciente);
          setCode(
            stripMarkdownCodeFences(
              ejercicioMasReciente.codigoEstructura
              || ejercicioMasReciente.configuracion?.metodo?.plantilla
              || ''
            ) || 'public static int resolver() {\n    // Escribe tu solución aquí\n    return 0;\n}'
          );
        }
      } catch (error) {
        console.error('Error al cargar ejercicio:', error);
      } finally {
        setIsLoadingExercise(false);
      }
    };

    cargarEjercicio();
  }, [content.id, API_BASE_URL]);

  const handleClear = () => {
    setCode(
      stripMarkdownCodeFences(
        ejercicio?.codigoEstructura || ejercicio?.configuracion?.metodo?.plantilla || ''
      ) || 'public static int resolver() {\n    // Escribe tu solución aquí\n    return 0;\n}'
    );
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('idle');
  };

  const handleExecute = async () => {
    if (!ejercicio) {
      toast.error('Ejercicio no disponible', { description: 'No se ha cargado el ejercicio.' });
      return;
    }

    setIsRunning(true);
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('execution');

    const result = await executeExercise(ejercicio.id, { texto: code });
    const data: any = result.data || {};

    if (result.status === 200) {
      setCasosPruebaResultados(Array.isArray(data?.casos) ? data.casos : []);
      setFeedback(data?.resumen || 'La ejecución finalizó correctamente.');
      toast.success('Ejecución completada', { description: 'Se mostraron los resultados sin calificar.' });
      setIsRunning(false);
      return;
    }

    setFeedback(data?.message || result.message || 'No fue posible ejecutar la solución.');
    setCasosPruebaResultados(Array.isArray(data?.casos) ? data.casos : []);
    toast.error('Error al ejecutar', { description: data?.message || result.message || 'No fue posible ejecutar la solución.' });
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!ejercicio) {
      toast.error('Ejercicio no disponible', { description: 'No se ha cargado el ejercicio.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('evaluation');

    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      toast.error('Sesión inválida', { description: 'No se encontró el ID del estudiante. Inicia sesión.' });
      setIsSubmitting(false);
      return;
    }

    const result = await submitExercise(ejercicio.id, { texto: code }, estudianteId);
    const data: any = result.data || {};

    if (result.status === 429) {
      toast.warning('Evaluación en curso', { description: result.message || 'Intenta nuevamente en unos segundos.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 409) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || result.message || 'Ya tienes este ejercicio aprobado.');
      if (Array.isArray(data?.casosPrueba)) {
        setCasosPruebaResultados(data.casosPrueba);
      }
      toast.info('Ejercicio ya aprobado', { description: result.message || 'Ya tienes este ejercicio aprobado.' });
      setIsSubmitting(false);
      return;
    }

    if (Array.isArray(data?.casosPrueba)) {
      setCasosPruebaResultados(data.casosPrueba);
    }

    if (result.status === 400) {
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solución no superó la validación.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(false);
      toast.error(data?.resultado || 'No cumple', { description: data?.resumen || 'La solución no superó la validación.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 200) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solución aprobó todos los casos.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      toast.success(data?.resultado || 'Cumple', { description: data?.resumen || 'La solución aprobó todos los casos.' });
      setIsSubmitting(false);
      return;
    }

    setFeedback(data?.message || result.message || 'No fue posible evaluar la solución.');
    toast.error('Error técnico', { description: data?.message || result.message || 'Error desconocido.' });
    setIsSubmitting(false);
  };

  return (
    <div className={embedded ? 'w-full min-w-0' : 'overflow-hidden rounded-2xl border border-gray-200 bg-[#F2F2F2]'}>
      {!embedded && (
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-full px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
                  <img src={logoImage} alt="EduPath" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-bold text-[#3A4A5B]">Fundamentos de Programación</h1>
                  <p className="truncate text-sm text-gray-500">{content.title}</p>
                </div>
              </div>

              <div className="rounded-lg px-4 py-2 font-mono text-sm shadow-sm" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                Java
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="grid grid-cols-1 gap-6 p-4 lg:p-6 xl:grid-cols-[minmax(360px,40%)_minmax(0,60%)]">
        <div className="min-w-0 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto xl:pr-2">
          <div className="space-y-5">
            {!embedded && (
              <button onClick={onBack} className="mb-2 flex items-center gap-2 text-gray-600 transition-colors hover:text-[#3A4A5B]">
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-tight text-[#3A4A5B]">{ejercicio?.actividad?.titulo || content.title}</h2>
                  {difficultyLabel && (
                    <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      Dificultad: {difficultyLabel}
                    </div>
                  )}
                </div>
                <div className="rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: `${subjectColor}14`, color: subjectColor }}>
                  {ejercicio?.puntos ? `${ejercicio.puntos} puntos` : 'Ejercicio de código'}
                </div>
              </div>

              <p className="text-[15px] leading-7 text-gray-700">
                {ejercicio?.actividad?.descripcion || 'Sin descripción disponible.'}
              </p>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 shadow-sm">
              <h3 className="mb-3 text-base font-bold text-[#3A4A5B]">Instrucciones</h3>
              <div className="space-y-3 text-sm leading-6 text-gray-700">
                <p>Implementa únicamente la lógica dentro del método proporcionado.</p>
                <p>No modifiques el nombre del método ni sus parámetros.</p>
                <p>No escribas el método main.</p>
                <p>Antes de enviar, revisa los casos de prueba visibles para entender cómo será evaluada tu solución.</p>
                <p>Usa Ejecutar para probar y Enviar para calificar tu solución.</p>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-[#3A4A5B]">Firma del método</h3>
              <div className="rounded-xl bg-slate-950 px-4 py-4 font-mono text-sm text-slate-100 shadow-inner">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-cyan-300">Java</div>
                <pre className="whitespace-pre-wrap break-words">{methodSignature}</pre>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-[#3A4A5B]">Casos de prueba</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {configuredCases.length || 0} casos
              </span>
            </div>

            {configuredCases.length === 0 ? (
              <p className="text-sm text-gray-500">No hay casos de prueba visibles para este ejercicio.</p>
            ) : (
              <div className="grid gap-3">
                {configuredCases.map((caseItem, index) => (
                  <div key={`${index}-${caseItem.inputs || ''}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-slate-800">Caso {index + 1}</div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entrada</div>
                        <pre className="rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200 whitespace-pre-wrap break-words">{normalizeCaseValue(caseItem.inputs)}</pre>
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salida esperada</div>
                        <pre className="rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200 whitespace-pre-wrap break-words">{normalizeCaseValue(caseItem.output)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </section>
          </div>
        </div>

        <section className="min-w-0 self-start overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm ring-1 ring-blue-100/60 xl:sticky xl:top-4">
            <div className="flex flex-col gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg px-4 py-2 font-mono text-sm shadow-sm ring-1 ring-blue-200" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                  Editor Java
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Restaurar plantilla
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isRunning || isSubmitting || isLoadingExercise}
                  className="flex items-center gap-2 rounded-lg border-2 border-blue-200 bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isRunning ? 'Ejecutando...' : 'Ejecutar'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRunning || aprobado || isLoadingExercise}
                  className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: (isSubmitting || isRunning || aprobado || isLoadingExercise) ? '#94a3b8' : subjectColor }}
                  title={aprobado ? 'Ejercicio ya aprobado' : 'Enviar y evaluar'}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="bg-slate-950 min-h-[460px] overflow-auto p-4 lg:h-[calc(100vh-26rem)] xl:min-h-[540px]">
                <div className="flex min-h-full">
                  <div className="mr-4 shrink-0 border-r border-slate-700 pr-4 text-right font-mono text-sm text-slate-500 select-none">
                    {code.split('\n').map((_, index) => <div key={index}>{index + 1}</div>)}
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="min-h-full w-full flex-1 resize-none bg-transparent font-mono text-sm leading-6 text-slate-100 outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Resultado</h3>
                  {puntos !== null && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Puntos: {puntos}
                    </span>
                  )}
                </div>

                {feedback && (
                  <div className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${aprobado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    {feedback}
                  </div>
                )}

                {isLoadingExercise ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Cargando ejercicio...
                  </div>
                ) : casosPruebaResultados.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    {resultMode === 'execution'
                      ? 'Ejecuta tu solución para ver la salida obtenida en cada caso.'
                      : 'Envía tu solución para ver el estado de cada caso de prueba.'}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {casosPruebaResultados.map((casoResultado) => {
                      const visualState = getCaseVisualState(casoResultado);
                      const StateIcon = visualState.icon;

                      return (
                        <div key={casoResultado.caseNum} className={`rounded-xl border p-4 ${visualState.cardClass}`}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <StateIcon className={`h-4 w-4 ${visualState.iconClass}`} />
                              Caso {casoResultado.caseNum}
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${visualState.badgeClass}`}>
                              {visualState.label}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">{getCaseMessage(casoResultado)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
        </section>
      </div>
    </div>
  );
}
