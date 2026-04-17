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
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  exerciseId?: number;
  exerciseData?: Ejercicio | null;
  executePath?: string;
  submitPath?: string;
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
  outputObtenido?: string;
  statusDescription?: string;
}

type ResultMode = 'idle' | 'execution' | 'evaluation';

const DEFAULT_TEMPLATE = 'public static int resolver() {\n    // Escribe tu solucion aqui\n    return 0;\n}';
const COMPILER_WRAPPER_LINE_OFFSET = 6;
const EDITOR_BASE_VISIBLE_LINES = 15;

function stripMarkdownCodeFences(value: string) {
  const text = (value || '').trim();
  if (!text) return '';
  return text.replace(/^```[a-zA-Z0-9_-]*\s*/i, '').replace(/\s*```$/, '').trim();
}

function getInitialTemplate(ejercicio?: Ejercicio | null) {
  return stripMarkdownCodeFences(
    ejercicio?.codigoEstructura || ejercicio?.configuracion?.metodo?.plantilla || ''
  ) || DEFAULT_TEMPLATE;
}

function buildMethodSignature(metodo?: MetodoConfiguracion) {
  if (!metodo?.nombre) return 'public static void resolver()';
  const retorno = metodo.retorno || 'void';
  const parametros = Array.isArray(metodo.parametros)
    ? metodo.parametros.map((p) => `${p.tipo} ${p.nombre}`).join(', ')
    : '';
  return `public static ${retorno} ${metodo.nombre}(${parametros})`;
}

function buildMethodPreview(metodo?: MetodoConfiguracion) {
  const signature = buildMethodSignature(metodo);
  return [
    'public class Solution {',
    `    ${signature} {`,
    '        // Implementa tu solucion aqui',
    '    }',
    '}'
  ].join('\n');
}

function normalizeCaseValue(value?: string) {
  const normalized = (value || '').trim();
  return normalized || 'Sin datos';
}

function normalizeCompilerLineNumber(rawLine: number, editorLineCount: number) {
  const adjustedLine = rawLine - COMPILER_WRAPPER_LINE_OFFSET;
  if (adjustedLine < 1) return 1;
  if (editorLineCount > 0 && adjustedLine > editorLineCount) return editorLineCount;
  return adjustedLine;
}

function normalizeCompilerMessage(message: string | undefined | null, editorCode: string) {
  if (!message) return '';
  const editorLineCount = editorCode.split('\n').length;

  return message
    .replace(/Main\.java:(\d+)/gi, (_, rawLine) => {
      const normalized = normalizeCompilerLineNumber(Number(rawLine), editorLineCount);
      return `Tu codigo: linea ${normalized}`;
    })
    .replace(/line\s+(\d+)/gi, (_, rawLine) => {
      const normalized = normalizeCompilerLineNumber(Number(rawLine), editorLineCount);
      return `linea ${normalized}`;
    });
}

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
  if (caso.omitido) return caso.error || 'La revision se detuvo antes de ejecutar este caso.';
  if (caso.paso) return 'La solucion cumplio correctamente con este caso.';
  return caso.error || 'La solucion no produjo el resultado esperado para este caso.';
}

function getCaseAccent(_index: number) {
  return {
    badge: 'border border-blue-200 bg-blue-100 text-blue-700',
    card: 'border-blue-200 bg-blue-50/35',
    dot: '#3B82F6'
  };
}

function formatJavaLikeCode(input: string) {
  const lines = input.split('\n');
  let indentLevel = 0;

  return lines
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return '';

      const leadingClosers = (trimmed.match(/^\}+/) || [''])[0].length;
      indentLevel = Math.max(0, indentLevel - leadingClosers);

      const formattedLine = `${'    '.repeat(indentLevel)}${trimmed}`;

      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      indentLevel = Math.max(0, indentLevel + openBraces - closeBraces + leadingClosers);

      return formattedLine;
    })
    .join('\n');
}

