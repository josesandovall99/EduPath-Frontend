import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Trash2 } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { submitMiniproyecto } from '../utils/submitMiniproyecto';
import { API_BASE_URL } from '../utils/constants';

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
  const [code, setCode] = useState('# Escribe tu código aquí\nprint("Hola Mundo")');
  const subjectColor = '#4A90E2';
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<MiniproyectoConfig | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [nivel, setNivel] = useState('Basica');
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [puntos, setPuntos] = useState<number | null>(null);
  const [lenguajeSeleccionado, setLenguajeSeleccionado] = useState<number>(71);

  const lenguajesDisponibles = [
    { id: 62, nombre: 'Java', extension: '.java', ejemplo: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola Mundo");\n  }\n}' },
    { id: 71, nombre: 'Python', extension: '.py', ejemplo: '# Escribe tu código aquí\nprint("Hola Mundo")' },
    { id: 63, nombre: 'JavaScript', extension: '.js', ejemplo: '// Escribe tu código aquí\nconsole.log("Hola Mundo");' },
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
            if (parsed?.tipo === 'programacion' || parsed?.esperado) {
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

  const cambiarLenguaje = (nuevoLenguajeId: number) => {
    setLenguajeSeleccionado(nuevoLenguajeId);
    const lenguaje = lenguajesDisponibles.find((l) => l.id === nuevoLenguajeId);
    if (lenguaje) {
      setCode(lenguaje.ejemplo);
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

    const result = await submitMiniproyecto(
      content.id,
      { codigo: code, lenguaje_id: lenguajeSeleccionado },
      estudianteId
    );

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
        const finalOutput = `EJERCICIO APROBADO!\n\nSalida del programa:\n${salida}\n\nPuntos obtenidos: ${data.puntosObtenidos || 0}`;
        setOutput(finalOutput);
        setIsLoading(false);
        alert(`Correcto${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}`);
        return;
      }

      setAprobado(false);
      const detalleErrores = errores ? `\n\nErrores de sintaxis:\n${errores}` : '';
      const detalleStderr = stderr ? `\n\nErrores del compilador:\n${stderr}` : '';
      const finalOutput = `Ejercicio NO aprobado\n\nTu salida:\n${salida}\n\nSalida esperada:\n${esperado}${detalleErrores}${detalleStderr}`;
      setOutput(finalOutput);
      setFeedback(errores || stderr || 'Respuesta incorrecta. Intenta nuevamente.');
      setIsLoading(false);
      alert(`Respuesta incorrecta`);
      return;
    }

    alert(`Error del servidor: ${result.message || 'Error desconocido'}`);
    setIsLoading(false);
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
    setFeedback('');
    setPuntos(null);
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
                  Resuelve el miniproyecto usando el editor de código y ejecuta tu solución para validar el resultado.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/2 bg-white flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
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
            <div className="flex gap-3">
              <button 
                onClick={handleClear}
                className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-700"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar
              </button>
              <button 
                onClick={handleExecute}
                disabled={isLoading}
                className="px-6 py-2 rounded-lg text-white shadow-md transition-all flex items-center gap-2 font-bold text-sm"
                style={{ backgroundColor: isLoading ? '#94a3b8' : subjectColor }}
              >
                <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Evaluando...' : 'Evaluar'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 bg-[#1E1E1E] overflow-y-auto flex">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-transparent text-white font-mono text-sm outline-none resize-none"
              spellCheck={false}
            />
          </div>

          <div className="h-48 bg-[#0F172A] border-t border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-gray-300 text-sm">Salida del programa</h4>
            </div>
            <div className="text-green-400 font-mono text-sm whitespace-pre-wrap">
              {output || 'Ejecuta tu código para ver la salida.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
