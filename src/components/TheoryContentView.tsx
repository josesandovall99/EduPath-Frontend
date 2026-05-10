import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, FileText, CheckCircle2, BookOpen, ChevronDown, ChevronRight, Loader, Lock } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ProgrammingContentView } from './ProgrammingContentView';
import { UMLDiagramView } from './UMLDiagramView';
import { QuizActivityView } from './QuizActivityView';
import { MultipleChoiceExercise } from './MultipleChoiceExercise';
import { OrderingExercise } from './OrderingExercise';
import { MatchingExercise } from './MatchingExercise';
import { API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/fetchCache';

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
    max-width: 100%;
    margin: 1rem 0;
    display: block;
    overflow-x: auto;
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
  desbloqueado?: boolean;
  completo?: boolean;
}

interface ModuleItem {
  id: string;
  title: string;
  duration?: string;
  type: 'video' | 'document' | 'activity' | 'workshop';
  completed?: boolean;
  visualizado?: boolean;
  descripcion?: string;
  url?: string;
  recommended?: boolean;
  ejercicioData?: Ejercicio; // Datos del ejercicio si este ítem es un ejercicio
  desbloqueado?: boolean;
  completo?: boolean;
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

interface Ejercicio {
  id: number;
  contenido_id: number;
  puntos: number;
  resultado_ejercicio: string;
  tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar';
  configuracion?: any;
  actividad?: {
    id: number;
    titulo: string;
    descripcion?: string;
    nivel_dificultad?: 'facil' | 'medio' | 'dificil';
  };
}

interface TheoryContentViewProps {
  subjectName: string;
  asignaturaId?: string | number;
  /** Si true: bloqueo tema→subtema→contenido según la asignatura (configurado por docente/admin) */
  progresionSecuencial?: boolean;
  onHome?: () => void;
  content: {
    id: string;
    title: string;
    type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
    isMiniproyecto?: boolean;
    actividadId?: number;
  };
  temaId?: string;
  onBack: () => void;
  onContentChange?: (contentId: string) => void;
  estudianteId?: number;
}

// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

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

const getYouTubeEmbedUrl = (rawUrl?: string): string | null => {
  if (!rawUrl) return null;

  try {
    let candidate = rawUrl.trim();

    // Legacy records may store full iframe HTML; extract src value if present.
    const iframeSrcMatch = candidate.match(/src=["']([^"']+)["']/i);
    if (iframeSrcMatch?.[1]) {
      candidate = iframeSrcMatch[1];
    }

    // Some records store HTML-encoded params (&amp;).
    candidate = candidate.replace(/&amp;/g, '&');

    // If a raw YouTube video ID was stored, convert directly.
    if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      return `https://www.youtube.com/embed/${candidate}`;
    }

    const normalized = candidate.startsWith('http') ? candidate : `https://${candidate}`;
    const url = new URL(normalized);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    const isYouTubeHost =
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'youtube-nocookie.com';

    if (!isYouTubeHost) return null;

    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else {
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'watch') {
        videoId = url.searchParams.get('v') || '';
      } else if (pathParts[0] === 'embed') {
        videoId = pathParts[1] || '';
      } else if (pathParts[0] === 'shorts' || pathParts[0] === 'live') {
        videoId = pathParts[1] || '';
      } else if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[pathParts.length - 1])) {
        videoId = pathParts[pathParts.length - 1];
      }
    }

    if (!videoId) return null;

    const safeVideoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeVideoId) return null;

    return `https://www.youtube.com/embed/${safeVideoId}`;
  } catch {
    return null;
  }
};

const isDirectVideoUrl = (rawUrl?: string): boolean => {
  if (!rawUrl) return false;
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(rawUrl);
};


// Función para ordenar subtemas basado en secuencias
const orderSubtemasBySequence = (subtemas: any[], sequences: any[]): any[] => {
  if (!Array.isArray(sequences) || sequences.length === 0) {
    return [];
  }

  // Crear un mapa de secuencias
  const sequenceMap = new Map<number, number>();
  const destinos = new Set<number>();
  const origen_ids = new Set<number>();

  // Filtrar solo secuencias activas
  const activeSequences = sequences.filter(s => s.estado);

  activeSequences.forEach(seq => {
    const origen = seq.subtema_origen_id;
    const destino = seq.subtema_destino_id;
    
    if (origen && destino) {
      sequenceMap.set(origen, destino);
      destinos.add(destino);
      origen_ids.add(origen);
    }
  });

  // Encontrar subtemas iniciales (no son destino de ninguna secuencia)
  const initialSubtemas = new Set<number>();
  subtemas.forEach(s => {
    if (!destinos.has(s.id)) {
      initialSubtemas.add(s.id);
    }
  });

  // Si no hay subtemas iniciales pero hay secuencias, usar el primer origen
  if (initialSubtemas.size === 0 && origen_ids.size > 0) {
    initialSubtemas.add(Array.from(origen_ids)[0]);
  }

  // Construir el orden recorriendo las secuencias
  const ordered: any[] = [];
  const visited = new Set<number>();
  const subtemasMap = new Map(subtemas.map(s => [s.id, s]));

  const addToChain = (subtemaId: number) => {
    if (visited.has(subtemaId)) return;

    const subtema = subtemasMap.get(subtemaId);
    if (subtema) {
      ordered.push(subtema);
      visited.add(subtemaId);

      const nextId = sequenceMap.get(subtemaId);
      if (nextId) {
        addToChain(nextId);
      }
    }
  };

  // Procesar cadenas iniciales
  initialSubtemas.forEach(id => addToChain(id));

  return ordered;
};



