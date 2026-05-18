import { AppLogo } from './AppLogo';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Play,
  FileText,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader,
  Lock,
  Archive,
  ExternalLink,
  FileMusic,
  FileSpreadsheet,
  FileVideo,
  Globe,
  Image,
  Presentation,
  ScrollText,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { ProgrammingContentView } from './ProgrammingContentView';
import { UMLDiagramView } from './UMLDiagramView';
import { QuizActivityView } from './QuizActivityView';
import { MultipleChoiceExercise } from './MultipleChoiceExercise';
import { OrderingExercise } from './OrderingExercise';
import { MatchingExercise } from './MatchingExercise';
import { PmSimulationExercise } from './PmSimulationExercise';
import { EvmCurvaSContent } from './EvmCurvaSContent';
import { API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/fetchCache';
import { CPMSimulationViewer } from './CPMSimulationViewer';
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

const LIGHTBOX_ZOOM_MAX = 5;

function clampLightboxZoom(scale: number) {
  return Math.min(LIGHTBOX_ZOOM_MAX, Math.max(1, scale));
}

/** Icono del botón "Abrir recurso" según extensión (si hay), dominio u OneDrive/SharePoint (`:b:` ≈ PDF, etc.). */
function getResourceUrlIcon(rawUrl: string): LucideIcon {
  const url = rawUrl.trim();
  if (!url) return FileText;

  let decoded = url;
  try {
    decoded = decodeURIComponent(url.replace(/\+/g, ' '));
  } catch {
    decoded = url;
  }

  const spToken = url.match(/\/:([bwxpuv]):\//i)?.[1]?.toLowerCase()
    ?? decoded.match(/\/:([bwxpuv]):\//i)?.[1]?.toLowerCase();
  switch (spToken) {
    case 'b':
      return ScrollText; // PDF en enlaces típicos de SharePoint / OneDrive
    case 'w':
      return FileText;
    case 'x':
      return FileSpreadsheet;
    case 'p':
      return Presentation;
    case 'v':
      return FileVideo;
    case 'u':
      return Globe;
    default:
      break;
  }

  let pathname = '';
  let host = '';
  try {
    const u = new URL(url.includes('://') ? url : `https://${url}`);
    host = u.hostname.toLowerCase();
    pathname = `${u.pathname}${u.search}`.toLowerCase();
  } catch {
    pathname = url.toLowerCase();
  }

  if (host.includes('youtube.') || host === 'youtu.be') return Play;
  if (host.includes('vimeo.com')) return FileVideo;

  const extMatch = pathname.match(/\.([a-z0-9]{1,8})(?:[#?]|$)/);
  const ext = extMatch?.[1];

  switch (ext) {
    case 'pdf':
      return ScrollText;
    case 'doc':
    case 'docx':
    case 'odt':
    case 'rtf':
      return FileText;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'ppt':
    case 'pptx':
      return Presentation;
    case 'zip':
    case 'rar':
    case '7z':
      return Archive;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico':
      return Image;
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
    case 'mkv':
      return FileVideo;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return FileMusic;
    case 'html':
    case 'htm':
      return Globe;
    case 'txt':
      return FileText;
    default:
      break;
  }

  if (pathname.includes('.pdf')) return ScrollText;
  return ExternalLink;
}

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
  type:
    | 'video'
    | 'document'
    | 'activity'
    | 'workshop'
    | 'simulacion_ruta_critica'
    | 'evm_curva_s';
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
  tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar' | 'Simulación GP';
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

// Datos de respaldo para subtemas
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
    'document': 'document',
    'actividad': 'activity',
    'activity': 'activity',
    'taller': 'workshop',
    'workshop': 'workshop',
    'explicacion': 'document',
    'simulacion_ruta_critica': 'simulacion_ruta_critica',
    'simulador_curva_s': 'evm_curva_s',
    'simulador-curva-s': 'evm_curva_s',
    'simulador_evm_curva_s': 'evm_curva_s',
  };
  return tipoMap[tipo.toLowerCase()] || 'document';
};

const getYouTubeEmbedUrl = (rawUrl?: string): string | null => {
  if (!rawUrl) return null;

  try {
    let candidate = rawUrl.trim();

    // Registros legacy pueden tener HTML de iframe; extraer el valor src si existe.
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
  /** Imagen HTML ampliada a pantalla (contenido + descripción Quill); encaja en el viewport sin desbordar. */
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const lightboxZoomRef = useRef(1);
  const lightboxViewportRef = useRef<HTMLDivElement>(null);
  const lightboxPanDragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
  }>({ active: false, lastX: 0, lastY: 0 });
  const lightboxPointersRef = useRef(new Set<number>());
  const lightboxPinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const theoryDescripRef = useRef<HTMLDivElement>(null);
  const lightboxSrcKey = lightboxImage?.src ?? null;
  lightboxZoomRef.current = lightboxZoom;
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

  // Clicks en imágenes incrustadas en la descripción (HTML Quill): abrir vista ampliada
  useEffect(() => {
    const el = theoryDescripRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const img = e.target.closest('img');
      if (!img || !el.contains(img)) return;
      e.preventDefault();
      setLightboxImage({ src: img.currentSrc || img.src, alt: img.getAttribute('alt') ?? '' });
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [selectedContentData?.descripcion]);

  useEffect(() => {
    lightboxPointersRef.current.clear();
    lightboxPanDragRef.current.active = false;
    lightboxPinchRef.current = null;
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }, [lightboxSrcKey]);

  useEffect(() => {
    if (!lightboxImage) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxImage]);

  useEffect(() => {
    if (!lightboxImage) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setLightboxZoom((z) => clampLightboxZoom(z * 1.2));
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setLightboxZoom((z) => clampLightboxZoom(z / 1.2));
      }
      if (e.key === '0') {
        e.preventDefault();
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [lightboxImage]);

  useEffect(() => {
    if (lightboxZoom <= 1) setLightboxPan({ x: 0, y: 0 });
  }, [lightboxZoom]);

  useEffect(() => {
    if (lightboxSrcKey == null) return;
    const el = lightboxViewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setLightboxZoom((z) => clampLightboxZoom(z * factor));
    };

    const touchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lightboxPinchRef.current = {
          startDist: touchDist(e.touches[0], e.touches[1]),
          startScale: lightboxZoomRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !lightboxPinchRef.current) return;
      e.preventDefault();
      const p = lightboxPinchRef.current;
      const d = touchDist(e.touches[0], e.touches[1]);
      if (p.startDist <= 2) return;
      setLightboxZoom(clampLightboxZoom((p.startScale * d) / p.startDist));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) lightboxPinchRef.current = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [lightboxSrcKey]);

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
        return false;
      }
      
      const data = await response.json();
      return data.visualizado || false;
    } catch (err) {
      return false;
    }
  };

  // Obtener el mismo progreso de asignatura que se muestra en la pantalla anterior.
  const obtenerProgresoAsignatura = async () => {
    if (!estudianteId || (!asignaturaId && !temaId)) {
      return;
    }

    try {
      const url = asignaturaId
        ? `${API_BASE_URL}/progresos/por-asignatura?asignatura_id=${asignaturaId}&estudiante_id=${estudianteId}`
        : `${API_BASE_URL}/progresos/por-tema?tema_id=${temaId}&estudiante_id=${estudianteId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        setCurrentProgress(0);
        return;
      }
      
      const data = await response.json();
      const porcentaje = asignaturaId
        ? data.resumen?.porcentajeTotalAsignatura || 0
        : data.resumen?.porcentajeTotalTema || 0;
      setCurrentProgress(Math.round(porcentaje));
    } catch (err) {
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

  // Replica el algoritmo de ordenamiento topológico del backend (getContenidosOrdenadosPorSecuencia)
  const ordenarContenidosPorSecuencia = (contenidos: any[], secuencias: any[]): any[] => {
    if (contenidos.length === 0) return [];
    const contenidoIds = new Set(contenidos.map((c: any) => Number(c.id)));
    const secuenciaMap = new Map<number, number[]>();
    const destinosSet = new Set<number>();
    secuencias.forEach((sc: any) => {
      const origen = Number(sc.contenido_origen_id);
      const destino = Number(sc.contenido_destino_id);
      if (!contenidoIds.has(origen)) return;
      if (!secuenciaMap.has(origen)) secuenciaMap.set(origen, []);
      secuenciaMap.get(origen)!.push(destino);
      destinosSet.add(destino);
    });
    const iniciales = contenidos.filter((c: any) => !destinosSet.has(Number(c.id)));
    const ordenado: any[] = [];
    const visitados = new Set<number>();
    const agregar = (id: number) => {
      if (visitados.has(id)) return;
      const c = contenidos.find((c: any) => Number(c.id) === id);
      if (c) { ordenado.push(c); visitados.add(id); const ds = secuenciaMap.get(id); if (ds?.length) agregar(ds[0]); }
    };
    iniciales.forEach((c: any) => agregar(Number(c.id)));
    const ids = new Set(ordenado.map((c: any) => Number(c.id)));
    contenidos.forEach((c: any) => { if (!ids.has(Number(c.id))) ordenado.push(c); });
    return ordenado;
  };

  // Calcular progreso de todos los subtemas en 1 sola petición bulk
  const calcularProgresoSubtemas = async (subtemas: any[]) => {
    if (!estudianteId || !temaId || subtemas.length === 0) return new Map<string, { porcentaje: number }>();
    const progresoMap = new Map<string, { porcentaje: number }>();
    try {
      const ids = subtemas.map((s: any) => s.id).join(',');
      const response = await fetch(
        `${API_BASE_URL}/progresos/bulk-por-subtema?subtema_ids=${ids}&estudiante_id=${estudianteId}`
      );
      if (response.ok) {
        const data = await response.json() as Record<string, any>;
        subtemas.forEach((s: any) => {
          const porcentaje = data[String(s.id)]?.resumen?.porcentajeTotalSubtema ?? 0;
          progresoMap.set(String(s.id), { porcentaje });
        });
      } else {
        subtemas.forEach((s: any) => progresoMap.set(String(s.id), { porcentaje: 0 }));
      }
    } catch {
      subtemas.forEach((s: any) => progresoMap.set(String(s.id), { porcentaje: 0 }));
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
      setEjercicioAsociado(null);
    } finally {
      setLoadingEjercicio(false);
    }
  };

  // Cargar subtemas al cambiar temaId
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

        // Pre-calentar caché en paralelo con Phase 1 — cuando loadContenidosForSubtema los necesite, ya estarán listos
        if (temaId) {
          cachedFetch(`${API_BASE_URL}/secuencias-contenido/tema/${temaId}/contenidos-bulk`, { headers });
        }
        if (asignaturaId != null && estudianteId) {
          cachedFetch(`${API_BASE_URL}/ejercicios/con-completado?asignatura_id=${asignaturaId}&estudiante_id=${estudianteId}`, { headers }, 30_000);
        }

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
        setError(`Error loading subtemas: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setModules(FALLBACK_MODULES);
        setLoading(false);
      }
    };

    fetchSubtemas();
  }, [temaId, estudianteId, progresionSecuencial]);

  // Cargar contenidos de un subtema específico
  // ...existing code...

  // Cargar contenidos de un subtema específico
  const loadContenidosForSubtema = async (
    subtemaId: string,
    modulosActuales?: Module[],
    estadoContenidosActual?: Map<string, any>
  ) => {
    try {
      const mapSrvContenidos = estadoContenidosActual ?? contenidosEstadoSrvRef.current;

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Usa los endpoints bulk pre-calentados al montar — en caché son instantáneos (<1ms)
      const [bulkData, ejerciciosConEstado] = await Promise.all([
        temaId
          ? cachedFetch(`${API_BASE_URL}/secuencias-contenido/tema/${temaId}/contenidos-bulk`, { headers }) as Promise<{ contenidos: any[], secuencias: any[] }>
          : Promise.resolve({ contenidos: [], secuencias: [] }),
        asignaturaId != null && estudianteId
          ? cachedFetch(`${API_BASE_URL}/ejercicios/con-completado?asignatura_id=${asignaturaId}&estudiante_id=${estudianteId}`, { headers }, 30_000) as Promise<any[]>
          : Promise.resolve([]),
      ]);

      // Filtrar y ordenar contenidos del subtema actual usando datos del bulk
      const allContenidos: any[] = Array.isArray(bulkData?.contenidos) ? bulkData.contenidos : [];
      const allSecuencias: any[] = Array.isArray(bulkData?.secuencias) ? bulkData.secuencias : [];
      const contenidosDelSubtema = allContenidos.filter((c: any) => String(c.subtema_id) === String(subtemaId));
      const contenidos: Contenido[] = ordenarContenidosPorSecuencia(contenidosDelSubtema, allSecuencias) as Contenido[];

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
        // Usa ejerciciosConEstado (pre-cargado al montar, incluye completado sin fetch extra)
        if (ejerciciosConEstado && Array.isArray(ejerciciosConEstado)) {
          const todosEjercicios: Ejercicio[] = ejerciciosConEstado;
          
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
          
          
          // completado ya viene incluido en ejerciciosConEstado — sin round trip extra
          const aprobadosMap = new Map<number, boolean>();
          ejerciciosDeEsteSubtema.forEach((ej: any) => {
            aprobadosMap.set(ej.id, Boolean(ej.completado));
          });

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
        // No es crítico, continuar sin ejercicios
      }

      const gatedItems = aplicarServidorDesbloqueoContenidos(recalcularGatingItems(items), mapSrvContenidos);

      // Actualizar el módulo con los contenidos cargados
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
    if (selectedContentData?.type === 'evm_curva_s') return;

    const srv = contenidosEstadoSrvRef.current.get(String(selectedContentId));
    if (srv?.completado === true || srv?.completo === true) return;

    const contenidoActual = selectedContentId;
    const timer = window.setTimeout(() => {
      void marcarContenidoVisualizado(contenidoActual);
      void obtenerProgresoAsignatura();
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [selectedContentId, estudianteId, selectedContentData?.type]);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video': return Play;
      case 'document': return FileText;
      case 'activity': return BookOpen;
      case 'workshop': return BookOpen;
      case 'evm_curva_s': return TrendingUp;
      default: return FileText;
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Barra superior: mismo estilo que el header global; ocupa todo el ancho */}
      <header className="app-header shrink-0">
        <div style={{ paddingInline: 'clamp(0.75rem, 3vw, 2rem)', paddingBlock: '1rem' }}>
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} title="Ir al panel principal" className="app-brand-icon">
                <AppLogo size={48} />
              </button>
              <div>
                <h1>{subjectName}</h1>
                <p className="text-sm">{content.title}</p>
              </div>
            </div>

            {(() => {
              const pct = Math.round(Math.min(100, Math.max(0, currentProgress)));
              return (
                <div className="flex min-w-0 flex-1 shrink-0 items-center justify-end pl-4 md:pl-8">
                  {/* Ancho con style inline: las clases w-[clamp(...)] a veces no compilan bien por las comas */}
                  <div
                    className="flex max-w-full shrink-0 flex-col gap-1 py-0.5"
                    style={{
                      width: 'clamp(13.5rem, 28vw, 21.25rem)',
                      maxWidth: '100%',
                    }}
                  >
                    <div className="flex w-full min-w-0 items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-xs font-medium text-white/90">Progreso</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums tracking-tight text-[#eef2ff]">
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="relative h-2 w-full overflow-hidden rounded-full border border-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                      style={{ backgroundColor: '#cfd6e2' }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext={`${pct} por ciento completado`}
                      aria-label="Progreso de la asignatura"
                    >
                      <div
                        className="h-full transition-[width] duration-500 ease-out"
                        style={{
                          width: `${pct}%`,
                          minWidth: pct > 0 && pct < 100 ? '8px' : 0,
                          backgroundColor: '#aeb6c4',
                          backgroundImage:
                            'linear-gradient(180deg, #b8bfcc 0%, #a3aab8 52%, #8f96a6 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                          borderRadius: pct >= 100 ? '9999px' : '9999px 0 0 9999px',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* ── Franja "Volver" compartida — ambas columnas arrancan aquí ── */}
      <div className="shrink-0 flex items-center py-3 bg-white border-b border-gray-100" style={{ paddingInline: 'clamp(0.75rem, 3vw, 2rem)' }}>
        <button onClick={onBack} className="app-back-button">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
      </div>

      <div className="theory-layout flex flex-1 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className="theory-sidebar w-48 flex-shrink-0 bg-white overflow-y-auto min-h-0">
          <div className="px-3 pt-4 pb-6 space-y-2">
            {modules.map((module, idx) => {
              const isModuleLocked = module.desbloqueado === false;
              return (
                <div key={module.id}>

                  {/* ── Tarjeta de subtema ── */}
                  <button
                    onClick={() => {
                      if (isModuleLocked) { alert('Este subtema está bloqueado. Complete el subtema anterior para desbloquearlo.'); return; }
                      toggleModule(module.id);
                    }}
                    className={`w-full flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl text-left transition-all min-w-0 ${
                      isModuleLocked
                        ? 'opacity-50 cursor-not-allowed bg-white border border-gray-200'
                        : module.expanded
                          ? 'bg-[#EFF6FF] border border-blue-200 shadow-sm'
                          : 'bg-white border border-gray-200 hover:border-blue-200 hover:bg-[#EFF6FF] shadow-sm hover:shadow'
                    }`}
                  >
                    {/* Número en cuadro redondeado */}
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold shadow-sm"
                      style={{
                        background: isModuleLocked
                          ? '#9CA3AF'
                          : 'linear-gradient(135deg,#3B82F6 0%,#1D4ED8 100%)',
                      }}
                    >
                      {isModuleLocked ? <Lock className="w-2 h-2" /> : idx + 1}
                    </span>
                    <span className={`flex-1 min-w-0 text-[11px] font-semibold leading-snug break-words ${isModuleLocked ? 'text-gray-400' : 'text-[#1E3A8A]'}`}>
                      {module.title}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 pr-2.5">
                      {module.completo && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                      {!isModuleLocked && (module.expanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />)}
                    </div>
                  </button>

                  {/* Línea sutil entre la tarjeta del subtema y sus ítems */}
                  {module.expanded && (
                    <div className="mx-2 mt-1 mb-0.5 border-t border-gray-100" />
                  )}

                  {/* ── Items ── */}
                  {module.expanded && (
                    <div className="ml-5 mr-1 space-y-0.5 mb-3">
                      {module.loadingItems ? (
                        <div className="flex items-center gap-1.5 px-2 py-2 text-gray-400">
                          <Loader className="w-3 h-3 animate-spin" />
                          <span className="text-[10px]">Cargando...</span>
                        </div>
                      ) : module.items.length === 0 ? (
                        <p className="px-2 py-1.5 text-[10px] text-gray-400">Sin contenidos</p>
                      ) : (
                        module.items.map((item) => {
                          const isSelected   = selectedContentId === item.id;
                          const isItemLocked = item.desbloqueado === false;
                          const isEjercicio  = Boolean(item.ejercicioData);
                          const isDone = isEjercicio ? Boolean(item.completo) : Boolean(item.visualizado);
                          // Azul para contenido, ámbar para ejercicio
                          const typeColor = isEjercicio ? '#D97706' : '#2563EB';

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (isItemLocked) { alert('Este contenido está bloqueado. Complete el contenido anterior para desbloquearlo.'); return; }
                                if (item.ejercicioData) {
                                  setSelectedContentId(item.id);
                                  setSelectedContentData(null);
                                  let ej = { ...item.ejercicioData };
                                  if (ej.tipo_ejercicio === 'Preguntas' && ej.configuracion?.tipo) {
                                    if (ej.configuracion.tipo === 'opcion-unica') ej.tipo_ejercicio = 'Opción única';
                                    else if (ej.configuracion.tipo === 'ordenar') ej.tipo_ejercicio = 'Ordenar';
                                    else if (ej.configuracion.tipo === 'relacionar') ej.tipo_ejercicio = 'Relacionar';
                                  }
                                  setEjercicioAsociado(ej);
                                  setLoadingEjercicio(false);
                                } else {
                                  setSelectedContentId(item.id);
                                  setSelectedContentData(item);
                                  setEjercicioAsociado(null);
                                  onContentChange?.(item.id);
                                }
                              }}
                              className={`w-full flex items-center gap-2 pr-2 py-2 rounded-md text-left transition-colors overflow-hidden ${
                                isItemLocked
                                  ? 'opacity-40 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-blue-50'
                                    : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Borde izquierdo — identifica tipo */}
                              <div
                                className="self-stretch w-[3px] flex-shrink-0 rounded-full"
                                style={{ backgroundColor: isItemLocked ? '#E5E7EB' : typeColor }}
                              />

                              {/* Estado */}
                              <div className="flex-shrink-0">
                                {isItemLocked ? (
                                  <Lock className="w-3 h-3 text-gray-300" />
                                ) : isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: typeColor }} />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border-2"
                                    style={{ borderColor: isSelected ? typeColor : '#CBD5E1' }} />
                                )}
                              </div>

                              {/* Título — color del tipo cuando pendiente */}
                              <span className={`flex-1 text-[11px] leading-snug ${
                                isItemLocked ? 'text-gray-400'
                                  : isSelected ? 'font-semibold'
                                  : isDone ? 'text-gray-400 line-through'
                                  : ''
                              }`}
                                style={
                                  isItemLocked || isDone ? undefined
                                    : isSelected ? { color: typeColor }
                                    : { color: isEjercicio ? '#92400E' : '#1E40AF' }
                                }
                              >
                                {item.title}
                              </span>
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

        {/* ── Línea divisora estática — siempre llega al fondo ── */}
        <div className="w-px flex-shrink-0 bg-gray-200" />

        {/* ── Área de contenido derecha ── */}
        <div className="theory-content flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white pt-4 pb-8" style={{ paddingInline: 'clamp(0.75rem, 3vw, 2rem)' }}>
          <div className="mx-auto w-full max-w-[1500px]">
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

                {ejercicioAsociado.tipo_ejercicio === 'Simulación GP' && (
                  <PmSimulationExercise
                    activity={{ id: ejercicioAsociado.id.toString(), title: ejercicioAsociado.actividad?.titulo || 'Simulación' }}
                    ejercicio={ejercicioAsociado}
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
                {/* ── Simulación Ruta Crítica ── */}
                {selectedContentData.type === 'simulacion_ruta_critica' && (() => {
                  try {
                    const config = JSON.parse(selectedContentData.url || '{}');
                    const acts = Array.isArray(config.activities) ? config.activities : [];
                    return (
                      <div className="mb-6">
                        {/* Título y descripción arriba */}
                        <h2 className="text-[#3A4A5B] mb-2 text-2xl font-semibold">{selectedContentData.title}</h2>
                        {selectedContentData.descripcion && (
                          <p className="text-gray-600 text-sm mb-4 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: selectedContentData.descripcion }} />
                        )}
                        {acts.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-blue-50 text-center text-blue-700">
                            Esta simulación no tiene actividades configuradas aún.
                          </div>
                        ) : (
                          <div style={{ height: 650 }}>
                            <CPMSimulationViewer activities={acts} title={selectedContentData.title} />
                          </div>
                        )}
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* Mostrar video o documento — nunca para CPM (ya se renderizó arriba) */}
                {selectedContentData.type !== 'simulacion_ruta_critica' && (selectedContentData.type === 'video' ? (
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
                ) : selectedContentData.type === 'evm_curva_s' ? (
                  <EvmCurvaSContent
                    title={selectedContentData.title}
                    descripcionHtml={selectedContentData.descripcion}
                    accentColor={subjectColor}
                    onComplete={
                      selectedContentId && estudianteId
                        ? () => {
                            void marcarContenidoVisualizado(selectedContentId);
                            void obtenerProgresoAsignatura();
                            setModules((prev) =>
                              prev.map((m) => ({
                                ...m,
                                items: m.items.map((item) =>
                                  item.id === selectedContentId ? { ...item, visualizado: true, completo: true } : item
                                ),
                                completo: esModuloCompletoPorItems(
                                  m.items.map((item) =>
                                    item.id === selectedContentId ? { ...item, visualizado: true, completo: true } : item
                                  )
                                ),
                              }))
                            );
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="mb-6">
                    <div className="rounded-2xl bg-white border border-gray-200 shadow-md" style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
                      <h2 className="text-[#3A4A5B] mb-4 font-semibold" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)' }}>{selectedContentData.title}</h2>

                      {/* Mostrar imagen si la URL es una imagen */}
                      {selectedContentData.url && (selectedContentData.url.includes('jpg') || selectedContentData.url.includes('jpeg') || selectedContentData.url.includes('png') || selectedContentData.url.includes('gif') || selectedContentData.url.includes('webp')) && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-md">
                          <img
                            src={selectedContentData.url}
                            alt={selectedContentData.title}
                            className="w-full h-auto max-h-96 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                            draggable={false}
                            tabIndex={0}
                            role="button"
                            aria-label={`Ampliar imagen: ${selectedContentData.title}`}
                            onKeyDown={(ev) => {
                              if (ev.key !== 'Enter' && ev.key !== ' ') return;
                              ev.preventDefault();
                              setLightboxImage({
                                src: selectedContentData.url as string,
                                alt: selectedContentData.title,
                              });
                            }}
                            onClick={() =>
                              setLightboxImage({
                                src: selectedContentData.url as string,
                                alt: selectedContentData.title,
                              })}
                          />
                        </div>
                      )}

                      {selectedContentData.descripcion && (
                        <div
                          role="presentation"
                          ref={theoryDescripRef}
                          className="quill-render mb-6 [&_img]:cursor-zoom-in"
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
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const Ico = getResourceUrlIcon(selectedContentData.url ?? '');
                              return (
                                <a
                                  href={selectedContentData.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:shadow-md"
                                  style={{ backgroundColor: subjectColor }}
                                >
                                  <Ico className="h-4 w-4 shrink-0" aria-hidden />
                                  Abrir recurso
                                </a>
                              );
                            })()}
                          </div>
                          {/* URL solo visible para tipos que la necesiten (no para documentos ni CPM) */}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {lightboxImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 box-border overflow-hidden p-4 sm:p-8"
            style={{
              zIndex: 9999,
              /* Inline: no dependemos solo del stack de Tailwind; capa bien oscura sobre toda la UI */
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(16px) saturate(1.15)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.15)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Imagen ampliada"
            onClick={() => setLightboxImage(null)}
          >
          {/* Área útil + zoom (rueda/pellizco) y panorámica cuando zoom &gt; 1 */}
          <div
            ref={lightboxViewportRef}
            role="presentation"
            className={`relative z-0 flex h-full w-full min-h-0 min-w-0 select-none items-center justify-center overflow-hidden outline-none touch-none ${
              lightboxZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
            }`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              lightboxPointersRef.current.add(e.pointerId);
              if (lightboxPointersRef.current.size > 1) {
                lightboxPanDragRef.current.active = false;
                return;
              }
              if (lightboxZoomRef.current <= 1 || lightboxPinchRef.current) return;
              lightboxPanDragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const drag = lightboxPanDragRef.current;
              if (!drag.active || lightboxPointersRef.current.size !== 1) return;
              const dx = e.clientX - drag.lastX;
              const dy = e.clientY - drag.lastY;
              drag.lastX = e.clientX;
              drag.lastY = e.clientY;
              setLightboxPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
            }}
            onPointerUp={(e) => {
              lightboxPointersRef.current.delete(e.pointerId);
              lightboxPanDragRef.current.active = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerCancel={(e) => {
              lightboxPointersRef.current.delete(e.pointerId);
              lightboxPanDragRef.current.active = false;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
          >
            <div
              className="relative inline-block max-h-full max-w-full"
              style={{
                transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                transformOrigin: 'center center',
              }}
            >
              <button
                type="button"
                className="absolute left-2 top-2 z-20 rounded-full bg-white/95 p-2 text-gray-800 shadow-lg transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 pointer-events-auto"
                aria-label="Cerrar vista ampliada"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImage(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                <X className="h-6 w-6" aria-hidden />
              </button>
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                className="pointer-events-none block h-auto w-auto max-h-full max-w-full object-contain"
                draggable={false}
                style={{
                  maxHeight: 'min(calc(100dvh - 5rem), calc(100vh - 5rem))',
                  maxWidth: 'min(calc(100dvw - 2.5rem), calc(100vw - 2.5rem))',
                }}
              />
            </div>
          </div>

          <div
            role="toolbar"
            aria-label="Controles del visor"
            className="pointer-events-auto absolute left-1/2 z-[201] flex w-max max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-stretch rounded-3xl border border-white/12 bg-neutral-950/82 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-lg sm:px-5"
            style={{
              bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <button
                type="button"
                className="rounded-full p-2.5 text-white/95 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Alejar"
                onClick={() => setLightboxZoom((z) => clampLightboxZoom(z / 1.25))}
              >
                <ZoomOut className="h-5 w-5" aria-hidden />
              </button>
              <div className="mx-2 min-w-[3.75rem] rounded-full bg-white/8 px-3 py-1.5 text-center text-sm font-semibold tabular-nums text-white sm:mx-3">
                {Math.round(lightboxZoom * 100)}%
              </div>
              <button
                type="button"
                className="rounded-full p-2.5 text-white/95 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Acercar"
                onClick={() => setLightboxZoom((z) => clampLightboxZoom(z * 1.25))}
              >
                <ZoomIn className="h-5 w-5" aria-hidden />
              </button>
              <span className="mx-2 hidden h-6 w-px shrink-0 bg-white/18 sm:inline" aria-hidden />
              <button
                type="button"
                className="rounded-full p-2.5 text-white/95 transition-colors hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Restablecer zoom y posición"
                onClick={() => {
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                }}
              >
                <RotateCcw className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className="mx-auto mt-2.5 max-w-[26rem] border-t border-white/10 pt-2.5 text-center text-[10px] leading-relaxed text-white/65 sm:text-[11px]">
              Rueda: zoom · Táctil: pellizco · Con zoom: arrastrar · Teclado: + − 0
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
