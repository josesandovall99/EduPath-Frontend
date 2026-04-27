import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Trash2, Lock } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { submitMiniproyecto } from '../utils/submitMiniproyecto';
import { API_BASE_URL } from '../utils/constants';
import { CONSOLA_IO_SOURCE } from '../utils/consolaIOSource';
import { mergeMvcFiles } from '../utils/mergeMvcFiles';
import { JavaEditor } from './JavaEditor';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy placeholder
const _REMOVED_CONSOLA_IO = `import java.util.Scanner;
import java.util.InputMismatchException;

public class ConsolaIO {

    private Scanner sc;

    public ConsolaIO() {
        sc = new Scanner(System.in);
    }

    public String leerCadena() {
        String s = sc.nextLine();
        if (s.isEmpty() && sc.hasNextLine()) {
            s = sc.nextLine();
        }
        return s;
    }

    public String leerCadena(String aviso) {
        imprimir(aviso);
        return leerCadena();
    }

    public String leerToken() {
        return sc.next();
    }

    public String leerToken(String aviso) {
        imprimir(aviso);
        return leerToken();
    }

    public short leerShort() {
        while (true) {
            try {
                short v = sc.nextShort();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número short válido");
                sc.nextLine();
            }
        }
    }

    public short leerShort(String aviso) {
        imprimir(aviso);
        return leerShort();
    }

    public byte leerByte() {
        while (true) {
            try {
                byte v = sc.nextByte();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número byte válido");
                sc.nextLine();
            }
        }
    }

    public byte leerByte(String aviso) {
        imprimir(aviso);
        return leerByte();
    }

    public int leerEntero() {
        while (true) {
            try {
                int v = sc.nextInt();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un entero válido");
                sc.nextLine();
            }
        }
    }

    public int leerEntero(String aviso) {
        imprimir(aviso);
        return leerEntero();
    }

    public float leerFloat() {
        while (true) {
            try {
                float v = sc.nextFloat();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número float válido");
                sc.nextLine();
            }
        }
    }

    public float leerFloat(String aviso) {
        imprimir(aviso);
        return leerFloat();
    }

    public double leerDouble() {
        while (true) {
            try {
                double v = sc.nextDouble();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese un número double válido");
                sc.nextLine();
            }
        }
    }

    public double leerDouble(String aviso) {
        imprimir(aviso);
        return leerDouble();
    }

    public boolean leerBoolean() {
        while (true) {
            try {
                boolean v = sc.nextBoolean();
                sc.nextLine();
                return v;
            } catch (InputMismatchException e) {
                System.out.println("Error: Ingrese true o false");
                sc.nextLine();
            }
        }
    }

    public boolean leerBoolean(String aviso) {
        imprimir(aviso);
        return leerBoolean();
    }

    public char leerCaracter() {
        String s = leerCadena();
        return (s == null || s.isEmpty()) ? '\\0' : s.charAt(0);
    }

    public char leerCaracter(String aviso) {
        imprimir(aviso);
        return leerCaracter();
    }

    public int leerEnteroEnRango(int min, int max) {
        int num;
        do {
            num = leerEntero();
            if (num < min || num > max) {
                System.out.println("Error: Valor fuera de rango [" + min + ", " + max + "]");
            }
        } while (num < min || num > max);
        return num;
    }

    public int leerEnteroEnRango(String aviso, int min, int max) {
        imprimir(aviso);
        return leerEnteroEnRango(min, max);
    }

    public void imprimir(String aviso) {
        System.out.println(aviso);
    }

    public void imprimir(int num) {
        System.out.println(num);
    }

    public void imprimir(float num) {
        System.out.println(num);
    }

    public void imprimir(double num) {
        System.out.println(num);
    }
}`;

// (end of unused placeholder — actual source is CONSOLA_IO_SOURCE from consolaIOSource.ts)

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

interface MiniproyectoConfig {
  tipo?: string;
  esperado?: string;
  sintaxis?: string[];
  lenguajesPermitidos?: number[];
  nombreModelo?: string;
  templateMain?: string;
  templateModelo?: string;
  // Legacy fields — exercises created before MVC became the standard
  metodo?: unknown;
  casos_prueba?: unknown[];
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

