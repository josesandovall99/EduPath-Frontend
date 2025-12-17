import { useState } from 'react';
import { ArrowLeft, Play, FileText, CheckCircle2, SkipBack, SkipForward, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Module {
  id: string;
  title: string;
  items: ModuleItem[];
  expanded?: boolean;
}

interface ModuleItem {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'document' | 'activity' | 'workshop';
  completed?: boolean;
}

interface TheoryContentViewProps {
  subjectName: string;
  content: {
    id: string;
    title: string;
    type: 'video' | 'document';
  };
  onBack: () => void;
  onContentChange?: (contentId: string) => void;
}

// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

export function TheoryContentView({ subjectName, content, onBack, onContentChange }: TheoryContentViewProps) {
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'module-1',
      title: 'Módulo 1: Fundamentos de la Generativa',
      expanded: true,
      items: [
        { id: '1', title: 'Resultados de aprendizaje', duration: '5 min', type: 'document', completed: true },
        { id: '2', title: 'Entendiendo la Generativa', duration: '102 min', type: 'video', completed: false },
        { id: '3', title: 'Conceptos clave de ML para IA', duration: '121 min', type: 'video', completed: false },
        { id: '4', title: 'Alineación estratégica negocios + IA', duration: '76 min', type: 'video', completed: false },
        { id: '5', title: 'Resumen de la lección', duration: '1 min', type: 'document', completed: false },
      ]
    },
    {
      id: 'module-2',
      title: 'Módulo 2: IA en marketing y cadena de suministro',
      expanded: false,
      items: [
        { id: '6', title: 'Aplicaciones en marketing', duration: '45 min', type: 'video', completed: false },
        { id: '7', title: 'Cadena de suministro optimizada', duration: '60 min', type: 'video', completed: false },
      ]
    },
    {
      id: 'module-3',
      title: 'Módulo 3: Diplomado en la Generativa Aplicada - Primera Evaluación',
      expanded: false,
      items: [
        { id: '8', title: 'Impulsar la adopción organizacional de la IA', duration: '30 min', type: 'activity', completed: false },
      ]
    }
  ]);

  const [currentProgress] = useState(8);
  const subjectColor = subjectColors[subjectName] || '#4A90E2';

  const toggleModule = (moduleId: string) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video': return Play;
      case 'document': return FileText;
      case 'activity': return BookOpen;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      {/* Left Sidebar - Course Modules */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        {/* Sidebar Header */}
        <div 
          className="p-4 border-b border-gray-200 text-white"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm">Módulos del Curso</span>
          </div>
        </div>

        {/* Modules List */}
        <div className="p-3">
          {modules.map((module, idx) => (
            <div key={module.id} className="mb-3">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.id)}
                className="w-full text-left p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                    style={{ backgroundColor: subjectColor }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm text-[#3A4A5B]">{module.title}</span>
                </div>
                {module.expanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Module Items */}
              {module.expanded && (
                <div className="mt-2 ml-4 space-y-1">
                  {module.items.map((item) => {
                    const ItemIcon = getItemIcon(item.type);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onContentChange?.(item.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-3 text-sm transition-all group"
                      >
                        <div className="w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0" style={{ borderColor: item.completed ? subjectColor : '#E5E7EB' }}>
                          {item.completed && <CheckCircle2 className="w-4 h-4" style={{ color: subjectColor }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[#3A4A5B] group-hover:text-[#4A90E2] transition-colors truncate">{item.title}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <ItemIcon className="w-3 h-3" />
                            <span>{item.duration}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-[#3A4A5B]">{subjectName}</h1>
                  <p className="text-gray-500 text-sm">{content.title}</p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Progreso del módulo:</span>
                  <span className="text-xl" style={{ color: subjectColor }}>{currentProgress}%</span>
                </div>
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${currentProgress}%`, backgroundColor: subjectColor }}></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-[#F2F2F2] p-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            {/* Content Display */}
            {content.type === 'video' ? (
              <div className="mb-6">
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: `${subjectColor}20` }}
                    >
                      <Play className="w-12 h-12" style={{ color: subjectColor }} />
                    </div>
                    <span className="text-gray-400">Video: {content.title}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-md">
                  <h2 className="text-[#3A4A5B] mb-6">{content.title}</h2>
                  <div className="space-y-4 text-gray-700">
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                      tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
                      quis nostrud exercitation ullamco laboris.
                    </p>
                    <p>
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
                      eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
                    </p>
                    <div 
                      className="border-l-4 pl-4 my-6 p-4 rounded-r-lg"
                      style={{ 
                        borderColor: subjectColor,
                        backgroundColor: `${subjectColor}10`
                      }}
                    >
                      <p className="text-gray-700 italic">
                        Nota importante: Este es un concepto clave que debes recordar para 
                        las evaluaciones posteriores.
                      </p>
                    </div>
                    <p>
                      Sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut 
                      perspiciatis unde omnis iste natus error sit voluptatem.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Resources */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 shadow-md">
              <h3 className="text-[#3A4A5B] mb-4">Recursos Complementarios</h3>
              <div className="space-y-3">
                <a 
                  href="#" 
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:shadow-md transition-all group"
                  style={{ ':hover': { borderColor: subjectColor } }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${subjectColor}15` }}
                  >
                    <FileText className="w-5 h-5" style={{ color: subjectColor }} />
                  </div>
                  <span className="text-gray-700 text-sm flex-1">Documento de lectura complementaria.pdf</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:shadow-md transition-all group"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${subjectColor}15` }}
                  >
                    <FileText className="w-5 h-5" style={{ color: subjectColor }} />
                  </div>
                  <span className="text-gray-700 text-sm flex-1">Enlaces de interés externos</span>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-[#4A90E2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
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
      </div>
    </div>
  );
}