export function ProgrammingContentView({ content, onBack, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, exerciseId, exerciseData = null, executePath, submitPath }: ProgrammingContentViewProps) {
  const subjectColor = '#4A90E2';
  const wrapperClassName = embedded ? 'w-full min-w-0 lg:h-full' : 'overflow-hidden rounded-[2rem] bg-[#F2F2F2]';
  const workspaceClassName = embedded
    ? 'grid grid-cols-1 gap-5 lg:h-full'
    : 'grid grid-cols-1 gap-5 p-4 lg:min-h-[calc(100vh-8.5rem)] lg:p-6';
  const cardClass = 'min-w-0 rounded-[1.6rem] border border-slate-200/85 bg-white p-5 shadow-[0_14px_32px_rgba(58,74,91,0.08)]';
  const sectionLabelClass = 'mb-1 inline-flex border-l-2 border-[#4A90E2] pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500';

  const guideItems = [
    'Implementa unicamente la logica dentro del metodo proporcionado.',
    'No modifiques el nombre del metodo ni sus parametros.',
    'No escribas el metodo main.',
    'Revisa los casos visibles antes de enviar para entender como sera evaluada tu solucion.',
    'Usa Ejecutar para probar y Enviar para calificar tu solucion.'
  ];

  const [code, setCode] = useState(DEFAULT_TEMPLATE);
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [puntos, setPuntos] = useState<number | null>(null);
  const [casosPruebaResultados, setCasosPruebaResultados] = useState<CasoPruebaResultado[]>([]);
  const [resultMode, setResultMode] = useState<ResultMode>('idle');

  const methodPreview = buildMethodPreview(ejercicio?.configuracion?.metodo);
  const configuredCases = Array.isArray(ejercicio?.configuracion?.casos_prueba)
    ? ejercicio.configuracion.casos_prueba
    : [];
  const normalizedFeedback = normalizeCompilerMessage(feedback, code);
  const editorLines = code.split('\n');
  const visibleEditorLineCount = Math.max(EDITOR_BASE_VISIBLE_LINES, editorLines.length);

  useEffect(() => {
    if (exerciseData) {
      setEjercicio(exerciseData);
      setCode(getInitialTemplate(exerciseData));
      setIsLoadingExercise(false);
      return;
    }

    const cargarEjercicio = async () => {
      setIsLoadingExercise(true);
      try {
        const response = await fetch(
          exerciseId
            ? `${API_BASE_URL}/ejercicios/${exerciseId}`
            : `${API_BASE_URL}/ejercicios?contenido_id=${content.id}`
        );
        const data = await response.json();
        const ejercicioCargado = Array.isArray(data) ? data[0] : data;
        if (ejercicioCargado) {
          setEjercicio(ejercicioCargado);
          setCode(getInitialTemplate(ejercicioCargado));
        } else {
          setCode(DEFAULT_TEMPLATE);
        }
      } catch (error) {
        console.error('Error al cargar ejercicio:', error);
      } finally {
        setIsLoadingExercise(false);
      }
    };

    cargarEjercicio();
  }, [content.id, exerciseData, exerciseId]);

  useEffect(() => {
    const nextCode = (configurableResponse?.codigo || '').toString();
    if (!configurableMode || !nextCode) return;
    setCode((currentCode) => currentCode === nextCode ? currentCode : nextCode);
  }, [configurableMode, configurableResponse?.codigo]);

  useEffect(() => {
    if (!configurableMode || !onConfigurableResponseChange) return;
    onConfigurableResponseChange({ codigo: code, respuesta: { texto: code }, lenguaje_id: 62 });
  }, [code, configurableMode, onConfigurableResponseChange]);

  const clearResults = () => {
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('idle');
    setAprobado(false);
  };

  const handleClear = () => {
    setCode(getInitialTemplate(ejercicio));
    clearResults();
  };

  const handleFormatCode = () => {
    setCode((previousCode) => formatJavaLikeCode(previousCode));
    toast.success('Codigo formateado', { description: 'Se aplico indentacion automatica en el editor.' });
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

    const result = await executeExercise(ejercicio.id, code, 62, executePath);
    const data: any = result.data || {};

    if (result.status === 200) {
      setCasosPruebaResultados(Array.isArray(data?.casos) ? data.casos : []);
      setFeedback(data?.resumen || 'La ejecucion finalizo correctamente.');
      toast.success('Ejecucion completada', { description: 'Se mostraron resultados sin calificar.' });
      setIsRunning(false);
      return;
    }

    setFeedback(data?.message || result.message || 'No fue posible ejecutar la solucion.');
    setCasosPruebaResultados(Array.isArray(data?.casos) ? data.casos : []);
    toast.error('Error al ejecutar', { description: data?.message || result.message || 'No fue posible ejecutar la solucion.' });
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
      toast.error('Sesion invalida', { description: 'No se encontro el ID del estudiante. Inicia sesion.' });
      setIsSubmitting(false);
      return;
    }

    const result = await submitExercise(ejercicio.id, { texto: code }, estudianteId, submitPath, executePath ? { codigo: code } : undefined);
    const data: any = result.data || {};

    if (result.status === 429) {
      toast.warning('Evaluacion en curso', { description: result.message || 'Intenta nuevamente en unos segundos.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 409) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || result.message || 'Ya tienes este ejercicio aprobado.');
      if (Array.isArray(data?.casosPrueba)) setCasosPruebaResultados(data.casosPrueba);
      toast.info('Ejercicio ya aprobado', { description: result.message || 'Ya tienes este ejercicio aprobado.' });
      setIsSubmitting(false);
      return;
    }

    if (Array.isArray(data?.casosPrueba)) setCasosPruebaResultados(data.casosPrueba);

    if (result.status === 400) {
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solucion no supero la validacion.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(false);
      toast.error(data?.resultado || 'No cumple', { description: data?.resumen || 'La solucion no supero la validacion.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 200) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solucion aprobo todos los casos.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      toast.success(data?.resultado || 'Cumple', { description: data?.resumen || 'La solucion aprobo todos los casos.' });
      setIsSubmitting(false);
      return;
    }

    setFeedback(data?.message || result.message || 'No fue posible evaluar la solucion.');
    toast.error('Error tecnico', { description: data?.message || result.message || 'Error desconocido.' });
    setIsSubmitting(false);
  };

  return (
    <div className={wrapperClassName}>
      {!embedded && (
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-full px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
                  <img src={logoImage} alt="EduPath" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-bold text-[#3A4A5B]">Fundamentos de Programacion</h1>
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

      <div className={workspaceClassName}>
        {!embedded && (
          <button onClick={onBack} className="mb-1 flex items-center gap-2 text-gray-600 transition-colors hover:text-[#3A4A5B]">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
        )}

        <section className={`${cardClass} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7]" />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <div className="mb-3 border-b border-slate-100 pb-3">
                <span className={sectionLabelClass}>Ejercicio</span>
                <h2 className="max-w-[32rem] text-[1.55rem] font-bold leading-tight text-[#3A4A5B]">{ejercicio?.actividad?.titulo || content.title}</h2>
              </div>
            </div>
            <div className="justify-self-start md:justify-self-end">
              <div className="inline-flex rounded-full px-4 py-2 text-sm font-semibold shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.14) 100%)', color: subjectColor }}>
                {ejercicio?.puntos ? `${ejercicio.puntos} puntos` : 'Ejercicio de codigo'}
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-4 text-[14px] leading-6 text-gray-600">{ejercicio?.actividad?.descripcion || 'Sin descripcion disponible.'}</p>
        </section>

        <section className="grid grid-cols-2 gap-5">
          <div className={`${cardClass} relative flex min-w-0 flex-col overflow-hidden`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4A90E2]/25 via-transparent to-[#7ED6A7]/25" />
            <div className="mb-4 border-b border-slate-100 pb-3">
              <span className={sectionLabelClass}>Guia</span>
              <h3 className="text-[1.1rem] font-bold text-[#3A4A5B]">Instrucciones</h3>
            </div>
            <ul className="space-y-3 text-sm leading-7 text-gray-700">
              {guideItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#4A90E2]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${cardClass} relative flex min-w-0 flex-col overflow-hidden`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4A90E2]/25 via-transparent to-[#7ED6A7]/25" />
            <div className="mb-4 border-b border-slate-100 pb-3">
              <span className={sectionLabelClass}>Metodo</span>
              <h3 className="text-[1.1rem] font-bold text-[#3A4A5B]">Firma del metodo</h3>
            </div>
            <div className="flex-1 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Java</div>
              </div>
              <div className="flex min-h-full py-4 font-mono text-sm">
                <div className="shrink-0 border-r border-slate-200 px-3 text-right text-slate-400 select-none">
                  {methodPreview.split('\n').map((_, index) => <div key={index} className="leading-7">{index + 1}</div>)}
                </div>
                <div className="min-w-0 flex-1 px-4 text-slate-700">
                  <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-400">Vista previa</div>
                  <pre className="whitespace-pre-wrap break-words leading-7 text-slate-700">{methodPreview}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${cardClass} lg:max-h-[34vh] lg:overflow-y-auto`}>
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className={sectionLabelClass}>Validacion</span>
              <h3 className="text-lg font-bold text-[#3A4A5B]">Casos de prueba</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{configuredCases.length} casos</span>
          </div>

          {configuredCases.length === 0 ? (
            <p className="text-sm text-gray-500">No hay casos de prueba visibles para este ejercicio.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {configuredCases.map((item, index) => (
                <div key={`${index}-${item.inputs || ''}`} className={`min-w-[300px] flex-1 rounded-[1.25rem] border p-4 ${getCaseAccent(index).card}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getCaseAccent(index).badge}`}>Caso {index + 1}</div>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getCaseAccent(index).dot }} />
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entrada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{normalizeCaseValue(item.inputs)}</pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salida esperada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{normalizeCaseValue(item.output)}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(58,74,91,0.10)] lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(90deg,rgba(74,144,226,0.07)_0%,rgba(255,255,255,1)_42%,rgba(126,214,167,0.07)_100%)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl px-4 py-2 font-mono text-sm shadow-sm ring-1 ring-blue-100" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.10) 100%)', color: subjectColor }}>
              Editor Java
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <Trash2 className="h-4 w-4" />
                Restaurar plantilla
              </button>
              <button
                onClick={handleFormatCode}
                disabled={isRunning || isSubmitting || isLoadingExercise}
                className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dar formato
              </button>
              <button
                onClick={handleExecute}
                disabled={isRunning || isSubmitting || isLoadingExercise}
                className="flex items-center gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:from-blue-100 hover:to-cyan-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRunning ? 'Ejecutando...' : 'Ejecutar'}
              </button>
              {configurableMode ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                  La solución actual se evaluará con el botón principal del miniproyecto.
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRunning || aprobado || isLoadingExercise}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: isSubmitting || isRunning || aprobado || isLoadingExercise ? '#94a3b8' : 'linear-gradient(135deg, #4A90E2 0%, #5B9FED 55%, #7ED6A7 100%)' }}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:min-h-0 lg:flex-1">
            <div className="min-h-[920px] w-full overflow-auto bg-slate-950 p-6 lg:min-h-[78vh] lg:flex-1" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(74,144,226,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(126,214,167,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,1) 100%)' }}>
              <div className="flex min-h-full w-full">
                <div className="mr-5 shrink-0 border-r border-slate-700/90 pr-4 text-right font-mono text-sm text-slate-400 select-none">
                  {Array.from({ length: visibleEditorLineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={EDITOR_BASE_VISIBLE_LINES}
                  className="min-h-full w-full flex-1 resize-none bg-transparent font-mono text-[15px] leading-7 text-white outline-none"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white p-5 lg:max-h-[260px] lg:overflow-y-auto">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Resultado</h3>
                {puntos !== null && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Puntos: {puntos}</span>}
              </div>

              {normalizedFeedback && (
                <div className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${aprobado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  {normalizedFeedback}
                </div>
              )}

              {isLoadingExercise ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Cargando ejercicio...</div>
              ) : casosPruebaResultados.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {resultMode === 'execution' ? 'Ejecuta tu solucion para ver la salida por caso.' : 'Envia tu solucion para ver el estado de cada caso.'}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {casosPruebaResultados.map((caso) => {
                    const visual = getCaseVisualState(caso);
                    const Icon = visual.icon;
                    return (
                      <div key={caso.caseNum} className={`rounded-xl border p-4 ${visual.cardClass}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Icon className={`h-4 w-4 ${visual.iconClass}`} />
                            Caso {caso.caseNum}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${visual.badgeClass}`}>{visual.label}</span>
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{getCaseMessage(caso)}</p>
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
