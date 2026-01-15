import { useState, useEffect } from 'react';
import { ArrowLeft, Play, FileText, CheckCircle2, SkipBack, SkipForward, BookOpen, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

// Estilos para renderizado de HTML
const htmlContentStyles = `
  .html-content p {
    margin-bottom: 1rem;
    line-height: 1.75;
  }
  
  .html-content strong,
  .html-content b {
    font-weight: 600;
    color: #2c3e50;
  }
  
  .html-content em,
  .html-content i {
    font-style: italic;
    color: #555;
  }
  
  .html-content ul,
  .html-content ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .html-content li {
    margin-bottom: 0.5rem;
    line-height: 1.75;
  }
  
  .html-content h1,
  .html-content h2,
  .html-content h3,
  .html-content h4,
  .html-content h5,
  .html-content h6 {
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #1a1a1a;
  }
  
  .html-content h1 { font-size: 1.875rem; }
  .html-content h2 { font-size: 1.5rem; }
  .html-content h3 { font-size: 1.25rem; }
  .html-content h4 { font-size: 1.125rem; }
  .html-content h5 { font-size: 1rem; }
  .html-content h6 { font-size: 0.875rem; }
  
  .html-content a {
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
  }
  
  .html-content a:hover {
    color: #004299;
  }
  
  .html-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #666;
  }
  
  .html-content code {
    background-color: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
  
  .html-content pre {
    background-color: #1f2937;
    color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .html-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }
  
  .html-content th,
  .html-content td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
  }
  
  .html-content th {
    background-color: #f9fafb;
    font-weight: 600;
  }
`;

interface Module {
  id: string;
  title: string;
  items: ModuleItem[];
  expanded?: boolean;
  loadingItems?: boolean;
}

interface ModuleItem {
  id: string;
  title: string;
  duration?: string;
  type: 'video' | 'document' | 'activity' | 'workshop';
  completed?: boolean;
  descripcion?: string;
  url?: string;
  recommended?: boolean;
}

interface Contenido {
  id: number;
  titulo: string;
  tipo: string;
  descripcion?: string;
  url?: string;
  tema_id: number;
  subtema_id: number;
}

interface TheoryContentViewProps {
  subjectName: string;
  content: {
    id: string;
    title: string;
    type: 'video' | 'document';
  };
  temaId?: string;
  onBack: () => void;
  onContentChange?: (contentId: string) => void;
}

// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

const API_BASE_URL = '/api';

// Fallback data for subtemas
const FALLBACK_MODULES: Module[] = [
  {
    id: 'fallback-1',
    title: 'Subtema 1: Fundamentos',
    expanded: true,
    items: [
      { id: '1', title: 'Introducción', duration: '5 min', type: 'document', completed: true },
      { id: '2', title: 'Conceptos básicos', duration: '10 min', type: 'video', completed: false },
    ]
  },
];

const mapTipoToType = (tipo: string): ModuleItem['type'] => {
  const tipoMap: Record<string, ModuleItem['type']> = {
    'video': 'video',
    'documento': 'document',
    'actividad': 'activity',
    'taller': 'workshop'
  };
  return tipoMap[tipo.toLowerCase()] || 'document';
};

export function TheoryContentView({ subjectName, content, temaId, onBack, onContentChange }: TheoryContentViewProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedContentData, setSelectedContentData] = useState<ModuleItem | null>(null);
  const [currentProgress] = useState(8);
  const subjectColor = subjectColors[subjectName] || '#4A90E2';

  // Inyectar estilos en el documento
  useEffect(() => {
    if (!document.querySelector('style[data-html-content-styles]')) {
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-html-content-styles', 'true');
      styleSheet.textContent = htmlContentStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  // Fetch subtemas when temaId changes
  useEffect(() => {
    if (!temaId) {
      console.log('🚫 No temaId provided, using fallback data');
      setModules(FALLBACK_MODULES);
      return;
    }

    const fetchSubtemas = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`🔄 Fetching subtemas for temaId: ${temaId}`);
        const response = await fetch(`${API_BASE_URL}/subtemas/por-tema/${temaId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const subtemas = await response.json();
        console.log('✅ Subtemas fetched:', subtemas);

        // Transform subtemas to modules format
        const transformedModules: Module[] = Array.isArray(subtemas)
          ? subtemas.map((subtema: any, idx: number) => ({
              id: subtema.id || `subtema-${idx}`,
              title: subtema.nombre || `Subtema ${idx + 1}`,
              items: [],
              expanded: idx === 0, // Expand first one by default
              loadingItems: idx === 0, // Load items for first one
            }))
          : [];

        setModules(transformedModules.length > 0 ? transformedModules : FALLBACK_MODULES);
        
        // Fetch contents for first subtema automatically
        if (transformedModules.length > 0) {
          console.log('🔄 Loading contenidos for first subtema:', transformedModules[0].id);
          loadContenidosForSubtema(transformedModules[0].id, transformedModules);
        }
      } catch (err) {
        console.error('❌ Error fetching subtemas:', err);
        setError(`Error loading subtemas: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setModules(FALLBACK_MODULES);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtemas();
  }, [temaId]);

  // Fetch contenidos for a specific subtema
  // ...existing code...

  // Fetch contenidos for a specific subtema
  const loadContenidosForSubtema = async (subtemaId: string, modulosActuales?: Module[]) => {
    try {
      console.log(`🔄 Fetching contenidos for subtemaId: ${subtemaId}`);
      // Usar el nuevo endpoint que ordena por secuencia
      const response = await fetch(`${API_BASE_URL}/secuencias-contenido/subtema/${subtemaId}/ordenados`);
      
      if (!response.ok) {
        console.warn(`⚠️ HTTP ${response.status} when fetching contenidos`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const contenidos: Contenido[] = await response.json();
      console.log('✅ Contenidos fetched ordenados por secuencia:', contenidos);

      // Obtener todas las secuencias para identificar qué contenidos están en alguna secuencia
      let sequencias: any[] = [];
      try {
        const seqResp = await fetch(`${API_BASE_URL}/secuencias-contenido`);
        if (seqResp.ok) {
          sequencias = await seqResp.json();
        } else {
          console.warn('No se pudo obtener secuencias, status:', seqResp.status);
        }
      } catch (e) {
        console.warn('Error al obtener secuencias:', e);
      }

      const contenidoIds = new Set(contenidos.map(c => c.id));
      const sequencedIds = new Set<number>();
      sequencias.forEach(s => {
        const ori = s.contenido_origen_id ?? s.origen?.id;
        const dst = s.contenido_destino_id ?? s.destino?.id;
        if (ori && contenidoIds.has(ori)) sequencedIds.add(ori);
        if (dst && contenidoIds.has(dst)) sequencedIds.add(dst);
      });

      // Filtrar solo contenidos que forman parte de alguna secuencia
      const contenidosSecuenciados = contenidos.filter(c => sequencedIds.has(c.id));

      // Transform contenidosSecuenciados to ModuleItem format
      const items: ModuleItem[] = contenidosSecuenciados.map((contenido: Contenido, idx: number) => ({
        id: contenido.id.toString(),
        title: contenido.titulo,
        duration: undefined,
        type: mapTipoToType(contenido.tipo),
        completed: false,
        descripcion: contenido.descripcion,
        url: contenido.url,
        recommended: idx === 0
      }));

      // Update the module with the loaded items (only sequenced)
      setModules(prevModules => 
        prevModules.map(m => 
          m.id === subtemaId 
            ? { ...m, items, loadingItems: false }
            : m
        )
      );

      // Seleccionar el primer contenido secuenciado automáticamente si existe
      if (items.length > 0) {
        const first = items[0];
        setSelectedContentId(first.id);
        setSelectedContentData(first);
        onContentChange?.(first.id);
      } else {
        // Si no hay contenidos secuenciados, limpiar selección
        setSelectedContentId(null);
        setSelectedContentData(null);
      }
    } catch (err) {
      console.error('❌ Error fetching contenidos:', err);
      setModules(prevModules => 
        prevModules.map(m => 
          m.id === subtemaId 
            ? { ...m, items: [], loadingItems: false }
            : m
        )
      );
    }
  };

// ...existing code...

  const toggleModule = (moduleId: string) => {
    setModules(prevModules => {
      const module = prevModules.find(m => m.id === moduleId);
      
      // Si se expande y no tiene items cargados, cargar contenidos
      if (module && !module.expanded && module.items.length === 0) {
        const updatedModules = prevModules.map(m => 
          m.id === moduleId ? { ...m, expanded: true, loadingItems: true } : m
        );
        loadContenidosForSubtema(moduleId, updatedModules);
        return updatedModules;
      } else {
        return prevModules.map(m => 
          m.id === moduleId ? { ...m, expanded: !m.expanded } : m
        );
      }
    });
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
                  {module.loadingItems ? (
                    <div className="flex items-center justify-center p-3 text-gray-500">
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-xs">Cargando contenidos...</span>
                    </div>
                  ) : module.items.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-xs">
                      No hay contenidos disponibles
                    </div>
                  ) : (
                    module.items.map((item) => {
                      const ItemIcon = getItemIcon(item.type);
                      const isSelected = selectedContentId === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedContentId(item.id);
                            setSelectedContentData(item);
                            onContentChange?.(item.id);
                          }}
                          className={`w-full text-left p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3 text-sm transition-all group ${
                            isSelected 
                              ? 'border-blue-400 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0" style={{ borderColor: item.completed ? subjectColor : isSelected ? subjectColor : '#E5E7EB' }}>
                            {item.completed && <CheckCircle2 className="w-4 h-4" style={{ color: subjectColor }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`${isSelected ? 'text-blue-600 font-semibold' : 'text-[#3A4A5B]'} group-hover:text-[#4A90E2] transition-colors truncate`}>{item.title}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <ItemIcon className="w-3 h-3" />
                              <span>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
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
            {selectedContentData && (
              <>
                {/* Content Display */}
                {selectedContentData.type === 'video' ? (
                  <div className="mb-6">
                    {selectedContentData.url ? (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-900">
                        {selectedContentData.url.includes('youtube.com') || selectedContentData.url.includes('youtu.be') ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={selectedContentData.url.includes('youtube.com') 
                              ? selectedContentData.url.replace('watch?v=', 'embed/').split('&')[0]
                              : `https://www.youtube.com/embed/${selectedContentData.url.split('/').pop()}`
                            }
                            title={selectedContentData.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : selectedContentData.url.includes('mp4') || selectedContentData.url.includes('webm') || selectedContentData.url.includes('ogg') ? (
                          <video width="100%" height="100%" controls className="w-full h-full object-cover">
                            <source src={selectedContentData.url} type={`video/${selectedContentData.url.split('.').pop()}`} />
                            Tu navegador no soporta el elemento de video
                          </video>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div 
                              className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                              style={{ backgroundColor: `${subjectColor}20` }}
                            >
                              <Play className="w-12 h-12" style={{ color: subjectColor }} />
                            </div>
                            <span className="text-gray-400">{selectedContentData.title}</span>
                            <a 
                              href={selectedContentData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 px-4 py-2 rounded-lg text-white transition-all"
                              style={{ backgroundColor: subjectColor }}
                            >
                              Abrir video
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div 
                            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: `${subjectColor}20` }}
                          >
                            <Play className="w-12 h-12" style={{ color: subjectColor }} />
                          </div>
                          <span className="text-gray-400">Video: {selectedContentData.title}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-md">
                      <h2 className="text-[#3A4A5B] mb-4 text-2xl font-semibold">{selectedContentData.title}</h2>
                      <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
                        <FileText className="w-4 h-4" style={{ color: subjectColor }} />
                        <span>{selectedContentData.type.charAt(0).toUpperCase() + selectedContentData.type.slice(1)}</span>
                      </div>

                      {/* Mostrar imagen si la URL es una imagen */}
                      {selectedContentData.url && (selectedContentData.url.includes('jpg') || selectedContentData.url.includes('jpeg') || selectedContentData.url.includes('png') || selectedContentData.url.includes('gif') || selectedContentData.url.includes('webp')) && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-md">
                          <img 
                            src={selectedContentData.url}
                            alt={selectedContentData.title}
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      )}

                      {selectedContentData.descripcion && (
                        <div className="space-y-4 text-gray-700 mb-6 html-content">
                          <div
                            className="leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: selectedContentData.descripcion }}
                            style={{
                              fontSize: '1rem',
                              lineHeight: '1.75'
                            }}
                          />
                        </div>
                      )}
                      
                      {selectedContentData.url && (
                        <div 
                          className="border-l-4 pl-4 my-6 p-4 rounded-r-lg"
                          style={{ 
                            borderColor: subjectColor,
                            backgroundColor: `${subjectColor}10`
                          }}
                        >
                          <p className="text-gray-700 text-sm mb-3">
                            <strong>Recurso disponible:</strong>
                          </p>
                          <div className="flex gap-3 flex-wrap">
                            <a 
                              href={selectedContentData.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:shadow-md"
                              style={{ backgroundColor: subjectColor }}
                            >
                              <FileText className="w-4 h-4" />
                              Abrir recurso
                            </a>
                            <a 
                              href={selectedContentData.url}
                              download
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all hover:shadow-md"
                              style={{ borderColor: subjectColor, color: subjectColor }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Descargar
                            </a>
                          </div>
                          <p className="text-gray-600 text-xs mt-3 break-all">{selectedContentData.url}</p>
                        </div>
                      )}
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
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${subjectColor}15` }}
                      >
                        <FileText className="w-5 h-5" style={{ color: subjectColor }} />
                      </div>
                      <span className="text-gray-700 text-sm flex-1">Documento complementario</span>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}