export function TheoryContentView({ subjectName, asignaturaId, progresionSecuencial = false, content, temaId, onBack, onHome, onContentChange, estudianteId }: TheoryContentViewProps) {

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedContentData, setSelectedContentData] = useState<ModuleItem | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [ejercicioAsociado, setEjercicioAsociado] = useState<Ejercicio | null>(null);
  const [loadingEjercicio, setLoadingEjercicio] = useState(false);
  const [subtemasConEstadoProgreso, setSubtemasConEstadoProgreso] = useState<Map<string, any>>(new Map());
  const [contenidosConEstadoProgreso, setContenidosConEstadoProgreso] = useState<Map<string, any>>(new Map());
  /** Refs con el último mapa del servidor (el estado de React puede ir atrasado en callbacks de setModules). */
  const subtemasEstadoSrvRef = useRef<Map<string, any>>(new Map());
  const contenidosEstadoSrvRef = useRef<Map<string, any>>(new Map());
  const subjectColor = subjectColors[subjectName] || '#4A90E2';
  const secuencialRef = useRef(Boolean(progresionSecuencial));
  const seleccionMarcarRef = useRef<{ contentId: string | null; estudianteId: number | undefined }>({
    contentId: null,
    estudianteId: undefined,
  });

  useEffect(() => {
    seleccionMarcarRef.current = {
      contentId: selectedContentId,
      estudianteId,
    };
  }, [selectedContentId, estudianteId]);

  useEffect(() => {
    secuencialRef.current = Boolean(progresionSecuencial);
  }, [progresionSecuencial]);

  /** No pisar desbloqueo que ya calculó el backend (evita F5 con todo bloqueado por la cadena local). */
  const aplicarServidorDesbloqueoContenidos = (itemsIn: ModuleItem[], mapSrv: Map<string, any>): ModuleItem[] => {
    if (!secuencialRef.current || mapSrv.size === 0) return itemsIn;
    return itemsIn.map((it) => {
      if (it.ejercicioData) return it;
      const row = mapSrv.get(String(it.id));
      if (row?.desbloqueado !== true) return it;
      return { ...it, desbloqueado: true };
    });
  };

  const aplicarServidorDesbloqueoSubtemas = (modsIn: Module[], mapSrv: Map<string, any>): Module[] => {
    if (!secuencialRef.current || mapSrv.size === 0) return modsIn;
    return modsIn.map((m) => {
      const row = mapSrv.get(String(m.id));
      if (row?.desbloqueado !== true) return m;
      return { ...m, desbloqueado: true };
    });
  };

  // Inyectar estilos en el documento
  useEffect(() => {
    if (!document.querySelector('style[data-html-content-styles]')) {
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-html-content-styles', 'true');
      styleSheet.textContent = htmlContentStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  // Cargar progreso dinámico del estudiante
  useEffect(() => {
    obtenerProgresoAsignatura();
  }, [asignaturaId, temaId, estudianteId]);

  // Intentar persistir progreso antes de cerrar/recargar (el timer de 3s a veedor no llega si F5 rápido)
  useEffect(() => {
    const flushMarcarSeleccion = () => {
      const { contentId, estudianteId: sid } = seleccionMarcarRef.current;
      if (!contentId || !sid || contentId.startsWith('ejercicio-')) return;
      const token = localStorage.getItem('authToken');
      fetch(`${API_BASE_URL}/contenidos/marcar-visualizado`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          contenido_id: parseInt(contentId, 10),
          estudiante_id: sid,
        }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', flushMarcarSeleccion);
    return () => window.removeEventListener('pagehide', flushMarcarSeleccion);
  }, []);
  useEffect(() => {
    if (!estudianteId || (!asignaturaId && !temaId)) return;

    const intervalId = setInterval(() => {
      obtenerProgresoAsignatura();
    }, 120000); // 2 minutos

    return () => clearInterval(intervalId);
  }, [asignaturaId, temaId, estudianteId]);

  // Actualizar progreso cuando la pestaña vuelve a ser visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && estudianteId && (asignaturaId || temaId)) {
        obtenerProgresoAsignatura();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [asignaturaId, temaId, estudianteId]);

  // Obtener estado de visualización del contenido
  const obtenerEstadoVisualizacion = async (contenidoId: string) => {
    if (!estudianteId) return false;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/contenidos/verificar-visualizacion?contenido_id=${contenidoId}&estudiante_id=${estudianteId}`
      );
      
      if (!response.ok) {
        console.warn('No se pudo obtener estado de visualización');
        return false;
      }
      
      const data = await response.json();
      return data.visualizado || false;
    } catch (err) {
      console.error('Error al obtener estado de visualización:', err);
      return false;
    }
  };

  // Obtener el mismo progreso de asignatura que se muestra en la pantalla anterior.
  const obtenerProgresoAsignatura = async () => {
    if (!estudianteId || (!asignaturaId && !temaId)) {
      console.warn('No hay estudiante_id, asignaturaId o temaId disponibles');
      return;
    }

    try {
      const url = asignaturaId
        ? `${API_BASE_URL}/progresos/por-asignatura?asignatura_id=${asignaturaId}&estudiante_id=${estudianteId}`
        : `${API_BASE_URL}/progresos/por-tema?tema_id=${temaId}&estudiante_id=${estudianteId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}:`, errorText);
        setCurrentProgress(0);
        return;
      }
      
      const data = await response.json();
      const porcentaje = asignaturaId
        ? data.resumen?.porcentajeTotalAsignatura || 0
        : data.resumen?.porcentajeTotalTema || 0;
      setCurrentProgress(Math.round(porcentaje));
    } catch (err) {
      console.error('Error al obtener progreso:', err);
      setCurrentProgress(0);
    }
  };

  const recalcularGatingItems = (items: ModuleItem[]): ModuleItem[] => {
    if (!secuencialRef.current) {
      return items.map((item) => ({ ...item, desbloqueado: true }));
    }
    return items.map((item, i) => {
      if (i === 0) return { ...item, desbloqueado: true };
      const prev = items[i - 1];
      const prevDone = prev.ejercicioData
        ? Boolean(prev.completo)
        : Boolean(prev.visualizado);
      return { ...item, desbloqueado: prevDone };
    });
  };

  const esItemCompleto = (item: ModuleItem) => (
    item.ejercicioData ? Boolean(item.completo) : Boolean(item.visualizado)
  );

  const esModuloCompletoPorItems = (items: ModuleItem[]) => (
    items.length > 0 && items.every(esItemCompleto)
  );

  const recalcularGatingSubtemas = (mods: Module[]): Module[] => {
    if (!secuencialRef.current) {
      return mods.map((module) => ({ ...module, desbloqueado: true }));
    }
    return mods.map((module, idx) => {
      if (idx === 0) return { ...module, desbloqueado: true };
      const prev = mods[idx - 1];
      let prevComplete: boolean;
      if (prev.items.length > 0 && !prev.loadingItems) {
        prevComplete = esModuloCompletoPorItems(prev.items);
      } else {
        prevComplete = prev.completo ?? false;
      }
      return { ...module, desbloqueado: prevComplete };
    });
  };

  // Marcar contenido como visualizado cuando se selecciona
  const marcarContenidoVisualizado = async (contenidoId: string) => {
    if (!estudianteId) {
      console.warn('No hay estudiante_id disponible');
      return;
    }

    const authToken = localStorage.getItem('authToken');

    try {
      const response = await fetch(`${API_BASE_URL}/contenidos/marcar-visualizado`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          contenido_id: parseInt(contenidoId),
          estudiante_id: estudianteId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const cid = String(contenidoId);
      const nuevo = new Map(contenidosEstadoSrvRef.current);
      const prev = nuevo.get(cid) ?? {};
      nuevo.set(cid, { ...prev, completado: true, completado_srv: true });
      contenidosEstadoSrvRef.current = nuevo;
      setContenidosConEstadoProgreso(nuevo);

      // Actualizar el estado del módulo para mostrar que fue visualizado y recalcular gating
      setModules(prevModules => {
        const updated = prevModules.map(m => ({
          ...m,
          items: aplicarServidorDesbloqueoContenidos(
            recalcularGatingItems(
              m.items.map(item =>
                item.id === contenidoId ? { ...item, visualizado: true, completo: true } : item
              )
            ),
            contenidosEstadoSrvRef.current
          )
        }));
        return aplicarServidorDesbloqueoSubtemas(
          recalcularGatingSubtemas(
            updated.map(m => ({
              ...m,
              completo: m.items.length > 0 ? esModuloCompletoPorItems(m.items) : m.completo
            }))
          ),
          subtemasEstadoSrvRef.current
        );
      });

    } catch (err) {
      console.error('Error al marcar contenido como visualizado:', err);
    }
  };

  // Manejar la finalización de un ejercicio: actualizar estado local y recalcular gating
  const handleExerciseComplete = (ejercicioItemId: string) => {
    setModules(prevModules => {
      const updated = prevModules.map(m => {
        const hasItem = m.items.some(i => i.id === ejercicioItemId);
        if (!hasItem) return m;
        const updatedItems = aplicarServidorDesbloqueoContenidos(
          recalcularGatingItems(
            m.items.map(item =>
              item.id === ejercicioItemId
                ? { ...item, completo: true, visualizado: true }
                : item
            )
          ),
          contenidosEstadoSrvRef.current
        );
        return { ...m, items: updatedItems, completo: esModuloCompletoPorItems(updatedItems) };
      });
      return aplicarServidorDesbloqueoSubtemas(
        recalcularGatingSubtemas(updated),
        subtemasEstadoSrvRef.current
      );
    });
    obtenerProgresoAsignatura();
  };

  // Intentar cargar estado de desbloqueo (OPCIONAL - no rompe si endpoint no existe)
  const intentarCargarEstadoDesbloqueo = async () => {
    const estadoVacio = {
      subtemas: new Map<string, any>(),
      contenidos: new Map<string, any>()
    };

    if (!estudianteId || !temaId) return estadoVacio;

    try {
      let mapSubtemas = new Map<string, any>();
      let mapContenidos = new Map<string, any>();

      // Ambas peticiones en paralelo
      const [responseSubtemas, responseContenidos] = await Promise.all([
        fetch(`${API_BASE_URL}/progresos/estado-subtemas-tema?estudiante_id=${estudianteId}&tema_id=${temaId}`),
        fetch(`${API_BASE_URL}/progresos/estado-contenidos-tema?estudiante_id=${estudianteId}&tema_id=${temaId}`),
      ]);

      if (responseSubtemas.ok) {
        const dataSubtemas = await responseSubtemas.json();
        const rawSub = Array.isArray(dataSubtemas) ? dataSubtemas : dataSubtemas?.subtemas;
        mapSubtemas = new Map<string, any>(
          Array.isArray(rawSub) ? rawSub.map((item: any) => [String(item.id ?? item.subtema_id), item]) : []
        );
        setSubtemasConEstadoProgreso(mapSubtemas);
        subtemasEstadoSrvRef.current = mapSubtemas;
      }

      if (responseContenidos.ok) {
        const dataContenidos = await responseContenidos.json();
        const rawCont = Array.isArray(dataContenidos) ? dataContenidos : dataContenidos?.contenidos;
        mapContenidos = new Map<string, any>(
          Array.isArray(rawCont) ? rawCont.map((item: any) => [String(item.id ?? item.contenido_id), item]) : []
        );
        setContenidosConEstadoProgreso(mapContenidos);
        contenidosEstadoSrvRef.current = mapContenidos;
      }

      return { subtemas: mapSubtemas, contenidos: mapContenidos };
    } catch (err) {
      return estadoVacio;
    }
  };

  // Calcular progreso de cada subtema
  const calcularProgresoSubtemas = async (subtemas: any[]) => {
    if (!estudianteId || !temaId) return new Map<string, { porcentaje: number }>();
    
    const progresoMap = new Map<string, { porcentaje: number }>();
    
    for (const subtema of subtemas) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/progresos/por-subtema?subtema_id=${subtema.id}&estudiante_id=${estudianteId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const porcentaje = data.resumen?.porcentajeTotalSubtema || 0;
          progresoMap.set(String(subtema.id), { porcentaje });
        } else {
          progresoMap.set(String(subtema.id), { porcentaje: 0 });
        }
      } catch (err) {
        progresoMap.set(String(subtema.id), { porcentaje: 0 });
      }
    }
    
    return progresoMap;
  };

  // Cargar ejercicio asociado a un contenido
  const cargarEjercicioAsociado = async (contenidoId: string) => {
    setLoadingEjercicio(true);
    setEjercicioAsociado(null);
    
    try {
      // Filtra directamente por contenido en el servidor
      const url = `${API_BASE_URL}/ejercicios?contenido_id=${contenidoId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ejercicios: Ejercicio[] = await response.json();

      const ejercicio = ejercicios.find(ej => {
        // Comparar ambos como números para evitar problemas de tipo string vs number
        return Number(ej.contenido_id) === parseInt(contenidoId);
      });
      
      if (ejercicio) {
        
        // Detectar el subtipo real desde la configuración para ejercicios de tipo "Preguntas"
        let ejercicioConTipoReal = { ...ejercicio };
        if (ejercicio.tipo_ejercicio === 'Preguntas' && ejercicio.configuracion?.tipo) {
          if (ejercicio.configuracion.tipo === 'opcion-unica') {
            ejercicioConTipoReal.tipo_ejercicio = 'Opción única';
          } else if (ejercicio.configuracion.tipo === 'ordenar') {
            ejercicioConTipoReal.tipo_ejercicio = 'Ordenar';
          } else if (ejercicio.configuracion.tipo === 'relacionar') {
            ejercicioConTipoReal.tipo_ejercicio = 'Relacionar';
          }
        }
        
        setEjercicioAsociado(ejercicioConTipoReal);
      } else {
        setEjercicioAsociado(null);
      }
    } catch (err) {
      console.error('Error al cargar ejercicio asociado:', err);
      setEjercicioAsociado(null);
    } finally {
      setLoadingEjercicio(false);
    }
  };

  // Fetch subtemas when temaId changes
  useEffect(() => {
    if (!temaId) {
      setModules(FALLBACK_MODULES);
      return;
    }

    const fetchSubtemas = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        // Tras F5 el prop puede estar incompleto: leer modo secuencial desde el servidor antes de gated items
        let modoSecuencial = secuencialRef.current;
        try {
          if (asignaturaId != null && String(asignaturaId).trim() !== '') {
            const ar = await fetch(`${API_BASE_URL}/asignaturas/${asignaturaId}`, { headers });
            if (ar.ok) {
              const ad = await ar.json();
              if (typeof ad?.progresion_secuencial === 'boolean') {
                modoSecuencial = Boolean(ad.progresion_secuencial);
              }
            }
          }
        } catch (_) {
          /* mantener modo del prop */
        }
        secuencialRef.current = modoSecuencial;

        // Datos estructurales con caché (60s TTL) — segunda visita es instantánea
        // Datos de progreso sin caché — siempre frescos
        const subtemasPromise      = cachedFetch(`${API_BASE_URL}/subtemas/por-tema/${temaId}`, { headers }) as Promise<any[]>;
        const seqPromise           = cachedFetch(`${API_BASE_URL}/secuencias-subtema/tema/${temaId}/ordenados`, { headers }) as Promise<any>;
        const estSubtemasPromise   = estudianteId
          ? fetch(`${API_BASE_URL}/progresos/estado-subtemas-tema?estudiante_id=${estudianteId}&tema_id=${temaId}`, { headers })
          : Promise.resolve(null);
        const estContenidosPromise = estudianteId
          ? fetch(`${API_BASE_URL}/progresos/estado-contenidos-tema?estudiante_id=${estudianteId}&tema_id=${temaId}`, { headers })
          : Promise.resolve(null);

        // Fase 1: estructura — datos en caché llegan en <1ms en revisitas
        // seqData ya viene ordenado del backend (es array de subtemas, no de secuencias)
        const [subtemasData, seqData] = await Promise.all([subtemasPromise, seqPromise]);

        // El endpoint /ordenados devuelve los subtemas ya ordenados — usarlos directamente.
        // Si devuelve array vacío o falla, caer al array de subtemas sin ordenar.
        let subtemas: any[] = (Array.isArray(seqData) && seqData.length > 0)
          ? seqData
          : (Array.isArray(subtemasData) ? subtemasData : []);

        // Estructura de subtemas; si hay progresión secuencial sin mapa del servidor todavía, solo el primero aparece disponible como pista inicial
        const transformedModules: Module[] = Array.isArray(subtemas)
          ? subtemas.map((subtema: any, idx: number) => ({
              id: subtema.id || `subtema-${idx}`,
              title: subtema.nombre || `Subtema ${idx + 1}`,
              items: [],
              expanded: idx === 0,
              loadingItems: idx === 0,
              desbloqueado: !modoSecuencial || idx === 0,
              completo: false,
            }))
          : [];

        const haySubtemasReales = transformedModules.length > 0;

        // Fase 2: progreso del servidor antes de pintar contenidos/subtemas finales (evita F5 descoordinando locks)
        const [estSubtemasRes, estContenidosRes] = await Promise.all([estSubtemasPromise, estContenidosPromise]);

        let mapSubtemas = new Map<string, any>();
        let mapContenidos = new Map<string, any>();

        if (estSubtemasRes?.ok) {
          const d = await estSubtemasRes.json();
          const raw = Array.isArray(d) ? d : d?.subtemas;
          if (Array.isArray(raw)) {
            mapSubtemas = new Map(raw.map((item: any) => [String(item.id ?? item.subtema_id), item]));
            setSubtemasConEstadoProgreso(mapSubtemas);
            subtemasEstadoSrvRef.current = mapSubtemas;
          }
        }
        if (estContenidosRes?.ok) {
          const d = await estContenidosRes.json();
          const raw = Array.isArray(d) ? d : d?.contenidos;
          if (Array.isArray(raw)) {
            mapContenidos = new Map(raw.map((item: any) => [String(item.id ?? item.contenido_id), item]));
            setContenidosConEstadoProgreso(mapContenidos);
            contenidosEstadoSrvRef.current = mapContenidos;
          }
        }

        let modsParaMostrar: Module[] = haySubtemasReales ? transformedModules : FALLBACK_MODULES;

        if (modoSecuencial && mapSubtemas.size > 0 && haySubtemasReales) {
          modsParaMostrar = transformedModules.map((mod, idx) => {
            const est = mapSubtemas.get(String(mod.id));
            const porcentaje = est?.porcentaje ?? 0;
            const desbloqueado = est?.desbloqueado ?? (idx === 0);
            const completo = est?.completo ?? (porcentaje >= 100);
            return { ...mod, desbloqueado, completo };
          });
        }

        setModules(modsParaMostrar);
        setLoading(false);

        const primeraSubId =
          haySubtemasReales ? String(transformedModules[0].id) : null;
        if (primeraSubId) {
          await loadContenidosForSubtema(primeraSubId, modsParaMostrar, mapContenidos);
        }

      } catch (err) {
        console.error('Error fetching subtemas:', err);
        setError(`Error loading subtemas: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setModules(FALLBACK_MODULES);
        setLoading(false);
      }
    };

    fetchSubtemas();
  }, [temaId, estudianteId, progresionSecuencial]);

  // Fetch contenidos for a specific subtema
  // ...existing code...

  // Fetch contenidos for a specific subtema
  const loadContenidosForSubtema = async (
    subtemaId: string,
    modulosActuales?: Module[],
    estadoContenidosActual?: Map<string, any>
  ) => {
    try {
      const mapSrvContenidos = estadoContenidosActual ?? contenidosEstadoSrvRef.current;

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Contenidos y ejercicios con caché — en paralelo y rápidos en revisitas
      const [contenidosData, ejerciciosData] = await Promise.all([
        cachedFetch(`${API_BASE_URL}/secuencias-contenido/subtema/${subtemaId}/ordenados`, { headers }) as Promise<Contenido[]>,
        asignaturaId
          ? cachedFetch(`${API_BASE_URL}/ejercicios?asignatura_id=${asignaturaId}`, { headers }) as Promise<any[]>
          : Promise.resolve(null),
      ]);

      const contenidos: Contenido[] = Array.isArray(contenidosData) ? contenidosData : [];

      // El endpoint /ordenados ya devuelve solo los contenidos en secuencia — no hace falta
      // cargar todas las secuencias globales para filtrar
      const contenidosSecuenciados = contenidos;

      // Mapear a ModuleItem usando mapSrvContenidos (ya cargado) en vez de N fetches
      const items: ModuleItem[] = contenidosSecuenciados.map((contenido: Contenido, idx: number) => {
        const estadoProgreso = mapSrvContenidos.get(String(contenido.id));
        // completado del mapa equivale a visualizado
        const visualizado = estadoProgreso?.completado ?? estadoProgreso?.completo ?? false;
        const completo = estadoProgreso?.completo ?? estadoProgreso?.completado ?? visualizado;
        return {
          id: contenido.id.toString(),
          title: contenido.titulo,
          duration: undefined,
          type: mapTipoToType(contenido.tipo),
          completed: visualizado,
          visualizado,
          descripcion: contenido.descripcion,
          url: contenido.url,
          recommended: idx === 0,
          desbloqueado: false,
          completo,
        };
      });

      // Cargar ejercicios asociados y agregarlos como ítems separados
      try {
        // Usa ejerciciosData ya cargado en el Promise.all superior
        if (ejerciciosData && Array.isArray(ejerciciosData)) {
          const todosEjercicios: Ejercicio[] = ejerciciosData;
          
          // IDs de contenidos de este subtema
          const contenidoIdsDeEsteSubtema = contenidosSecuenciados.map(c => String(c.id));
          
          // Mostrar contenido_id de cada ejercicio para debug
          todosEjercicios.forEach(ej => {
          });
          
          // Filtrar ejercicios que pertenecen a contenidos de este subtema
          const ejerciciosDeEsteSubtema = todosEjercicios.filter(ej => {
            const match = contenidoIdsDeEsteSubtema.includes(String(ej.contenido_id));
            return match;
          });
          
          
          // Cargar estado de aprobación real de cada ejercicio en paralelo
          const aprobadosMap = new Map<number, boolean>();
          if (estudianteId) {
            await Promise.all(
              ejerciciosDeEsteSubtema.map(async (ej) => {
                try {
                  const r = await fetch(
                    `${API_BASE_URL}/respuestasEstudianteEjercicio/verificar-completado?ejercicio_id=${ej.id}&estudiante_id=${estudianteId}`
                  );
                  if (!r.ok) { aprobadosMap.set(ej.id, false); return; }
                  const data = await r.json();
                  aprobadosMap.set(ej.id, Boolean(data?.completado));
                } catch {
                  aprobadosMap.set(ej.id, false);
                }
              })
            );
          }

          // Mezclar contenidos + ejercicios en orden (ejercicios DESPUÉS de su contenido)
          const itemsConEjercicios: ModuleItem[] = [];
          items.forEach(contenidoItem => {
            itemsConEjercicios.push(contenidoItem);
            const ejerciciosDeEsteContenido = ejerciciosDeEsteSubtema.filter(ej =>
              Number(ej.contenido_id) === Number(contenidoItem.id)
            );
            ejerciciosDeEsteContenido.forEach(ejercicio => {
              const aprobado = aprobadosMap.get(ejercicio.id) || false;
              const ejercicioItem: ModuleItem = {
                id: `ejercicio-${ejercicio.id}`,
                title: ejercicio.actividad?.titulo || 'Ejercicio Práctico',
                duration: undefined,
                type: 'activity',
                completed: aprobado,        // ← estado real
                visualizado: aprobado,      // checkbox marcado solo si aprobado
                completo: aprobado,
                descripcion: ejercicio.actividad?.descripcion || '',
                url: undefined,
                recommended: false,
                desbloqueado: false,        // se calcula al final
                ejercicioData: ejercicio,
              };
              itemsConEjercicios.push(ejercicioItem);
            });
          });

          // Reemplazar el array items
          items.length = 0;
          items.push(
            ...aplicarServidorDesbloqueoContenidos(
              recalcularGatingItems(itemsConEjercicios),
              mapSrvContenidos
            )
          );
        }
      } catch (err) {
        console.error('Error al cargar ejercicios para el menú:', err);
        // No es crítico, continuar sin ejercicios
      }

      const gatedItems = aplicarServidorDesbloqueoContenidos(recalcularGatingItems(items), mapSrvContenidos);

      // Update the module with the loaded items
      setModules(prevModules => {
        const updatedModules = prevModules.map(m =>
          m.id === subtemaId
            ? {
                ...m,
                items: gatedItems,
                loadingItems: false,
                completo: esModuloCompletoPorItems(gatedItems)
              }
            : m
        );
        return aplicarServidorDesbloqueoSubtemas(
          recalcularGatingSubtemas(updatedModules),
          subtemasEstadoSrvRef.current
        );
      });

      // Seleccionar el primer contenido secuenciado automáticamente si existe
      if (gatedItems.length > 0) {
        const first = gatedItems[0];
        setSelectedContentId(first.id);
        setSelectedContentData(first);
        onContentChange?.(first.id);
      } else {
        // Si no hay contenidos secuenciados, limpiar selección
        setSelectedContentId(null);
        setSelectedContentData(null);
      }
    } catch (err) {
      console.error('Error fetching contenidos:', err);
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

  useEffect(() => {
    if (!selectedContentId || !estudianteId) return;
    if (selectedContentId.startsWith('ejercicio-')) return;

    const srv = contenidosEstadoSrvRef.current.get(String(selectedContentId));
    if (srv?.completado === true || srv?.completo === true) return;

    const contenidoActual = selectedContentId;
    const timer = window.setTimeout(() => {
      void marcarContenidoVisualizado(contenidoActual);
      void obtenerProgresoAsignatura();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [selectedContentId, estudianteId]);

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
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        {/* Sidebar Header — alineado en altura con el header derecho (px-8 py-4 + ícono 48x48) */}
        <div
          className="px-6 py-4 border-b border-gray-200 text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-base leading-tight">Módulos del Curso</p>
              <p className="text-white/80 text-xs">Navega entre subtemas</p>
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="p-3">
          {modules.map((module, idx) => {
            const isModuleLocked = module.desbloqueado === false;
            
            return (
            <div key={module.id} className="mb-3">
              {/* Module Header */}
              <button
                onClick={() => {
                  if (isModuleLocked) {
                    alert('Este subtema está bloqueado. Complete el subtema anterior para desbloquearlo.');
                    return;
                  }
                  toggleModule(module.id);
                }}
                className={`w-full text-left p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between transition-all shadow-sm ${
                  isModuleLocked 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:bg-gray-50 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shadow-sm flex-shrink-0"
                    style={{ backgroundColor: isModuleLocked ? '#9CA3AF' : subjectColor }}
                  >
                    {isModuleLocked ? <Lock className="w-4 h-4" /> : (idx + 1)}
                  </div>
                  <span className={`text-sm leading-snug break-words min-w-0 ${isModuleLocked ? 'text-gray-400' : 'text-[#3A4A5B]'}`}>
                    {module.title}
                  </span>
                  {module.completo && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                {!isModuleLocked && (module.expanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                ))}
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
                      const isItemLocked = item.desbloqueado === false;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (isItemLocked) {
                              alert('Este contenido está bloqueado. Complete el contenido anterior para desbloquearlo.');
                              return;
                            }
                            
                            // Si es un ejercicio, manejarlo de forma especial
                            if (item.ejercicioData) {
                              setSelectedContentId(item.id);
                              setSelectedContentData(null); // No hay contenido asociado
                              
                              // Detectar el subtipo real desde la configuración para ejercicios de tipo "Preguntas"
                              let ejercicioConTipoReal = { ...item.ejercicioData };
                              if (item.ejercicioData.tipo_ejercicio === 'Preguntas' && item.ejercicioData.configuracion?.tipo) {
                                if (item.ejercicioData.configuracion.tipo === 'opcion-unica') {
                                  ejercicioConTipoReal.tipo_ejercicio = 'Opción única';
                                } else if (item.ejercicioData.configuracion.tipo === 'ordenar') {
                                  ejercicioConTipoReal.tipo_ejercicio = 'Ordenar';
                                } else if (item.ejercicioData.configuracion.tipo === 'relacionar') {
                                  ejercicioConTipoReal.tipo_ejercicio = 'Relacionar';
                                }
                              }
                              
                              setEjercicioAsociado(ejercicioConTipoReal); // Cargar el ejercicio directamente
                              setLoadingEjercicio(false);
                            } else {
                              // Es un contenido normal
                              setSelectedContentId(item.id);
                              setSelectedContentData(item);
                              setEjercicioAsociado(null); // Limpiar ejercicio asociado
                              onContentChange?.(item.id);
                            }
                          }}
                          className={`w-full text-left p-3 border rounded-lg flex items-center gap-3 text-base transition-all group ${
                            isItemLocked
                              ? 'opacity-60 cursor-not-allowed border-gray-200 bg-white'
                              : isSelected
                                ? 'border-blue-400 bg-blue-50'
                                : item.ejercicioData
                                  ? 'border-gray-200 bg-white hover:bg-gray-50'         // ejercicio → blanco
                                  : 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'   // contenido → azul muy tenue
                          }`}
                        >
                          {isItemLocked ? (
                            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                              <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                          ) : (() => {
                            // Distinción clara: ejercicio = COMPLETADO (aprobado) | contenido = VISTO (visualizado)
                            const isDone = item.ejercicioData
                              ? Boolean(item.completo)        // ejercicio: aprobado
                              : Boolean(item.visualizado);    // contenido: visualizado
                            return (
                              <div
                                className="w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0"
                                style={{ borderColor: isDone ? subjectColor : isSelected ? subjectColor : '#E5E7EB' }}
                              >
                                {isDone && <CheckCircle2 className="w-4 h-4" style={{ color: subjectColor }} />}
                              </div>
                            );
                          })()}
                          <div className="flex-1 min-w-0">
                            <div className={`transition-colors break-words leading-snug ${
                              isItemLocked
                                ? 'text-gray-400'
                                : isSelected
                                  ? 'text-blue-600 font-semibold'
                                  : 'text-[#3A4A5B] group-hover:text-[#4A90E2]'
                            }`}>
                              {item.title}
                              {item.completo && <CheckCircle2 className="w-4 h-4 ml-2 inline text-green-500" />}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
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
            );
          })}
        </div>
      </div>

      {/* Right Content Asignatura */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button type="button" onClick={onHome} title="Ir al panel principal" className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </button>
                <div>
                  <h1 className="text-[#3A4A5B]">{subjectName}</h1>
                  <p className="text-gray-500 text-sm">{content.title}</p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Progreso:</span>
                  <span className="text-xl" style={{ color: subjectColor }}>
                    {`${currentProgress}%`}
                  </span>
                </div>
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${currentProgress}%`, backgroundColor: subjectColor }}></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F2F2F2] p-8">
          <div className="mx-auto w-full max-w-[1500px]">
            <button onClick={onBack} className="app-back-button mb-6">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            {/* Content Display */}
            {/* Caso 1: Solo ejercicio (sin contenido) */}
            {!selectedContentData && ejercicioAsociado && (
              <div className="mb-6">
                {/* Componente del ejercicio */}
                {ejercicioAsociado.tipo_ejercicio === 'Compilador' && (
                  <ProgrammingContentView
                    content={{
                      id: ejercicioAsociado.contenido_id?.toString() || '0',
                      title: ejercicioAsociado.actividad?.titulo || 'Ejercicio',
                      type: 'activity'
                    }}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                    embedded={true}
                    exerciseData={ejercicioAsociado}
                    exerciseId={ejercicioAsociado.id}
                  />
                )}

                {ejercicioAsociado.tipo_ejercicio === 'Diagramas UML' && (
                  <UMLDiagramView
                    activity={{
                      id: ejercicioAsociado.id.toString(),
                      title: ejercicioAsociado.actividad?.titulo || 'Ejercicio',
                      description: ejercicioAsociado.actividad?.descripcion
                    }}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                  />
                )}

                {ejercicioAsociado.tipo_ejercicio === 'Preguntas' && (
                  <QuizActivityView
                    subjectName={subjectName}
                    activity={{
                      id: ejercicioAsociado.id.toString(),
                      title: ejercicioAsociado.actividad?.titulo || 'Ejercicio',
                      description: ejercicioAsociado.actividad?.descripcion
                    }}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                  />
                )}

                {ejercicioAsociado.tipo_ejercicio === 'Opción única' && (
                  <MultipleChoiceExercise
                    activity={{ id: ejercicioAsociado.id.toString(), title: ejercicioAsociado.actividad?.titulo || 'Ejercicio' }}
                    enunciado={(ejercicioAsociado.configuracion?.enunciado) || ejercicioAsociado.actividad?.descripcion || 'Selecciona la opción correcta'}
                    opciones={Array.isArray(ejercicioAsociado.configuracion?.opciones) ? ejercicioAsociado.configuracion?.opciones : undefined}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                    embedded={true}
                  />
                )}

                {ejercicioAsociado.tipo_ejercicio === 'Ordenar' && (
                  <OrderingExercise
                    activity={{ id: ejercicioAsociado.id.toString(), title: ejercicioAsociado.actividad?.titulo || 'Ejercicio' }}
                    enunciado={(ejercicioAsociado.configuracion?.enunciado) || ejercicioAsociado.actividad?.descripcion || 'Ordena los elementos correctamente'}
                    items={Array.isArray(ejercicioAsociado.configuracion?.items) ? ejercicioAsociado.configuracion?.items : undefined}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                    embedded={true}
                  />
                )}

                {ejercicioAsociado.tipo_ejercicio === 'Relacionar' && (
                  <MatchingExercise
                    activity={{ id: ejercicioAsociado.id.toString(), title: ejercicioAsociado.actividad?.titulo || 'Ejercicio' }}
                    enunciado={(ejercicioAsociado.configuracion?.enunciado) || ejercicioAsociado.actividad?.descripcion || 'Relaciona conceptos con definiciones'}
                    pares={Array.isArray(ejercicioAsociado.configuracion?.pares) ? ejercicioAsociado.configuracion?.pares : undefined}
                    onBack={onBack}
                    onComplete={selectedContentId ? () => handleExerciseComplete(selectedContentId) : undefined}
                    embedded={true}
                  />
                )}
              </div>
            )}

            {/* Caso 2: Contenido (con o sin ejercicio) */}
            {selectedContentData && (
              <>
                {/* Mostrar SIEMPRE el contenido primero */}
                {selectedContentData.type === 'video' ? (
                  <div className="mb-6 -mx-2 sm:mx-0">
                    {selectedContentData.url ? (
                      <div className="w-full aspect-video min-h-[420px] lg:min-h-[560px] rounded-2xl overflow-hidden shadow-lg bg-gray-900">
                        {getYouTubeEmbedUrl(selectedContentData.url) ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={getYouTubeEmbedUrl(selectedContentData.url) || undefined}
                            title={selectedContentData.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : isDirectVideoUrl(selectedContentData.url) ? (
                          <video width="100%" height="100%" controls className="w-full h-full object-cover">
                            <source src={selectedContentData.url} type={`video/${(selectedContentData.url.match(/\.(mp4|webm|ogg)(\?|#|$)/i)?.[1] || 'mp4').toLowerCase()}`} />
                            Este navegador no soporta el elemento de video
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
                        <div
                          className="quill-render mb-6"
                          dangerouslySetInnerHTML={{ __html: selectedContentData.descripcion }}
                        />
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

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
