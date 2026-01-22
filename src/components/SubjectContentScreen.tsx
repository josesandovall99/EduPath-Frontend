import { ArrowLeft, CheckCircle2, Clock, FileText, PlayCircle, Edit, Share2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Subject {
  id: string;
  name: string;
}

interface SubjectContentScreenProps {
  subject: Subject;
  onBack: () => void;
  onContentSelect?: (content: Content, temaId: string) => void;
  estudianteId?: number;
}

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
  duration?: string;
  status: 'completed' | 'in-progress' | 'not-started';
}

interface Tema {
  id: number;
  nombre: string;
  area_id: number;
}

interface Subtema {
  id: number;
  nombre: string;
  tema_id: number;
}

interface Contenido {
  id: number;
  titulo: string;
  tipo: string;
  duracion?: string;
  subtema_id: number;
}

// Colores por materia
const subjectColors: Record<string, { primary: string; light: string; icon: any }> = {
  'fundamentos': { primary: '#4A90E2', light: '#E3F2FD', icon: 'Code' },
  'analisis': { primary: '#7ED6A7', light: '#E8F5E9', icon: 'Database' },
  'alcance': { primary: '#F5A97F', light: '#FFF3E0', icon: 'BarChart3' }
};

const getSubjectColor = (subjectId: string) => {
  return subjectColors[subjectId] || { primary: '#4A90E2', light: '#E3F2FD' };
};

const API_BASE_URL = '/api';

const FALLBACK_CONTENT: Content[] = [
  { id: '1', title: 'Introducción al curso', type: 'video', duration: '15 min', status: 'completed' },
  { id: '2', title: 'Conceptos básicos', type: 'document', status: 'completed' },
  { id: '3', title: 'Variables y tipos de datos', type: 'video', duration: '25 min', status: 'in-progress' },
  { id: '4', title: 'Ejercicios prácticos - Módulo 1', type: 'activity', status: 'in-progress' },
  { id: '5', title: 'Estructuras de control', type: 'video', duration: '30 min', status: 'not-started' },
];

const mapTipoToType = (tipo: string): Content['type'] => {
  const tipoMap: Record<string, Content['type']> = {
    'video': 'video',
    'documento': 'document',
    'actividad': 'activity',
    'cuestionario': 'quiz',
    'uml': 'uml',
    'taller': 'workshop'
  };
  return tipoMap[tipo.toLowerCase()] || 'document';
};

const contentData: Content[] = [
  { id: '1', title: 'Introducción al curso', type: 'video', duration: '15 min', status: 'completed' },
  { id: '2', title: 'Conceptos básicos', type: 'document', status: 'completed' },
  { id: '3', title: 'Variables y tipos de datos', type: 'video', duration: '25 min', status: 'in-progress' },
  { id: '4', title: 'Ejercicios prácticos - Módulo 1', type: 'activity', status: 'in-progress' },
  { id: '5', title: 'Estructuras de control', type: 'video', duration: '30 min', status: 'not-started' },
  { id: '6', title: 'Funciones y procedimientos', type: 'document', status: 'not-started' },
  { id: '7', title: 'Taller evaluativo', type: 'activity', status: 'not-started' },
  { id: '8', title: 'Cuestionario de evaluación', type: 'quiz', status: 'not-started' },
  { id: '9', title: 'Diagrama de clases', type: 'uml', status: 'not-started' },
  { id: '10', title: 'Taller de diseño', type: 'workshop', status: 'not-started' },
];

const getTypeIcon = (type: Content['type']) => {
  switch (type) {
    case 'video': return PlayCircle;
    case 'document': return FileText;
    case 'activity': return Edit;
    case 'quiz': return CheckCircle2;
    case 'uml': return Share2;
    case 'workshop': return Users;
  }
};

const getTypeLabel = (type: Content['type']) => {
  switch (type) {
    case 'video': return 'Video';
    case 'document': return 'Documento';
    case 'activity': return 'Actividad';
    case 'quiz': return 'Cuestionario';
    case 'uml': return 'Diagrama UML';
    case 'workshop': return 'Taller';
  }
};

const getStatusBadge = (status: Content['status']) => {
  switch (status) {
    case 'completed':
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">Completado</span>;
    case 'in-progress':
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">En progreso</span>;
    case 'not-started':
      return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">No iniciado</span>;
  }
};

