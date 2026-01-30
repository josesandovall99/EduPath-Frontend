import { useState } from 'react';
import { ArrowLeft, Play, SkipForward, SkipBack, Lightbulb, Trash2 } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
// 1. IMPORTANTE: Verifica que la ruta al hook sea correcta
import { useCompiler } from '../Hooks/useCompiler'; 
import { submitExercise } from '../utils/submitExercise';

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
}

export function ProgrammingContentView({ content, onBack }: ProgrammingContentViewProps) {
  const [code, setCode] = useState('# Escribe tu código aquí\nprint("Hola Mundo")');
  const subjectColor = '#4A90E2';

  // 2. Inicializamos el hook
  const { runCode, output, isLoading, setOutput } = useCompiler();

  // Estados para envío/calificación según nueva lógica
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);

  // 3. Función de ejecución con Logs de diagnóstico
  const handleExecute = async () => {
    console.log("🟢 Botón presionado. Código actual:", code);
    
    try {
      // Ajusta los IDs (estudiante, ejercicio) según tu base de datos
      await runCode(code, 71, 1, 1); 
      console.log("✅ Llamada a runCode finalizada");
    } catch (error) {
      console.error("❌ Error al llamar a runCode:", error);
    }
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
    setFeedback('');
    setPuntos(null);
    console.log("🧹 Terminal y editor limpios");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      alert('❌ No se encontró el ID del estudiante. Inicia sesión.');
      setIsSubmitting(false);
      return;
    }

    const result = await submitExercise(/** ejercicioId */  content.id, { texto: code }, estudianteId!);

    // 429: evaluación en curso
    if (result.status === 429) {
      alert(`⏳ ${result.message || 'Evaluación en curso'}`);
      setIsSubmitting(false);
      return;
    }

    // 409: ya aprobado
    if (result.status === 409) {
      setAprobado(true);
      alert(`⚠️ ${result.message || 'Ejercicio ya aprobado'}`);
      setIsSubmitting(false);
      return;
    }

    // 400: incorrecta, mostrar feedback y permitir reintento
    if (result.status === 400) {
      const data: any = result.data || {};
      setFeedback(data?.retroalimentacion || 'Respuesta incorrecta. Intenta nuevamente.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`❌ Incorrecta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      setAprobado(false);
      setIsSubmitting(false);
      return;
    }

    // 200: correcta, mostrar feedback y bloquear envíos
    if (result.status === 200) {
      const data: any = result.data || {};
      setAprobado(true);
      setFeedback(data?.retroalimentacion || '¡Correcto!');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`✅ Correcta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      setIsSubmitting(false);
      return;
    }

    // Otros errores
    alert(`❌ Error del servidor: ${result.message || 'Error desconocido'}`);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#F2F2F2] rounded-lg overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B] font-bold">Fundamentos de Programación</h1>
                <p className="text-gray-500 text-sm">{content.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Progreso:</span>
                <span className="text-xl font-bold" style={{ color: subjectColor }}>20%</span>
              </div>
              <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '20%', backgroundColor: subjectColor }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex" style={{ minHeight: '600px' }}>
        {/* Panel Izquierdo: Contenido */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-[#3A4A5B] text-xl font-bold mb-2">{content.title}</h2>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Ejercicio 1 de 5</span>
                <span>•</span>
                <span>Dificultad: Básica</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6 mb-6 shadow-sm">
              <h3 className="text-[#3A4A5B] font-bold mb-3">Instrucciones</h3>
              <p className="text-gray-700 text-sm mb-3 font-medium text-pretty">
                Escribe un programa que imprima "Hola Mundo" utilizando la función print().
              </p>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Editor y Consola */}
        <div className="w-1/2 bg-white flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-lg shadow-sm font-mono text-sm" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                script.py
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
                {isLoading ? 'Ejecutando...' : 'Ejecutar'}
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || aprobado}
                className="px-6 py-2 rounded-lg text-white shadow-md transition-all flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: (isSubmitting || aprobado) ? '#94a3b8' : subjectColor }}
                title={aprobado ? 'Ejercicio ya aprobado' : 'Enviar y calificar'}
              >
                {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          {/* Editor de Código */}
          <div className="flex-1 p-4 bg-[#1E1E1E] overflow-y-auto flex">
            <div className="text-gray-500 text-sm font-mono pr-4 select-none text-right border-r border-gray-700 mr-4">
              {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-transparent text-gray-100 text-sm font-mono outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Consola de Salida */}
          <div className="h-48 bg-[#1A1A1A] border-t border-gray-700">
            <div className="bg-[#252525] border-b border-gray-700 px-4 py-2 flex justify-between">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Terminal</span>
              {isLoading && <span className="text-blue-400 text-xs animate-pulse font-mono">Running...</span>}
            </div>
            <div className="p-4 text-gray-300 text-sm font-mono h-full overflow-y-auto whitespace-pre-wrap">
              <div className="text-green-500 font-bold mb-1">&gt; _</div>
              <div className={output.toLowerCase().includes('error') ? 'text-red-400' : ''}>
                {output || <span className="text-gray-600">[Esperando ejecución]</span>}
              </div>
              {feedback && (
                <div className="mt-3 text-sm">
                  <div className="text-gray-400">Feedback:</div>
                  <div className="text-gray-200">{feedback}</div>
                  {puntos !== null && <div className="text-blue-300 mt-1">Puntos obtenidos: {puntos}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}