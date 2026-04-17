import { ArrowLeft, CheckCircle2, Clock, FileText, PlayCircle, Edit, Share2, Users, Lock, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface Subject {
  id: string;
  name: string;
}

interface SubjectContentScreenProps {
  subject: Subject;
  onBack: () => void;
  onContentSelect?: (content: Content, temaId?: string) => void;
  estudianteId?: number;
}

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
  duration?: string;
  status: 'completed' | 'in-progress' | 'not-started';
  isMiniproyecto?: boolean;
  actividadId?: number;
  areaId?: number;
  areaNombre?: string;
  miniproyectoAprobado?: boolean;
  // Campos opcionales para el sistema de desbloqueo progresivo
  desbloqueado?: boolean;
  completo?: boolean;
  porcentaje?: number;
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

interface MiniproyectoApiItem {
  id: number;
  actividad_id: number;
  entregable?: string;
  respuesta_miniproyecto?: string;
  Area?: { id: number; nombre: string };
  Actividad?: { id: number; titulo?: string; descripcion?: string; nivel_dificultad?: string };
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

const getTypeLabel = (content: Content) => {
  if (content.isMiniproyecto) return 'Miniproyecto';
  switch (content.type) {
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
      return <span className="app-badge app-badge--green">Completado</span>;
    case 'in-progress':
      return <span className="app-badge app-badge--blue">En progreso</span>;
    case 'not-started':
      return <span className="app-badge app-badge--slate">No iniciado</span>;
  }
};

export function SubjectContentScreen({ subject, onBack, onContentSelect, estudianteId }: SubjectContentScreenProps) {
  const [contentList, setContentList] = useState<Content[]>([]);
  const [temasMap, setTemasMap] = useState<Map<string, string>>(new Map()); // Map content.id to temaId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [temasConEstadoProgreso, setTemasConEstadoProgreso] = useState<Map<string, any>>(new Map()); // Estado de desbloqueo opcional
  const [miniproyectoNotice, setMiniproyectoNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const colors = getSubjectColor(subject.id);
  const totalTemas = contentList.length;

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  // Obtener progreso dinámico del estudiante en el área
  const obtenerProgresoArea = async () => {
    if (!estudianteId || !subject.id) {
      console.warn('No hay estudiante_id o subject.id disponibles');
      return;
    }

    setLoadingProgress(true);
    try {
      const url = `${API_BASE_URL}/progresos/por-area?area_id=${subject.id}&estudiante_id=${estudianteId}`;
      console.log(`Obteniendo progreso desde: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}:`, errorText);
        setCurrentProgress(0);
        return;
      }
      
      const data = await response.json();
      const porcentaje = data.resumen?.porcentajeTotalArea || 0;
      setCurrentProgress(Math.round(porcentaje));
      console.log(`Progreso del área: ${porcentaje}%`);
    } catch (err) {
      console.error('Error al obtener progreso:', err);
      setCurrentProgress(0);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Calcular progreso de cada tema individualmente
  const calcularProgresoTemas = async (temas: Tema[]) => {
    if (!estudianteId) return new Map<string, { porcentaje: number }>();
    
    const progresoMap = new Map<string, { porcentaje: number }>();
    
    for (const tema of temas) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/progresos/por-tema?tema_id=${tema.id}&estudiante_id=${estudianteId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const porcentaje = data.resumen?.porcentajeTotalTema || 0;
          progresoMap.set(tema.id.toString(), { porcentaje });
        } else {
          progresoMap.set(tema.id.toString(), { porcentaje: 0 });
        }
      } catch (err) {
        progresoMap.set(tema.id.toString(), { porcentaje: 0 });
      }
    }
    
    return progresoMap;
  };

  // Intentar cargar estado de desbloqueo de temas (opcional, no afecta funcionalidad si falla)
  const intentarCargarEstadoDesbloqueo = async () => {
    if (!estudianteId || !subject.id) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/progresos/estado-temas-area?estudiante_id=${estudianteId}&area_id=${subject.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const estadoMap = new Map<string, any>();
        
        if (data.temas && Array.isArray(data.temas)) {
          data.temas.forEach((tema: any) => {
            estadoMap.set(tema.id.toString(), {
              desbloqueado: tema.desbloqueado,
              completo: tema.completo,
              porcentaje: tema.porcentaje || 0
            });
          });
          setTemasConEstadoProgreso(estadoMap);
          console.log('Estado de desbloqueo cargado:', estadoMap);
        }
      } else {
        console.log('Endpoint de desbloqueo no disponible, usando comportamiento estándar');
      }
    } catch (err) {
      console.log('Sistema de desbloqueo no disponible, usando comportamiento estándar');
    }
  };

  // Cargar progreso dinámico del estudiante
  useEffect(() => {
    obtenerProgresoArea();
    intentarCargarEstadoDesbloqueo();
  }, [subject.id, estudianteId]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching temas for area:', subject.id);

        // Obtener todos los temas del área
        const temasResponse = await fetch(`${API_BASE_URL}/temas/por-area/${subject.id}`);

        // Validación: verificar si response es exitosa
        if (!temasResponse.ok) {
          throw new Error(`Failed to fetch temas: HTTP ${temasResponse.status}`);
        }

        const contentType = temasResponse.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Invalid response type from /temas/por-area. Expected JSON, got: ${contentType}`);
        }

        const temas: Tema[] = await temasResponse.json();
        console.log('Temas loaded:', temas);

        // Ordenar temas por la columna 'orden' antes de transformar
        const temasOrdenados = temas.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

        // Calcular progreso de cada tema
        const progresoTemas = await calcularProgresoTemas(temasOrdenados);

        // Transformar temas a formato Content con lógica de desbloqueo
        const transformedContent = temasOrdenados.map((tema, index) => {
          const temaId = tema.id.toString();
          const estadoProgreso = temasConEstadoProgreso.get(temaId);
          const progresoTema = progresoTemas.get(temaId);
          const porcentaje = progresoTema?.porcentaje ?? 0;
          
          // Determinar si está desbloqueado
          let desbloqueado: boolean;
          if (estadoProgreso?.desbloqueado !== undefined) {
            // Si el backend provee datos, usarlos
            desbloqueado = estadoProgreso.desbloqueado;
          } else {
            // Calcular localmente: primer tema siempre desbloqueado, los demás solo si el anterior está completo al 100%
            if (index === 0) {
              desbloqueado = true;
            } else {
              const temaAnterior = temasOrdenados[index - 1];
              const progresoAnterior = progresoTemas.get(temaAnterior.id.toString());
              desbloqueado = (progresoAnterior?.porcentaje ?? 0) >= 100;
            }
          }
          
          // Determinar si está completo
          const completo = estadoProgreso?.completo ?? (porcentaje >= 100);
          
          return {
            id: temaId,
            title: tema.nombre,
            type: 'document' as const,
            duration: undefined,
            status: 'not-started' as const,
            desbloqueado,
            completo,
            porcentaje
          };
        });

        // Obtener miniproyectos del área y agregarlos al final como tema fijo
        let miniproyectosContent: Content[] = [];
        try {
          const minisResponse = await fetch(`${API_BASE_URL}/miniproyectos?area_id=${subject.id}`);
          if (minisResponse.ok) {
            const minis: MiniproyectoApiItem[] = await minisResponse.json();
            const minisArray = Array.isArray(minis) ? minis : [];
            let aprobadosMap = new Map<number, boolean>();

            if (estudianteId && minisArray.length > 0) {
              const aprobados = await Promise.all(
                minisArray.map(async (mini) => {
                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/evaluaciones/by?miniproyecto_id=${mini.id}`
                    );
                    if (!response.ok) return [mini.id, false] as const;
                    const data = await response.json();
                    const evaluaciones = Array.isArray(data) ? data : [];
                    const aprobado = evaluaciones.some((item) => String(item?.estado || '').toUpperCase() === 'APROBADO');
                    return [mini.id, aprobado] as const;
                  } catch (checkError) {
                    console.warn('Error al verificar aprobación del miniproyecto:', checkError);
                    return [mini.id, false] as const;
                  }
                })
              );

              aprobadosMap = new Map(aprobados);
            }

            miniproyectosContent = minisArray.map((mini) => {
              const aprobado = aprobadosMap.get(mini.id) || false;
              return {
                id: mini.id.toString(),
                title: mini.Actividad?.titulo || 'Miniproyecto',
                type: [11, 13].includes(Number(mini.actividad_id)) ? 'workshop' : 'activity',
                duration: undefined,
                status: aprobado ? 'completed' : ('not-started' as const),
                isMiniproyecto: true,
                actividadId: Number(mini.actividad_id),
                areaId: mini.Area?.id,
                areaNombre: mini.Area?.nombre,
                miniproyectoAprobado: aprobado,
                completo: aprobado
              };
            });
          } else {
            console.warn('No se pudieron cargar miniproyectos del área');
          }
        } catch (minisError) {
          console.warn('Error al cargar miniproyectos:', minisError);
        }

        // Create map of content.id -> temaId
        const newTemasMap = new Map<string, string>();
        temas.forEach((tema) => {
          newTemasMap.set(tema.id.toString(), tema.id.toString());
        });
        setTemasMap(newTemasMap);

        const fullContent = [...transformedContent, ...miniproyectosContent];

        if (fullContent.length === 0) {
          console.warn('No temas found, using fallback data');
          setContentList(FALLBACK_CONTENT);
          setError('No se encontraron temas en la BD. Se muestran datos de prueba.');
        } else {
          setContentList(fullContent);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error al obtener temas:', errorMessage);
        setError(`Error: ${errorMessage}. Se muestran datos de prueba.`);
        setContentList(FALLBACK_CONTENT);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [subject.id, estudianteId]);
  
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">EduPath</h1>
                <p className="text-gray-500 text-sm">{subject.name}</p>
              </div>
            </div>
            
            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p>Juan Estudiante</p>
                <p>Ingeniería de Sistemas</p>
              </div>
              <div className="app-user-avatar">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>

        <section 
          className="app-page-hero app-page-hero--solid mb-8"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)`, borderColor: `${colors.primary}55` }}
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
                  <span>{totalTemas} temas</span>
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
        </section>

        <div className="app-progress-card mb-8">
          <div className="app-progress-head">
            <h3 className="text-[#3A4A5B]">Tu progreso</h3>
            <span className="text-2xl" style={{ color: colors.primary }}>
              {loadingProgress ? '...' : `${currentProgress}%`}
            </span>
          </div>
          <div className="app-progress-track" style={{ height: '0.75rem' }}>
            <div 
              className="app-progress-bar"
              style={{ width: `${currentProgress}%`, backgroundColor: colors.primary }}
            ></div>
          </div>
        </div>

        <div className="app-section-head">
          <div>
            <h3 className="app-section-title">Contenidos del curso</h3>
            <p className="app-section-description">Recorre los temas del área dentro del mismo lenguaje visual de la plataforma.</p>
          </div>
        </div>

        {error && (
          <div className="app-alert app-alert--warning mb-6">
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        )}

        {miniproyectoNotice && (
          <div
            className="fixed top-24 right-8 z-50 app-alert app-alert--success"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{miniproyectoNotice}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="app-empty-panel">
              <p>Cargando contenidos...</p>
            </div>
          ) : contentList.length === 0 ? (
            <div className="app-empty-panel">
              <p>No hay contenidos disponibles</p>
            </div>
          ) : (
          contentList.map((content) => {
            const Icon = getTypeIcon(content.type);
            const isLockedByProgress = content.desbloqueado === false;
            const isApprovedMiniproyecto = Boolean(content.isMiniproyecto && content.miniproyectoAprobado);
            const isLocked = isLockedByProgress || isApprovedMiniproyecto;
            
            return (
              <button
                key={`${content.id}-${content.isMiniproyecto ? 'miniproyecto' : 'tema'}`}
                className={`app-list-card w-full group ${
                  isLocked 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => {
                  if (isLockedByProgress) {
                    alert('Este contenido está bloqueado. Complete el contenido anterior para desbloquearlo.');
                    return;
                  }
                  if (isApprovedMiniproyecto) {
                    setMiniproyectoNotice('Ya aprobaste este miniproyecto. El acceso está bloqueado.');
                    if (noticeTimeoutRef.current) {
                      window.clearTimeout(noticeTimeoutRef.current);
                    }
                    noticeTimeoutRef.current = window.setTimeout(() => {
                      setMiniproyectoNotice(null);
                    }, 4000);
                    return;
                  }
                  if (content.isMiniproyecto) {
                    onContentSelect && onContentSelect(content);
                    return;
                  }
                  const temaId = temasMap.get(content.id) || content.id;
                  onContentSelect && onContentSelect(content, temaId);
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="app-list-card__icon w-14 h-14 flex-shrink-0"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    {isLockedByProgress ? (
                      <Lock className="w-7 h-7 text-gray-400" />
                    ) : isApprovedMiniproyecto ? (
                      <CheckCircle2 className="w-7 h-7 text-green-500" />
                    ) : (
                      <Icon className="w-7 h-7" style={{ color: colors.primary }} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className={`transition-colors ${
                        isLocked 
                          ? 'text-gray-400' 
                          : 'app-list-card__title group-hover:text-[#4A90E2]'
                      }`}>
                        {content.title}
                      </h4>
                      {content.completo && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {!content.completo && content.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-[#7ED6A7]" />
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{getTypeLabel(content)}</span>
                      {content.duration && (
                        <>
                          <span>•</span>
                          <span>{content.duration}</span>
                        </>
                      )}
                      {isApprovedMiniproyecto && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">Aprobado</span>
                        </>
                      )}
                    </div>
                  </div>

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

        <div className="app-panel p-6 mt-8">
          <h4 className="text-[#3A4A5B] mb-4 text-xl">Recursos adicionales</h4>
          <div className="app-link-grid">
            <a 
              href="#" 
              className="app-link-card group"
            >
              <FileText className="app-link-card__icon w-6 h-6 group-hover:text-[#4A90E2]" />
              <p className="app-link-card__title">Bibliografía del curso</p>
            </a>
            <a 
              href="#" 
              className="app-link-card group"
            >
              <Share2 className="app-link-card__icon w-6 h-6 group-hover:text-[#4A90E2]" />
              <p className="app-link-card__title">Material complementario</p>
            </a>
            <a 
              href="#" 
              className="app-link-card group"
            >
              <FileText className="app-link-card__icon w-6 h-6 group-hover:text-[#4A90E2]" />
              <p className="app-link-card__title">Enlaces de interés</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
