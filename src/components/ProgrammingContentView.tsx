import { useState } from 'react';
import { ArrowLeft, Play, SkipForward, SkipBack, Lightbulb } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document';
}

interface ProgrammingContentViewProps {
  content: Content;
  onBack: () => void;
}

export function ProgrammingContentView({ content, onBack }: ProgrammingContentViewProps) {
  const [code, setCode] = useState('# Escribe tu código aquí\nprint("Hola Mundo")');
  const subjectColor = '#4A90E2';

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Fundamentos de Programación</h1>
                <p className="text-gray-500 text-sm">{content.title}</p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm">Progreso:</span>
                <span className="text-xl" style={{ color: subjectColor }}>20%</span>
              </div>
              <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '20%', backgroundColor: subjectColor }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Left Panel - Theory/Content */}
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            {/* Content Title */}
            <div className="border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-[#3A4A5B] mb-2">{content.title}</h2>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Ejercicio 1 de 5</span>
                <span>•</span>
                <span>Dificultad: Básica</span>
              </div>
            </div>

            {/* Theory Content */}
            {content.type === 'video' ? (
              <div className="mb-6">
                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md bg-gray-900 flex items-center justify-center mb-4">
                  <div className="text-center">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ backgroundColor: `${subjectColor}20` }}
                    >
                      <Play className="w-10 h-10" style={{ color: subjectColor }} />
                    </div>
                    <span className="text-gray-400">Video Tutorial</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="w-full rounded-xl bg-gray-50 border border-gray-200 p-6 overflow-y-auto shadow-sm">
                  <span className="text-gray-600 text-sm">
                    [Contenido del documento]
                  </span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-6 mb-6 shadow-sm">
              <h3 className="text-[#3A4A5B] mb-3">Instrucciones</h3>
              <div className="space-y-2 text-gray-700 text-sm">
                <p>
                  Bienvenido a tu primer ejercicio de programación. En esta lección aprenderás 
                  los conceptos básicos de Python.
                </p>
                <p className="mt-3">
                  <span className="text-[#3A4A5B]">Objetivo:</span> Escribe un programa que 
                  imprima "Hola Mundo" en la consola.
                </p>
                <ul className="list-disc list-inside mt-3 space-y-1 text-gray-600">
                  <li>Usa la función print() para mostrar texto</li>
                  <li>Asegúrate de usar comillas para el texto</li>
                  <li>Haz clic en "Ejecutar" para probar tu código</li>
                </ul>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-300 py-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                <SkipBack className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Anterior</span>
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: subjectColor }}
              >
                <span>Siguiente</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor/Compiler */}
        <div className="w-1/2 bg-white flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="px-4 py-2 rounded-lg shadow-sm"
                style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}
              >
                <span className="text-sm">script.py</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <span className="text-gray-700 text-sm">Limpiar</span>
              </button>
              <button 
                className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                style={{ backgroundColor: subjectColor }}
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Ejecutar</span>
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 p-4 bg-[#1E1E1E] overflow-y-auto">
            <div className="flex gap-4">
              {/* Line Numbers */}
              <div className="text-gray-500 text-sm font-mono select-none">
                <div>1</div>
                <div>2</div>
                <div>3</div>
                <div>4</div>
                <div>5</div>
              </div>
              
              {/* Code Area */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 bg-transparent text-gray-100 text-sm font-mono outline-none resize-none"
                style={{ fontFamily: 'monospace' }}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output Console */}
          <div className="h-48 bg-[#1A1A1A] border-t border-gray-700">
            <div className="bg-[#252525] border-b border-gray-700 px-4 py-2">
              <span className="text-gray-400 text-sm">Terminal</span>
            </div>
            <div className="p-4 text-gray-300 text-sm font-mono">
              <div className="text-green-400">&gt; _</div>
              <div className="mt-2 text-gray-500">[Área de salida del programa]</div>
            </div>
          </div>

          {/* Hints Section */}
          <div className="border-t border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-4">
            <div className="flex items-start gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${subjectColor}15` }}
              >
                <Lightbulb className="w-4 h-4" style={{ color: subjectColor }} />
              </div>
              <div>
                <div className="text-[#3A4A5B] text-sm mb-1">Pista</div>
                <div className="text-gray-600 text-xs">
                  Haz clic aquí si necesitas ayuda con este ejercicio
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}