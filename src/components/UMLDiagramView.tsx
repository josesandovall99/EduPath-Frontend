import { useState } from 'react';
import { ArrowLeft, Square, GitMerge, Share2, Boxes, Diamond, RotateCcw, Redo2, Trash2, BookOpen, Save, Send } from 'lucide-react';


interface UMLDiagramViewProps {
  activity: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export function UMLDiagramView({ activity, onBack }: UMLDiagramViewProps) {
  const [diagramElements] = useState([
    { id: 'class1', name: 'Usuario', x: 100, y: 100 },
    { id: 'class2', name: 'Producto', x: 350, y: 100 }
  ]);
  
  const subjectColor = '#7ED6A7'; // Análisis de Sistemas

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        <div 
          className="p-4 border-b border-gray-200 text-white"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <div className="flex items-center gap-3">
            <Boxes className="w-5 h-5" />
            <span className="text-sm">Herramientas UML</span>
          </div>
        </div>

        {/* UML Tools */}
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3">Elementos</h3>
            <div className="space-y-2">
              <button 
                className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 group"
               
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Square className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Clase</span>
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Share2 className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Asociación</span>
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <GitMerge className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Herencia</span>
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Diamond className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Agregación</span>
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Diamond className="w-4 h-4 fill-current" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Composición</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3">Acciones</h3>
            <div className="space-y-2">
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all">
                <Trash2 className="w-4 h-4 text-gray-500" />
                Limpiar diagrama
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all">
                <RotateCcw className="w-4 h-4 text-gray-500" />
                Deshacer
              </button>
              <button className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all">
                <Redo2 className="w-4 h-4 text-gray-500" />
                Rehacer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                  <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="EduPath" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-[#3A4A5B]">Análisis de Sistemas</h1>
                  <p className="text-gray-500 text-sm">{activity.title}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Guardar borrador
                </button>
                <button 
                  className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  style={{ backgroundColor: subjectColor }}
                >
                  <Send className="w-4 h-4" />
                  Enviar diagrama
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Instructions Panel */}
          <div className="w-96 border-r border-gray-200 bg-white p-6 overflow-y-auto">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <h2 className="text-[#3A4A5B] mb-4">Instrucciones</h2>
            <div className="space-y-4 text-gray-700 text-sm">
              <p>
                Crea un diagrama de clases UML para un sistema de gestión de biblioteca 
                que incluya las siguientes entidades:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>Libro (con atributos: título, autor, ISBN)</li>
                <li>Usuario (con atributos: nombre, ID, email)</li>
                <li>Préstamo (con atributos: fecha inicio, fecha fin)</li>
              </ul>
              <div 
                className="border-l-4 pl-4 p-3 rounded-r-lg"
                style={{ 
                  borderColor: subjectColor,
                  backgroundColor: `${subjectColor}15`
                }}
              >
                <p className="text-[#3A4A5B]">
                  <strong>Nota:</strong> Asegúrate de incluir las relaciones apropiadas 
                  entre las clases y sus multiplicidades.
                </p>
              </div>
              <p>
                Usa las herramientas del panel izquierdo para crear los elementos del 
                diagrama. Puedes arrastrar los elementos en el lienzo para organizarlos.
              </p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-[#3A4A5B] mb-3">Criterios de evaluación</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 rounded flex items-center justify-center" style={{ borderColor: subjectColor }}>
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: subjectColor }}></div>
                  </div>
                  <span className="text-gray-700">Clases correctamente definidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Atributos apropiados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Relaciones bien establecidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Multiplicidades indicadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagram Canvas */}
          <div className="flex-1 bg-[#F2F2F2] p-6 overflow-auto">
            <div className="w-full h-full rounded-2xl bg-white border-2 border-gray-200 shadow-md relative">
              {/* Canvas Grid */}
              <div className="absolute inset-0 opacity-10 rounded-2xl" style={{
                backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>

              {/* Placeholder for UML Elements */}
              <div className="absolute top-12 left-12 text-center p-4">
                <div className="rounded-xl border-2 shadow-md bg-white p-6 w-52" style={{ borderColor: subjectColor }}>
                  <div 
                    className="border-b-2 pb-2 mb-3 text-white py-2 rounded-t-lg"
                    style={{ backgroundColor: subjectColor }}
                  >
                    <span>Usuario</span>
                  </div>
                  <div className="text-left text-sm text-gray-600 border-b border-gray-200 pb-3 mb-3 space-y-1">
                    <div>- id: int</div>
                    <div>- nombre: string</div>
                    <div>- email: string</div>
                  </div>
                  <div className="text-left text-sm text-gray-600 space-y-1">
                    <div>+ prestar()</div>
                    <div>+ devolver()</div>
                  </div>
                </div>
              </div>

              <div className="absolute top-12 right-12 text-center p-4">
                <div className="rounded-xl border-2 shadow-md bg-white p-6 w-52" style={{ borderColor: subjectColor }}>
                  <div 
                    className="border-b-2 pb-2 mb-3 text-white py-2 rounded-t-lg"
                    style={{ backgroundColor: subjectColor }}
                  >
                    <span>Libro</span>
                  </div>
                  <div className="text-left text-sm text-gray-600 border-b border-gray-200 pb-3 mb-3 space-y-1">
                    <div>- isbn: string</div>
                    <div>- titulo: string</div>
                    <div>- autor: string</div>
                  </div>
                  <div className="text-left text-sm text-gray-600 space-y-1">
                    <div>+ getInfo()</div>
                  </div>
                </div>
              </div>

              {/* Center Helper Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-gray-400 text-center bg-white/80 backdrop-blur-sm p-6 rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: `${subjectColor}20` }}>
                    <Boxes className="w-8 h-8" style={{ color: subjectColor }} />
                  </div>
                  <div className="text-sm text-gray-600">Área de trabajo del diagrama UML</div>
                  <div className="text-xs mt-2 text-gray-500">[API externa de diagramación se integraría aquí]</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}