export function SubjectContentScreen({ subject, onBack, onContentSelect, estudianteId }: SubjectContentScreenProps) {
  const [contentList, setContentList] = useState<Content[]>([]);
  const [temasMap, setTemasMap] = useState<Map<string, string>>(new Map()); // Map content.id to temaId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const colors = getSubjectColor(subject.id);

  // Obtener progreso dinámico del estudiante en el área
  const obtenerProgresoArea = async () => {
    if (!estudianteId || !subject.id) {
      console.warn('No hay estudiante_id o subject.id disponibles');
      return;
    }

    setLoadingProgress(true);
    try {
      const url = `http://localhost:4000/progresos/por-area?area_id=${subject.id}&estudiante_id=${estudianteId}`;
      console.log(`🔄 Obteniendo progreso desde: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error ${response.status}:`, errorText);
        setCurrentProgress(0);
        return;
      }
      
      const data = await response.json();
      const porcentaje = data.resumen?.porcentajeTotalArea || 0;
      setCurrentProgress(Math.round(porcentaje));
      console.log(`✅ Progreso del área: ${porcentaje}%`);
    } catch (err) {
      console.error('❌ Error al obtener progreso:', err);
      setCurrentProgress(0);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Cargar progreso dinámico del estudiante
  useEffect(() => {
    obtenerProgresoArea();
  }, [subject.id, estudianteId]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching temas for area:', subject.id);

        // Obtener todos los temas del área
        const temasResponse = await fetch(`${API_BASE_URL}/temas/por-area/${subject.id}`);

        // ✅ Validación: Verificar si response es exitosa
        if (!temasResponse.ok) {
          throw new Error(`Failed to fetch temas: HTTP ${temasResponse.status}`);
        }

        const contentType = temasResponse.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Invalid response type from /temas/por-area. Expected JSON, got: ${contentType}`);
        }

        const temas: Tema[] = await temasResponse.json();
        console.log('✅ Temas loaded:', temas);

        // Ordenar temas por la columna 'orden' antes de transformar
        const temasOrdenados = temas.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

        // Transformar temas a formato Content
        const transformedContent = temasOrdenados.map((tema) => ({
          id: tema.id.toString(),
          title: tema.nombre,
          type: 'document' as const,
          duration: undefined,
          status: 'not-started' as const
        }));

        // Create map of content.id -> temaId
        const newTemasMap = new Map<string, string>();
        temas.forEach((tema) => {
          newTemasMap.set(tema.id.toString(), tema.id.toString());
        });
        setTemasMap(newTemasMap);

        if (transformedContent.length === 0) {
          console.warn('⚠️ No temas found, using fallback data');
          setContentList(FALLBACK_CONTENT);
          setError('No se encontraron temas en la BD. Se muestran datos de prueba.');
        } else {
          setContentList(transformedContent);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('❌ Error al obtener temas:', errorMessage);
        setError(`Error: ${errorMessage}. Se muestran datos de prueba.`);
        setContentList(FALLBACK_CONTENT);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [subject.id]);
  
  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">EduPath</h1>
                <p className="text-gray-500 text-sm">{subject.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[#3A4A5B]">Juan Estudiante</p>
                <p className="text-gray-500 text-sm">Ingeniería de Sistemas</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white shadow-md">
                <span className="text-xl">👨‍🎓</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>

        {/* Subject Header Card */}
        <div 
          className="rounded-2xl p-8 mb-8 shadow-lg text-white"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-3xl mb-3">{subject.name}</h2>
              <p className="text-white/90 text-lg mb-4">
                Aprende los fundamentos y conceptos esenciales a través de videos, documentos y ejercicios prácticos.
              </p>
              <div className="flex gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  <span>12 temas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>8 horas de contenido</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{currentProgress}% completado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#3A4A5B]">Tu Progreso</h3>
            <span className="text-2xl" style={{ color: colors.primary }}>
              {loadingProgress ? '...' : `${currentProgress}%`}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${currentProgress}%`, backgroundColor: colors.primary }}
            ></div>
          </div>
        </div>

        {/* Content List */}
        <div className="mb-6">
          <h3 className="text-[#3A4A5B] mb-4 text-xl">Contenidos del Curso</h3>
        </div>

        {error && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-yellow-700 text-sm">⚠️ {error}</p>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando contenidos...</p>
            </div>
          ) : contentList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay contenidos disponibles</p>
            </div>
          ) : (
          contentList.map((content) => {
            const Icon = getTypeIcon(content.type);
            return (
              <button
                key={content.id}
                className="w-full bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-5 text-left group"
                onClick={() => {
                  const temaId = temasMap.get(content.id) || content.id;
                  onContentSelect && onContentSelect(content, temaId);
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Type Icon */}
                  <div 
                    className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: colors.primary }} />
                  </div>

                  {/* Content Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-[#3A4A5B] group-hover:text-[#4A90E2] transition-colors">
                        {content.title}
                      </h4>
                      {content.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-[#7ED6A7]" />
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{getTypeLabel(content.type)}</span>
                      {content.duration && (
                        <>
                          <span>•</span>
                          <span>{content.duration}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {getStatusBadge(content.status)}
                    <div className="text-gray-400 group-hover:text-[#4A90E2] transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
          )}
        </div>

        {/* Additional Resources */}
        <div className="mt-8 bg-white rounded-2xl shadow-md p-6">
          <h4 className="text-[#3A4A5B] mb-4 text-xl">Recursos Adicionales</h4>
          <div className="grid grid-cols-3 gap-4">
            <a 
              href="#" 
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A90E2] hover:bg-blue-50 transition-all group"
            >
              <FileText className="w-6 h-6 text-gray-400 group-hover:text-[#4A90E2] mb-2" />
              <p className="text-[#3A4A5B] text-sm">Bibliografía del curso</p>
            </a>
            <a 
              href="#" 
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A90E2] hover:bg-blue-50 transition-all group"
            >
              <Share2 className="w-6 h-6 text-gray-400 group-hover:text-[#4A90E2] mb-2" />
              <p className="text-[#3A4A5B] text-sm">Material complementario</p>
            </a>
            <a 
              href="#" 
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A90E2] hover:bg-blue-50 transition-all group"
            >
              <FileText className="w-6 h-6 text-gray-400 group-hover:text-[#4A90E2] mb-2" />
              <p className="text-[#3A4A5B] text-sm">Enlaces de interés</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
