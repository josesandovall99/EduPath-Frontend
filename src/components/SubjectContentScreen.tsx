import { ArrowLeft, CheckCircle2, FileText, PlayCircle, Edit, Share2, Users, Lock, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/fetchCache';
import { parseConfigurableMiniproyecto } from './configurableEmbeddedExercises';

interface Subject {
  id: string;
  name: string;
  progresion_secuencial?: boolean;
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
  asignaturaId?: number;
  asignaturaNombre?: string;
  tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
  miniproyectoAprobado?: boolean;
  miniproyectoMode?: 'legacy' | 'configurable';
  // Campos opcionales para el sistema de desbloqueo progresivo
  desbloqueado?: boolean;
  completo?: boolean;
  porcentaje?: number;
}

interface Tema {
  id: number;
  nombre: string;
  asignatura_id: number;
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
  seleccionadoParaEstudiantes?: boolean;
  Asignatura?: { id: number; nombre: string; tipo_pilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null };
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
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">Completado</span>;
    case 'in-progress':
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">En progreso</span>;
    case 'not-started':
      return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">No iniciado</span>;
  }
};

export function SubjectContentScreen({ subject, onBack, onContentSelect, estudianteId }: SubjectContentScreenProps) {
  const [contentList, setContentList] = useState<Content[]>([]);
  const [temasMap, setTemasMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [miniproyectoNotice, setMiniproyectoNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const colors = getSubjectColor(subject.id);
  const totalTemas = contentList.length;

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  // Una sola carga en paralelo: N+3 peticiones secuenciales → 4 simultáneas
  useEffect(() => {
    let cancelled = false;
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Incluye metadatos de asignatura (progresión secuencial) para no depender solo del estado en memoria tras F5
        const [
          asignaturaJson,
          temasData,
          minisData,
          estadoRes,
          progresoRes,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/asignaturas/${subject.id}`, { headers }).then(async (r) =>
            r.ok ? r.json() : null,
          ),
          cachedFetch(`${API_BASE_URL}/temas/por-asignatura/${subject.id}`, { headers }) as Promise<Tema[]>,
          cachedFetch(`${API_BASE_URL}/miniproyectos?asignatura_id=${subject.id}`, { headers }) as Promise<any[]>,
          estudianteId
            ? fetch(`${API_BASE_URL}/progresos/estado-temas-asignatura?estudiante_id=${estudianteId}&asignatura_id=${subject.id}`, {
                headers,
              })
            : Promise.resolve(null),
          estudianteId
            ? fetch(`${API_BASE_URL}/progresos/por-asignatura?asignatura_id=${subject.id}&estudiante_id=${estudianteId}`, {
                headers,
              })
            : Promise.resolve(null),
        ]);

        let progresionSecuencial = Boolean(subject.progresion_secuencial);
        if (asignaturaJson && typeof asignaturaJson.progresion_secuencial === 'boolean') {
          progresionSecuencial = Boolean(asignaturaJson.progresion_secuencial);
        }

        const temas: Tema[] = Array.isArray(temasData) ? temasData : [];
        const temasOrdenados = temas.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

        let progresoJson: any = null;

        // Progreso global de la asignatura (+ detalle por tema como respaldo del desbloqueo)
        if (progresoRes?.ok) {
          progresoJson = await progresoRes.json();
          if (!cancelled) setCurrentProgress(Math.round(progresoJson?.resumen?.porcentajeTotalAsignatura || 0));
        }

        const temaProgPorId = new Map<string, { porcentaje: number; completo: boolean }>();
        const detalle = progresoJson?.temas?.detalle;
        if (Array.isArray(detalle)) {
          detalle.forEach((row: any) => {
            const idStr = String(row.id);
            const total =
              Number(row.totalContenidos ?? 0) + Number(row.totalEjercicios ?? 0);
            const done =
              Number(row.contenidosVistos ?? 0) + Number(row.ejerciciosAprobados ?? 0);
            const pct = row.completado ? 100 : total > 0 ? Math.round((done / total) * 100) : 0;
            temaProgPorId.set(idStr, { porcentaje: pct, completo: Boolean(row.completado) });
          });
        }

        // Estado de desbloqueo oficial + porcentaje por tema — si falla o falta huecos, usar temaProgPorId
        const estadoMap = new Map<string, { desbloqueado?: boolean; completo?: boolean; porcentaje: number }>();
        if (estadoRes?.ok) {
          const estadoData = await estadoRes.json();
          if (Array.isArray(estadoData.temas)) {
            estadoData.temas.forEach((t: any) => {
              estadoMap.set(String(t.id), {
                desbloqueado: t.desbloqueado,
                completo: t.completo,
                porcentaje: typeof t.porcentaje === 'number' ? t.porcentaje : temaProgPorId.get(String(t.id))?.porcentaje ?? 0,
              });
            });
          }
        }

        temasOrdenados.forEach((tema) => {
          const sid = String(tema.id);
          const fb = temaProgPorId.get(sid);
          const cur = estadoMap.get(sid);
          if (!fb && !cur) return;
          estadoMap.set(sid, {
            desbloqueado: cur?.desbloqueado,
            completo:
              cur?.completo ??
              fb?.completo ??
              ((typeof cur?.porcentaje === 'number' ? cur.porcentaje : fb?.porcentaje ?? 0) >= 100),
            porcentaje:
              typeof cur?.porcentaje === 'number' ? cur.porcentaje : (fb?.porcentaje ?? 0),
          });
        });
        const transformedContent = temasOrdenados.map((tema, index) => {
          const temaId = tema.id.toString();
          const estado = estadoMap.get(temaId);
          const porcentaje = estado?.porcentaje ?? 0;

          let desbloqueado: boolean;
          if (!progresionSecuencial) {
            desbloqueado = true;
          } else if (typeof estado?.desbloqueado === 'boolean') {
            desbloqueado = estado.desbloqueado;
          } else if (index === 0) {
            desbloqueado = true;
          } else {
            const anterior = estadoMap.get(temasOrdenados[index - 1].id.toString());
            desbloqueado = (anterior?.porcentaje ?? 0) >= 100;
          }

          const completo = estado?.completo ?? (porcentaje >= 100);
          const status: Content['status'] = completo ? 'completed' : porcentaje > 0 ? 'in-progress' : 'not-started';

          return { id: temaId, title: tema.nombre, type: 'document' as const, duration: undefined, status, desbloqueado, completo, porcentaje };
        });

        // Miniproyectos publicados con verificación de aprobación en paralelo
        let miniproyectosContent: Content[] = [];
        try {
          if (minisData) {
            const minis: MiniproyectoApiItem[] = Array.isArray(minisData) ? minisData : [];
            const visibles = minis.filter((m) => m.seleccionadoParaEstudiantes);
            let aprobadosMap = new Map<number, boolean>();

            if (estudianteId && visibles.length > 0) {
              const aprobados = await Promise.all(
                visibles.map(async (mini) => {
                  try {
                    const cfg = parseConfigurableMiniproyecto(mini.respuesta_miniproyecto);
                    if (cfg && cfg.exercises.length > 0) {
                      const r = await fetch(`${API_BASE_URL}/miniproyectos/${mini.id}/configurable-progress`, { headers });
                      if (!r.ok) return [mini.id, false] as const;
                      const d = await r.json();
                      return [mini.id, Boolean(d?.completado)] as const;
                    }
                    const r = await fetch(`${API_BASE_URL}/evaluaciones/by?miniproyecto_id=${mini.id}`, { headers });
                    if (!r.ok) return [mini.id, false] as const;
                    const d = await r.json();
                    const aprobado = (Array.isArray(d) ? d : []).some((e) => String(e?.estado || '').toUpperCase() === 'APROBADO');
                    return [mini.id, aprobado] as const;
                  } catch {
                    return [mini.id, false] as const;
                  }
                })
              );
              aprobadosMap = new Map(aprobados);
            }

            miniproyectosContent = visibles.map((mini) => {
              const cfg = parseConfigurableMiniproyecto(mini.respuesta_miniproyecto);
              const aprobado = aprobadosMap.get(mini.id) || false;
              return {
                id: mini.id.toString(),
                title: mini.Actividad?.titulo || 'Miniproyecto',
                type: (cfg ? 'activity' : [11, 13].includes(Number(mini.actividad_id)) ? 'workshop' : 'activity') as Content['type'],
                duration: undefined,
                status: aprobado ? 'completed' : ('not-started' as const),
                isMiniproyecto: true,
                actividadId: Number(mini.actividad_id),
                asignaturaId: mini.Asignatura?.id,
                asignaturaNombre: mini.Asignatura?.nombre,
                tipoPilar: mini.Asignatura?.tipo_pilar || null,
                miniproyectoAprobado: aprobado,
                miniproyectoMode: cfg ? 'configurable' : 'legacy',
                completo: aprobado,
              };
            });
          }
        } catch (minisError) {
          console.warn('Error al cargar miniproyectos:', minisError);
        }

        const newTemasMap = new Map<string, string>();
        temas.forEach((t) => newTemasMap.set(t.id.toString(), t.id.toString()));

        if (!cancelled) {
          setTemasMap(newTemasMap);
          const fullContent = [...transformedContent, ...miniproyectosContent];
          if (fullContent.length === 0) {
            setContentList(FALLBACK_CONTENT);
            setError('No se encontraron temas en la BD. Se muestran datos de prueba.');
          } else {
            setContentList(fullContent);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Error: ${err instanceof Error ? err.message : 'desconocido'}. Se muestran datos de prueba.`);
          setContentList(FALLBACK_CONTENT);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [subject.id, subject.progresion_secuencial, estudianteId]);
  
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
                <p className="text-[#3A4A5B]">{localStorage.getItem('nombreEstudiante') || 'Estudiante'}</p>
                <p className="text-gray-500 text-sm">EduPath</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white shadow-md">
                <User className="h-5 w-5" />
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
              <p className="text-white/90 text-lg">
                Aprende los fundamentos y conceptos esenciales a través de videos, documentos y ejercicios prácticos.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#3A4A5B]">Progreso</h3>
            <span className="text-2xl" style={{ color: colors.primary }}>
              {`${currentProgress}%`}
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
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        )}

        {miniproyectoNotice && (
          <div
            className="fixed top-24 right-8 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-lg"
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
            const isLockedByProgress = content.desbloqueado === false;
            const isApprovedMiniproyecto = Boolean(content.isMiniproyecto && content.miniproyectoAprobado);
            const isLocked = isLockedByProgress || isApprovedMiniproyecto;
            
            return (
              <button
                key={`${content.id}-${content.isMiniproyecto ? 'miniproyecto' : 'tema'}`}
                className={`w-full bg-white rounded-xl shadow-md transition-all duration-300 p-5 text-left group ${
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
                  {/* Type Icon */}
                  <div 
                    className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
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

                  {/* Content Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className={`transition-colors ${
                        isLocked 
                          ? 'text-gray-400' 
                          : 'text-[#3A4A5B] group-hover:text-[#4A90E2]'
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

      </main>
    </div>
  );
}