  const nombreModelo = config?.nombreModelo || 'SeguridadBancaria';
  // MVC is the standard for all programming miniproyectos.
  // Only fall back to legacy single-file mode when the exercise explicitly has a
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

  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [puntos, setPuntos] = useState<number | null>(null);
  const [mvcStdin, setMvcStdin] = useState('');
  const [mvcFreeOutput, setMvcFreeOutput] = useState<{ stdout: string; stderr: string } | null>(null);

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
        console.error('Error al cargar miniproyecto:', error);
      }
    };

    cargarMiniproyecto();
  }, [content.id, API_BASE_URL]);

  // Initialize MVC tab content once we know the model name and teacher templates
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

  const handleExecute = async () => {
    setIsLoading(true);
    setFeedback('');
    setPuntos(null);

    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      alert('No se encontró el ID del estudiante. Inicia sesión.');
      setIsLoading(false);
      return;
    }

    setMvcFreeOutput(null);

    // MVC: merge en frontend → enviar como codigo normal, sin depender de archivos
    const payload = isMvc
      ? { codigo: mergeMvcFiles(mainCode, modeloCode, CONSOLA_IO_SOURCE), lenguaje_id: 62 }
      : { codigo: singleCode, lenguaje_id: lenguajeSeleccionado };

    const result = await submitMiniproyecto(content.id, payload, estudianteId);

    // Ejecución libre MVC (stdin_manual) — muestra salida directa sin calificar
    if (isMvc && result.status === 200 && (result.data as any)?.modo === 'ejecucion_libre') {
      const d = result.data as any;
      setMvcFreeOutput({ stdout: d.stdout || '', stderr: d.stderr || '' });
      setIsLoading(false);
      return;
    }

    if (result.status === 409) {
      setAprobado(true);
      alert(`${result.message || 'Miniproyecto ya aprobado'}`);
      setIsLoading(false);
      return;
    }

    if (result.status === 400 || result.status === 200) {
      const data: any = result.data || {};
      const esperado = data?.esperado || config?.esperado || '';
      const salida = data?.stdout || data?.obtenido || '';
      const stderr = data?.stderr || '';
      const errores = Array.isArray(data?.erroresSintaxis) ? data.erroresSintaxis.join('\n') : '';

      if (result.status === 200) {
        setAprobado(true);
        setFeedback('¡Correcto!');
        if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
        setOutput(`EJERCICIO APROBADO!\n\nSalida del programa:\n${salida}\n\nPuntos obtenidos: ${data.puntosObtenidos || 0}`);
        setIsLoading(false);
        alert(`Correcto${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}`);
        return;
      }

      setAprobado(false);
      const detalleErrores = errores ? `\n\nErrores de sintaxis:\n${errores}` : '';
      const detalleStderr = stderr ? `\n\nErrores del compilador:\n${stderr}` : '';
      setOutput(`Ejercicio no aprobado\n\nSalida obtenida:\n${salida}\n\nSalida esperada:\n${esperado}${detalleErrores}${detalleStderr}`);
      setFeedback(errores || stderr || 'Respuesta incorrecta. Nuevo intento disponible.');
      setIsLoading(false);
      alert(`Respuesta incorrecta`);
      return;
    }

    alert(`Error del servidor: ${result.message || 'Error desconocido'}`);
    setIsLoading(false);
  };

  const handleClear = () => {
    if (isMvc) {
      if (activeTab === 'main') setMainCode(buildDefaultMain(nombreModelo));
      else if (activeTab === 'modelo') setModeloCode(buildDefaultModelo(nombreModelo));
    } else {
      setSingleCode('');
    }
    setOutput('');
    setFeedback('');
    setPuntos(null);
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

  return (
    <div className="bg-[#F2F2F2] rounded-lg overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B] font-bold">Miniproyecto de Programación</h1>
                <p className="text-gray-500 text-sm">{content.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: '600px' }}>
        {/* Left panel — instructions */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-[#3A4A5B] text-xl font-bold mb-2">{content.title}</h2>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Miniproyecto</span>
                <span>•</span>
                <span>Dificultad: {nivel}</span>
                {isMvc && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">Arquitectura MVC</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6 mb-6 shadow-sm">
              <h3 className="text-[#3A4A5B] font-bold mb-3">Instrucciones</h3>
              {descripcion ? (
                <div
                  className="text-gray-700 text-sm mb-3 font-medium text-pretty"
                  dangerouslySetInnerHTML={{ __html: descripcion }}
                />
              ) : (
                <p className="text-gray-700 text-sm mb-3 font-medium text-pretty">
                  Desarrollo del miniproyecto mediante el editor de código y validación del resultado por ejecución.
                </p>
              )}
            </div>

            {isMvc && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Estructura del proyecto</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li><span className="font-mono">Main.java</span> — punto de entrada (editable)</li>
                  <li><span className="font-mono">{nombreModelo}.java</span> — lógica del modelo (editable)</li>
                  <li><span className="font-mono">ConsolaIO.java</span> — utilidad de E/S (solo lectura)</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — editor */}
        <div className="w-1/2 bg-white flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            {isMvc ? (
              <div className="rounded-2xl px-4 py-2 font-mono text-sm shadow-sm ring-1 ring-blue-100" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.10) 100%)', color: '#4A90E2' }}>
                Java · MVC
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={lenguajeSeleccionado}
                  onChange={(e) => cambiarLenguaje(parseInt(e.target.value, 10))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-[#3A4A5B] focus:outline-none focus:ring-2 focus:ring-[#4A90E2] cursor-pointer"
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
                <div className="px-4 py-2 rounded-lg shadow-sm font-mono text-sm" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                  script{lenguajeActual.extension}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <Trash2 className="h-4 w-4" />
                Restaurar
              </button>
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #4A90E2 0%, #5B9FED 55%, #7ED6A7 100%)' }}
              >
                <Play className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Evaluando...' : 'Evaluar'}
              </button>
            </div>
          </div>

          {/* Pestañas MVC — mismo gradiente del toolbar */}
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
              </div>
            </div>
          )}

          {/* Monaco — altura fija en px (height:100% no funciona con minHeight) */}
          <div
            style={{
              backgroundImage: isMvc
                ? 'radial-gradient(circle at top left, rgba(74,144,226,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(126,214,167,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,1) 100%)'
                : undefined
            }}
          >
            {isMvc ? (
              <>
                {activeTab === 'main' && (
                  <JavaEditor key="mp-main" value={mainCode} readOnly={false} onChange={(v) => setMainCode(v)} height={520} />
                )}
                {activeTab === 'modelo' && (
                  <JavaEditor key="mp-modelo" value={modeloCode} readOnly={false} onChange={(v) => setModeloCode(v)} height={520} />
                )}
                {activeTab === 'consolaIO' && (
                  <JavaEditor key="mp-consolaIO" value={CONSOLA_IO_SOURCE} readOnly readOnlyLabel="ConsolaIO.java — solo lectura, clase de utilidad fija del sistema" height={520} />
                )}
              </>
            ) : (
              <JavaEditor value={singleCode} readOnly={false} onChange={(v) => setSingleCode(v)} height="100%" />
            )}
          </div>

          {/* Consola interactiva — mismo estilo que panel de Resultado del resto de la app */}
          <div className="shrink-0 border-t border-slate-200 bg-white">
            <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* stdin */}
              <div className="p-5">
                <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <span className="mb-1 inline-flex border-l-2 border-[#4A90E2] pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Entrada</span>
                  <h4 className="text-sm font-bold text-[#3A4A5B]">Datos de prueba (stdin)</h4>
                </div>
                <textarea
                  value={mvcStdin}
                  onChange={(e) => setMvcStdin(e.target.value)}
                  placeholder={"Ej: 4,12000,10\n(valores separados por coma → un valor por línea de entrada)"}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700 outline-none transition focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2]/20 resize-none"
                  spellCheck={false}
                />
                <p className="mt-2 text-xs text-slate-400">Cada valor separado por coma es una entrada secuencial del <code className="font-mono">Scanner</code>.</p>
              </div>
              {/* stdout */}
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="mb-1 inline-flex border-l-2 border-[#4A90E2] pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Salida</span>
                    <h4 className="text-sm font-bold text-[#3A4A5B]">Resultado del programa</h4>
                  </div>
                  {feedback && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${aprobado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {feedback}
                    </span>
                  )}
                </div>
                <div
                  className="min-h-[80px] rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm whitespace-pre-wrap overflow-y-auto"
                  style={{ maxHeight: '140px' }}
                >
                  {mvcFreeOutput
                    ? (mvcFreeOutput.stderr
                        ? <span className="text-red-400">{mvcFreeOutput.stderr}</span>
                        : <span className="text-emerald-400">{mvcFreeOutput.stdout || '(programa sin salida)'}</span>)
                    : output
                      ? <span className="text-emerald-400">{output}</span>
                      : <span className="text-slate-600 text-xs">Presiona <strong className="text-slate-400">Evaluar</strong> para ver la salida aquí.</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
