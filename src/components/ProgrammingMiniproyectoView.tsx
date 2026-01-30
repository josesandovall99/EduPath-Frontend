import { useState } from 'react';
import { ArrowLeft, Play, Trash2 } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { useCompiler } from '../Hooks/useCompiler';

interface ProgrammingMiniproyectoViewProps {
  content: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export function ProgrammingMiniproyectoView({ content, onBack }: ProgrammingMiniproyectoViewProps) {
  const [code, setCode] = useState('# Escribe tu código aquí\nprint("Hola Mundo")');
  const subjectColor = '#4A90E2';
  const { runCode, output, isLoading, setOutput } = useCompiler();

  const handleExecute = async () => {
    try {
      await runCode(code, 71, 1, 1);
    } catch (error) {
      console.error('❌ Error al llamar a runCode:', error);
    }
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
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
                <span>Dificultad: Básica</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6 mb-6 shadow-sm">
              <h3 className="text-[#3A4A5B] font-bold mb-3">Instrucciones</h3>
              <p className="text-gray-700 text-sm mb-3 font-medium text-pretty">
                Resuelve el miniproyecto usando el editor de código y ejecuta tu solución para validar el resultado.
              </p>
            </div>
          </div>
        </div>

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
