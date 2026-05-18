import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Trash2, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { submitMiniproyecto } from '../utils/submitMiniproyecto';
import { API_BASE_URL } from '../utils/constants';
import { CONSOLA_IO_SOURCE } from '../utils/consolaIOSource';
import { mergeMvcFiles } from '../utils/mergeMvcFiles';
import { JavaEditor } from './JavaEditor';


function buildDefaultModelo(nombreModelo: string) {
  return `public class ${nombreModelo} {

    private ConsolaIO consola;

    public ${nombreModelo}(ConsolaIO consola) {
        this.consola = consola;
    }

    // TODO: implementa los métodos del modelo aquí
}`;
}

function buildDefaultMain(nombreModelo: string) {
  return `public class Main {

    public static void main(String[] args) {
        ConsolaIO consola = new ConsolaIO();
        ${nombreModelo} modelo = new ${nombreModelo}(consola);
        // TODO: llama los métodos del modelo aquí
    }
}`;
}

type TabId = 'main' | 'modelo' | 'consolaIO';

interface Tab {
  id: TabId;
  label: string;
  readOnly: boolean;
}

interface ProgrammingMiniproyectoViewProps {
  content: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

interface CasoPrueba {
  inputs?: string;
  output?: string;
}

interface CasoPruebaResultado {
  caseNum: number;
  paso?: boolean;
  error?: string | null;
  omitido?: boolean;
  outputObtenido?: string;
  stdout?: string;
  statusDescription?: string;
}

type ResultMode = 'idle' | 'execution' | 'evaluation';

function getCaseVisualState(caso: CasoPruebaResultado) {
  if (caso.omitido) return {
    label: 'Omitido', icon: AlertCircle, iconClass: 'text-amber-500',
    cardClass: 'border-amber-200 bg-amber-50/40', badgeClass: 'bg-amber-100 text-amber-700'
  };
  if (caso.paso) return {
    label: 'Correcto', icon: CheckCircle2, iconClass: 'text-emerald-600',
    cardClass: 'border-emerald-200 bg-emerald-50/40', badgeClass: 'bg-emerald-100 text-emerald-700'
  };
  return {
    label: 'Incorrecto', icon: XCircle, iconClass: 'text-rose-600',
    cardClass: 'border-rose-200 bg-rose-50/40', badgeClass: 'bg-rose-100 text-rose-700'
  };
}

function getCaseResultMessage(caso: CasoPruebaResultado) {
  if (caso.omitido) return 'La revisión se detuvo — un caso anterior no cumplió.';
  if (caso.paso) return 'La solución cumplió correctamente con este caso.';
  if (caso.outputObtenido || caso.stdout) return 'La salida obtenida no coincide con el resultado esperado.';
  return caso.error || 'La solución no produjo el resultado esperado para este caso.';
}

interface MiniproyectoConfig {
  tipo?: string;
  esperado?: string;
  sintaxis?: string[];
  lenguajesPermitidos?: number[];
  nombreModelo?: string;
  templateMain?: string;
  templateModelo?: string;
  // Campos legacy — ejercicios creados antes de que MVC fuera el estándar
  metodo?: unknown;
  casos_prueba?: CasoPrueba[];
}

interface MiniproyectoApiResponse {
  id: number;
  respuesta_miniproyecto?: string;
  Actividad?: {
    titulo?: string;
    descripcion?: string;
    nivel_dificultad?: string;
  };
}

export function ProgrammingMiniproyectoView({ content, onBack }: ProgrammingMiniproyectoViewProps) {
  const subjectColor = '#4A90E2';

  const [config, setConfig] = useState<MiniproyectoConfig | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [nivel, setNivel] = useState('Basica');
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const nombreModelo = config?.nombreModelo || 'SeguridadBancaria';
  // MVC is the standard for all programming miniproyectos.
  // Usar modo legacy de archivo único solo cuando el ejercicio lo indique explícitamente
  // `metodo` field (exercises created before MVC became the standard).
  const isMvc = !config?.metodo;

  const tabs: Tab[] = isMvc
    ? [
        { id: 'main', label: 'Main.java', readOnly: false },
        { id: 'modelo', label: `${nombreModelo}.java`, readOnly: false },
        { id: 'consolaIO', label: 'ConsolaIO.java', readOnly: true }
      ]
    : [];

  const [activeTab, setActiveTab] = useState<TabId>('main');
  const [mainCode, setMainCode] = useState('');
  const [modeloCode, setModeloCode] = useState('');

  const [singleCode, setSingleCode] = useState('# Código inicial\nprint("Hola Mundo")');
  const [lenguajeSeleccionado, setLenguajeSeleccionado] = useState<number>(71);

  const [isLoading, setIsLoading] = useState(false);   // enviar (evaluación)
  const [isRunning, setIsRunning] = useState(false);   // ejecutar (prueba libre)
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [puntos, setPuntos] = useState<number | null>(null);
  const [casosPruebaResultados, setCasosPruebaResultados] = useState<CasoPruebaResultado[]>([]);
  const [resultMode, setResultMode] = useState<ResultMode>('idle');
  const [mvcStdin, setMvcStdin] = useState('');

  const lenguajesDisponibles = [
    { id: 62, nombre: 'Java', extension: '.java', ejemplo: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola Mundo");\n  }\n}' },
    { id: 71, nombre: 'Python', extension: '.py', ejemplo: '# Código inicial\nprint("Hola Mundo")' },
    { id: 63, nombre: 'JavaScript', extension: '.js', ejemplo: '// Código inicial\nconsole.log("Hola Mundo");' },
    { id: 50, nombre: 'C', extension: '.c', ejemplo: '#include <stdio.h>\n\nint main() {\n  printf("Hola Mundo\\n");\n  return 0;\n}' },
    { id: 54, nombre: 'C++', extension: '.cpp', ejemplo: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hola Mundo" << endl;\n  return 0;\n}' },
    { id: 51, nombre: 'C#', extension: '.cs', ejemplo: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hola Mundo");\n  }\n}' }
  ];

  const lenguajeActual = lenguajesDisponibles.find((l) => l.id === lenguajeSeleccionado) || lenguajesDisponibles[1];
  const allowedLanguages =
    Array.isArray(config?.lenguajesPermitidos) && config?.lenguajesPermitidos?.length
      ? new Set(config.lenguajesPermitidos)
      : null;

  useEffect(() => {
    const cargarMiniproyecto = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/miniproyectos/${content.id}`);
        if (!response.ok) return;
        const data: MiniproyectoApiResponse = await response.json();
        setDescripcion(data?.Actividad?.descripcion || '');
        setNivel(data?.Actividad?.nivel_dificultad || 'Basica');

        if (data?.respuesta_miniproyecto) {
          try {
            const parsed = JSON.parse(data.respuesta_miniproyecto);
            if (parsed?.tipo === 'programacion' || parsed?.tipo === 'mvc' || parsed?.esperado) {
              setConfig(parsed as MiniproyectoConfig);
              if (Array.isArray(parsed?.lenguajesPermitidos) && parsed.lenguajesPermitidos.length > 0) {
                setLenguajeSeleccionado(parsed.lenguajesPermitidos[0]);
              }
            }
          } catch {
            setConfig({ esperado: data.respuesta_miniproyecto });
          }
        }
      } catch (error) {
      } finally {
        setIsLoadingInfo(false);
      }
    };

    cargarMiniproyecto();
  }, [content.id, API_BASE_URL]);

  // Inicializar contenido de las pestañas MVC al conocer el nombre del modelo y plantillas
  useEffect(() => {
    if (isMvc) {
      setMainCode(config?.templateMain || buildDefaultMain(nombreModelo));
      setModeloCode(config?.templateModelo || buildDefaultModelo(nombreModelo));
      setLenguajeSeleccionado(62);
    }
  }, [isMvc, nombreModelo, config?.templateMain, config?.templateModelo]);

  const cambiarLenguaje = (nuevoLenguajeId: number) => {
    setLenguajeSeleccionado(nuevoLenguajeId);
    const lenguaje = lenguajesDisponibles.find((l) => l.id === nuevoLenguajeId);
    if (lenguaje) {
      setSingleCode(lenguaje.ejemplo);
    }
  };

  // ── Ejecutar: prueba libre sin calificar, muestra casos ─────────────────────
  const handleEjecutar = async () => {
    setIsRunning(true);
    setFeedback('');
    setCasosPruebaResultados([]);
    setResultMode('execution');

    const codigo = isMvc
      ? mergeMvcFiles(mainCode, modeloCode, CONSOLA_IO_SOURCE)
      : singleCode;

    try {
      const res = await fetch(`${API_BASE_URL}/miniproyectos/${content.id}/ejecutar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, lenguaje_id: isMvc ? 62 : lenguajeSeleccionado }),
        credentials: 'include',
      });
      const data: any = await res.json().catch(() => ({}));
      const casos: CasoPruebaResultado[] = Array.isArray(data?.casos) ? data.casos : [];
      setCasosPruebaResultados(casos);
      setFeedback(data?.resumen || (res.ok ? 'Ejecución completada.' : 'Error al ejecutar.'));
    } catch {
      setFeedback('No se pudo conectar con el servidor.');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Enviar: evaluación definitiva con calificación ───────────────────────────
  const handleEnviar = async () => {
    setIsLoading(true);
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('evaluation');

    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      alert('No se encontró el ID del estudiante. Inicia sesión.');
      setIsLoading(false);
      return;
    }

    const payload = isMvc
      ? { codigo: mergeMvcFiles(mainCode, modeloCode, CONSOLA_IO_SOURCE), lenguaje_id: 62 }
      : { codigo: singleCode, lenguaje_id: lenguajeSeleccionado };

    const result = await submitMiniproyecto(content.id, payload, estudianteId);
    const data: any = result.data || {};

    if (result.status === 409) {
      setAprobado(true);
      setFeedback(data?.message || 'Miniproyecto ya aprobado.');
      if (Array.isArray(data?.casos)) setCasosPruebaResultados(data.casos);
      setIsLoading(false);
      return;
    }

    const casos: CasoPruebaResultado[] = Array.isArray(data?.casos) ? data.casos
      : Array.isArray(data?.casosPrueba) ? data.casosPrueba : [];
    if (casos.length > 0) setCasosPruebaResultados(casos);

    if (result.status === 200) {
      setAprobado(true);
      setFeedback('¡Miniproyecto aprobado! Todos los casos pasaron.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setIsLoading(false);
      return;
    }

    if (result.status === 400) {
      setAprobado(false);
      const stderr = data?.stderr || '';
      setFeedback(data?.resumen || stderr || 'La solución no superó todos los casos. Revisa tu código.');
      setIsLoading(false);
      return;
    }

    setFeedback(result.message || 'Error del servidor.');
    setIsLoading(false);
  };

  const handleClear = () => {
    if (isMvc) {
      if (activeTab === 'main') setMainCode(buildDefaultMain(nombreModelo));
      else if (activeTab === 'modelo') setModeloCode(buildDefaultModelo(nombreModelo));
    } else {
      setSingleCode('');
    }
    setFeedback('');
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('idle');
  };

  const formatJavaLikeCode = (input: string) => {
    const lines = input.split('\n');
    let indentLevel = 0;
    return lines.map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return '';
      const leadingClosers = (trimmed.match(/^\}+/) || [''])[0].length;
      indentLevel = Math.max(0, indentLevel - leadingClosers);
      const formattedLine = `${'    '.repeat(indentLevel)}${trimmed}`;
      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      indentLevel = Math.max(0, indentLevel + openBraces - closeBraces + leadingClosers);
      return formattedLine;
    }).join('\n');
  };

  const handleFormatCode = () => {
    if (!isMvc) return;
    if (activeTab === 'main') setMainCode((prev) => formatJavaLikeCode(prev));
    else if (activeTab === 'modelo') setModeloCode((prev) => formatJavaLikeCode(prev));
  };

  const activeTabDef = tabs.find((t) => t.id === activeTab);
  const isCurrentTabReadOnly = activeTabDef?.readOnly ?? false;

  const currentCode = isMvc
    ? activeTab === 'main'
      ? mainCode
      : activeTab === 'modelo'
        ? modeloCode
        : CONSOLA_IO_SOURCE
    : singleCode;

  const handleCodeChange = (value: string) => {
    if (isMvc) {
      if (activeTab === 'main') setMainCode(value);
      else if (activeTab === 'modelo') setModeloCode(value);
      // consolaIO is read-only — changes silently ignored
    } else {
      setSingleCode(value);
    }
  };

  const cardClass = 'min-w-0 rounded-[1.6rem] border border-slate-200/85 bg-white p-5 shadow-[0_14px_32px_rgba(58,74,91,0.08)]';
  const sectionLabelClass = 'mb-1 inline-flex border-l-2 border-[#4A90E2] pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500';

  const guideItems = isMvc
    ? [
        `Edita ${nombreModelo}.java con la lógica del modelo solicitada en el enunciado.`,
        'En Main.java instancia el modelo y llama sus métodos usando la ConsolaIO proporcionada.',
        'No modifiques ConsolaIO.java — es la clase de entrada/salida fija del sistema.',
        'Usa Ejecutar para pruebas libres con tus datos de entrada; usa Evaluar para calificación final.',
        'No cambies la firma pública de los métodos indicados en el enunciado.',
      ]
    : [
        'Lee el enunciado completo antes de comenzar a programar.',
        'Implementa la lógica en el lenguaje seleccionado.',
        'Usa Evaluar para enviar tu solución a calificación.',
        'Revisa la salida obtenida vs la salida esperada en el panel de resultados.',
      ];

  const resultIcon = aprobado ? CheckCircle2 : feedback ? XCircle : AlertCircle;
  const ResultIcon = resultIcon;
  const configuredCases: CasoPrueba[] = Array.isArray(config?.casos_prueba) ? config.casos_prueba : [];

  return (
    <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#F7FAFF_0%,#F5F7FB_48%,#F3F4F6_100%)]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
              <img src={logoImage} alt="EduPath" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-[#3A4A5B]">Miniproyecto de Programación</h1>
              <p className="text-sm text-gray-500">{content.title}</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
      </header>

      {/* Contenido centrado con ancho máximo */}
      <div className="mx-auto max-w-[1280px] space-y-5 px-6 py-6">

        {/* ── 1. Descripción — ancho completo ── */}
        <section className={`${cardClass} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7]" />

          {/* Cabecera centrada + badges */}
          <div className="mx-auto max-w-[860px]">
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className={sectionLabelClass}>Descripción del miniproyecto</span>
                <h2 className="mt-1 text-[1.5rem] font-bold leading-tight text-[#3A4A5B]">{content.title}</h2>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {isLoadingInfo ? (
                  <div className="flex gap-2 animate-pulse">
                    <div className="h-6 w-16 rounded-full bg-slate-200" />
                    <div className="h-6 w-24 rounded-full bg-slate-200" />
                  </div>
                ) : (
                  <>
                    <div className="inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.14) 100%)', color: subjectColor }}>
                      {nivel}
                    </div>
                    {isMvc && (
                      <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Arquitectura MVC
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Descripción HTML — centrada, ancho de lectura cómodo */}
          {isLoadingInfo ? (
            <div className="mx-auto max-w-[860px] space-y-3 animate-pulse">
              <div className="h-6 w-2/3 rounded-lg bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-5/6 rounded bg-slate-100" />
              <div className="h-3 w-4/6 rounded bg-slate-100" />
              <div className="mt-4 h-48 w-full rounded-xl bg-slate-100" />
            </div>
          ) : descripcion ? (
            <div
              className="quill-render mx-auto max-w-[860px] break-words"
              dangerouslySetInnerHTML={{ __html: descripcion }}
            />
          ) : (
            <p className="mx-auto max-w-[860px] text-sm leading-6 text-slate-500">Este miniproyecto no tiene una descripción adicional configurada.</p>
          )}
        </section>

        {/* ── 2. Casos de prueba (solo si están configurados) ── */}
        {configuredCases.length > 0 && (
          <section className={`${cardClass} relative overflow-hidden`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4A90E2]/30 via-[#5B9FED]/20 to-transparent" />
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={sectionLabelClass}>Validación</span>
                <h3 className="text-lg font-bold text-[#3A4A5B]">Casos de prueba</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {configuredCases.length} {configuredCases.length === 1 ? 'caso' : 'casos'}
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {configuredCases.map((caso, index) => (
                <div key={index} className="min-w-[280px] flex-1 rounded-[1.25rem] border border-blue-100 bg-blue-50/40 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Caso {index + 1}
                    </span>
                    <div className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entrada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {caso.inputs?.trim() || 'Sin datos'}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salida esperada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {caso.output?.trim() || 'Sin datos'}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Layout dos columnas: instrucciones + editor ── */}
        <div className="flex gap-6">

          {/* Columna izquierda — instrucciones sticky */}
          <aside className="w-[320px] shrink-0 self-start sticky top-6">
            <section className={`${cardClass} relative overflow-hidden`}>
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4A90E2]/25 via-transparent to-[#7ED6A7]/25" />
              <div className="mb-4 border-b border-slate-100 pb-3">
                <span className={sectionLabelClass}>Guía</span>
                <h3 className="text-[1rem] font-bold text-[#3A4A5B]">Instrucciones</h3>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-gray-700">
                {guideItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#4A90E2]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {isMvc && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
                  <p className="mb-2 font-semibold">Archivos del proyecto</p>
                  <ul className="space-y-1 text-blue-700">
                    <li><code className="font-mono font-medium">Main.java</code> — punto de entrada</li>
                    <li><code className="font-mono font-medium">{nombreModelo}.java</code> — modelo</li>
                    <li><code className="font-mono font-medium">ConsolaIO.java</code> — solo lectura</li>
                  </ul>
                </div>
              )}
            </section>
          </aside>

          {/* Columna derecha — editor */}
          <div className="min-w-0 flex-1">
        {/* Editor principal */}
        <section className="w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(58,74,91,0.10)]">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(90deg,rgba(74,144,226,0.07)_0%,rgba(255,255,255,1)_42%,rgba(126,214,167,0.07)_100%)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {isMvc ? (
              <div className="rounded-2xl px-4 py-2 font-mono text-sm shadow-sm ring-1 ring-blue-100" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.10) 100%)', color: subjectColor }}>
                Editor Java
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={lenguajeSeleccionado}
                  onChange={(e) => cambiarLenguaje(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-[#3A4A5B] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] cursor-pointer"
                >
                  {lenguajesDisponibles.map((lenguaje) => (
                    <option
                      key={lenguaje.id}
                      value={lenguaje.id}
                      disabled={allowedLanguages ? !allowedLanguages.has(lenguaje.id) : false}
                    >
                      {lenguaje.nombre}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg px-4 py-2 font-mono text-sm shadow-sm" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                  script{lenguajeActual.extension}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <Trash2 className="h-4 w-4" />
                Restaurar plantilla
              </button>
              {isMvc && (
                <button
                  onClick={handleFormatCode}
                  disabled={isLoading || isRunning || activeTab === 'consolaIO'}
                  className="flex min-w-[130px] items-center justify-center gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Dar formato
                </button>
              )}
              {/* Ejecutar: prueba libre */}
              <button
                onClick={handleEjecutar}
                disabled={isRunning || isLoading}
                className="flex items-center gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:from-blue-100 hover:to-cyan-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRunning ? 'Ejecutando...' : 'Ejecutar'}
              </button>
              {/* Enviar: evaluación definitiva */}
              <button
                onClick={handleEnviar}
                disabled={isLoading || isRunning || aprobado}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: isLoading || isRunning || aprobado ? '#94a3b8' : 'linear-gradient(135deg, #4A90E2 0%, #5B9FED 55%, #7ED6A7 100%)' }}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {aprobado ? 'Aprobado' : isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          {/* Pestañas MVC */}
          {isMvc && (
            <div className="border-b border-slate-200 bg-[linear-gradient(90deg,rgba(74,144,226,0.06)_0%,rgba(255,255,255,1)_50%,rgba(126,214,167,0.06)_100%)] px-2">
              <div className="flex items-end gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-mono font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'border-b-2 bg-white text-[#3A4A5B] shadow-sm'
                        : 'text-slate-400 hover:bg-white/60 hover:text-slate-600'
                    }`}
                    style={activeTab === tab.id ? { borderBottomColor: '#4A90E2' } : {}}
                  >
                    {tab.readOnly && <Lock className="h-3 w-3 text-amber-500" />}
                    {tab.label}
                  </button>
                ))}
                <div className="ml-auto self-center pr-2">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(74,144,226,0.10)', color: '#4A90E2' }}>
                    Java · MVC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monaco */}
          <div
            style={{
              backgroundImage: isMvc
                ? 'radial-gradient(circle at top left, rgba(74,144,226,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(126,214,167,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,1) 100%)'
                : undefined,
            }}
          >
            {isMvc ? (
              <>
                {activeTab === 'main' && <JavaEditor key="mp-main" value={mainCode} readOnly={false} onChange={(v) => setMainCode(v)} height={520} />}
                {activeTab === 'modelo' && <JavaEditor key="mp-modelo" value={modeloCode} readOnly={false} onChange={(v) => setModeloCode(v)} height={520} />}
                {activeTab === 'consolaIO' && <JavaEditor key="mp-consolaIO" value={CONSOLA_IO_SOURCE} readOnly readOnlyLabel="ConsolaIO.java — solo lectura, clase de utilidad fija del sistema" height={520} />}
              </>
            ) : (
              <JavaEditor value={singleCode} readOnly={false} onChange={(v) => setSingleCode(v)} height="100%" />
            )}
          </div>

          {/* ── Panel de resultados por casos de prueba ── */}
          <div className="border-t border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className={sectionLabelClass}>Resultado</span>
                <h4 className="text-sm font-bold text-[#3A4A5B]">Casos de prueba</h4>
              </div>
              {puntos !== null && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Puntos: {puntos}
                </span>
              )}
            </div>

            {/* Mensaje de resumen */}
            {feedback && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${
                aprobado ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : resultMode === 'execution' ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
                {feedback}
              </div>
            )}

            {/* Casos */}
            {casosPruebaResultados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Presiona <strong className="text-slate-700">Ejecutar</strong> para probar tu código, o{' '}
                <strong className="text-slate-700">Enviar</strong> para calificar.
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
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${visual.badgeClass}`}>
                          {visual.label}
                        </span>
                      </div>
                      <p className={`text-sm leading-6 ${caso.paso ? 'text-emerald-700' : caso.omitido ? 'text-amber-600' : 'text-rose-700'}`}>
                        {getCaseResultMessage(caso)}
                      </p>
                      {!caso.omitido && (caso.outputObtenido || caso.stdout) && (
                        <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                          {caso.outputObtenido || caso.stdout}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        </div>{/* fin columna derecha */}

        </div>{/* fin layout dos columnas */}

      </div>{/* fin contenedor principal */}
    </div>
  );
}
