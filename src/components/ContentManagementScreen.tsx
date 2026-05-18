import 'quill/dist/quill.snow.css';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Plus, FileText, PlayCircle, Edit, Eye, EyeOff, Search, Loader, TrendingUp } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { toast } from 'sonner';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';
import { createQuillModules, loadQuill } from '../utils/quill';
import { CPMSimulationCreator } from './CPMSimulationCreator';
import type { CPMActivity } from './CPMSimulationViewer';

interface ContentManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  scopeMode?: 'catalog' | 'flow';
  initialAsignaturaId?: number;
  initialAsignaturaName?: string;
  initialTemaId?: number;
  initialTemaName?: string;
  initialSubtemaId?: number;
  initialSubtemaName?: string;
  mode?: 'admin' | 'docente';
  /** Navegación directa desde el breadcrumb hacia cada nivel del flujo. */
  onBreadcrumbPanel?: () => void;
  onBreadcrumbAsignatura?: () => void;
  onBreadcrumbTema?: () => void;
  onBreadcrumbSubtema?: () => void;
  /** Navega a ejercicios pre-filtrado por el contenido seleccionado (solo en flujo) */
  onGoToEjerciciosByContenido?: (contenidoId: string) => void;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'explicacion' | 'simulacion_ruta_critica' | 'simulador_curva_s';
  linkedTo: 'theme' | 'subtheme';
  linkedName: string;
  subject: string;
  duration?: string;
  status: 'published' | 'draft';
  estado?: boolean;
  asignatura_id?: number;
  tema_id?: number;
  subtema_id?: number;
  descripcion?: string;
  url?: string;
}

interface CreateContentFormData {
  titulo: string;
  tipo: 'video' | 'document' | 'activity' | 'explicacion' | 'simulacion_ruta_critica' | 'simulador_curva_s';
  descripcion: string;
  url: string;
  tema_id: string;
  subtema_id: string;
}

interface Asignatura {
  id: number;
  nombre: string;
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

interface BackendContenidoItem {
  id?: number | string;
  titulo: string;
  tipo: unknown;
  estado?: boolean;
  tema_id?: number;
  subtema_id?: number;
  descripcion?: string;
  url?: string;
}

const normalizeContentType = (value: unknown): ContentItem['type'] => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'video') {
    return 'video';
  }

  if (normalized === 'document' || normalized === 'documento' || normalized === 'pdf') {
    return 'document';
  }

  if (normalized === 'activity' || normalized === 'actividad') {
    return 'activity';
  }

  if (normalized === 'explicacion' || normalized === 'explicación') {
    return 'explicacion';
  }

  if (normalized === 'simulacion_ruta_critica') {
    return 'simulacion_ruta_critica';
  }

  if (normalized === 'simulador_curva_s' || normalized === 'simulador-curva-s' || normalized === 'simulador_evm_curva_s') {
    return 'simulador_curva_s';
  }

  return 'activity';
};

export function ContentManagementScreen({
  onBack,
  onHome,
  scopeMode = 'catalog',
  initialAsignaturaId,
  initialAsignaturaName,
  initialTemaId,
  initialTemaName,
  initialSubtemaId,
  initialSubtemaName,
  mode = 'admin',
  onBreadcrumbPanel,
  onBreadcrumbAsignatura,
  onBreadcrumbTema,
  onBreadcrumbSubtema,
  onGoToEjerciciosByContenido,
}: ContentManagementScreenProps) {
  const scopeasignaturaId = initialAsignaturaId ? String(initialAsignaturaId) : '';
  const scopeTemaId = initialTemaId ? String(initialTemaId) : '';
  const scopeSubtemaId = initialSubtemaId ? String(initialSubtemaId) : '';
  const isFlowScoped = scopeMode === 'flow' && Boolean(scopeasignaturaId || scopeTemaId || scopeSubtemaId);
  const isDocenteMode = mode === 'docente';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState<CreateContentFormData>({
    titulo: '',
    tipo: 'video',
    descripcion: '',
    url: '',
    tema_id: isFlowScoped ? scopeTemaId : '',
    subtema_id: isFlowScoped ? scopeSubtemaId : ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Estados para asignaturas, temas y subtemas
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [selectedAsignaturaId, setSelectedasignaturaId] = useState<string>(isFlowScoped ? scopeasignaturaId : '');
  const preserveasignaturaselectionRef = useRef(false);
  const preserveTemaSelectionRef = useRef(false);

  // Filtros de catálogo (solo aplican en modo catálogo)
  const [filterasignaturaId, setFilterasignaturaId] = useState<string>('');
  const [filterTemaId, setFilterTemaId] = useState<string>('');
  const [filterSubtemaId, setFilterSubtemaId] = useState<string>('');
  const [filterTemas, setFilterTemas] = useState<Tema[]>([]);
  const [filterSubtemas, setFilterSubtemas] = useState<Subtema[]>([]);
  const isContentActive = (content: ContentItem) => content.estado !== false;

  const buildContenidosRequestUrl = () => {
    const query = new URLSearchParams();

    if (isFlowScoped) {
      if (scopeasignaturaId) {
        query.set('asignaturaId', scopeasignaturaId);
      }

      if (scopeTemaId) {
        query.set('temaId', scopeTemaId);
      }

      if (scopeSubtemaId) {
        query.set('subtemaId', scopeSubtemaId);
      }
    }

    const search = query.toString();
    return `${API_BASE_URL}/contenidos${search ? `?${search}` : ''}`;
  };

  // Funciones para cargar datos
  const loadAsignaturas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/asignaturas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAsignaturas(data);
      }
    } catch (err) {
    }
  };

  const loadTemasByAsignatura = async (asignaturaId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/temas/por-asignatura/` + asignaturaId, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTemas(data);
      }
    } catch (err) {
      setTemas([]);
    }
  };

  const loadSubtemasByTema = async (temaId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subtemas/por-tema/` + temaId, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSubtemas(data);
      }
    } catch (err) {
      setSubtemas([]);
    }
  };

  // Cargar contenidos y asignaturas al montar el componente
  useEffect(() => {
    loadContenidos();
  }, [scopeasignaturaId, scopeTemaId, scopeSubtemaId, isFlowScoped]);

  // Cascada de filtros de catálogo
  // Carga temas: en modo catálogo usa filterasignaturaId; en modo flow usa el área activa
  useEffect(() => {
    setFilterTemaId('');
    setFilterSubtemaId('');
    setFilterSubtemas([]);
    const asigId = isFlowScoped ? scopeasignaturaId : filterasignaturaId;
    if (asigId) {
      fetch(`${API_BASE_URL}/temas/por-asignatura/${asigId}`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setFilterTemas(Array.isArray(data) ? data : []))
        .catch(() => setFilterTemas([]));
    } else {
      setFilterTemas([]);
    }
  }, [filterasignaturaId, isFlowScoped, scopeasignaturaId]);

  useEffect(() => {
    setFilterSubtemaId('');
    if (filterTemaId) {
      fetch(`${API_BASE_URL}/subtemas/por-tema/${filterTemaId}`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setFilterSubtemas(Array.isArray(data) ? data : []))
        .catch(() => setFilterSubtemas([]));
    } else {
      setFilterSubtemas([]);
    }
  }, [filterTemaId]);

  // Cargar temas cuando cambia el asignatura seleccionada
  useEffect(() => {
    if (selectedAsignaturaId) {
      loadTemasByAsignatura(selectedAsignaturaId);
      if (preserveasignaturaselectionRef.current) {
        preserveasignaturaselectionRef.current = false;
        return;
      }

      setFormData(prev => ({ ...prev, tema_id: '', subtema_id: '' }));
    } else {
      setTemas([]);
      setSubtemas([]);
    }
  }, [selectedAsignaturaId]);

  // Cargar subtemas cuando cambia el tema seleccionado
  useEffect(() => {
    if (formData.tema_id) {
      loadSubtemasByTema(formData.tema_id);
      if (preserveTemaSelectionRef.current) {
        preserveTemaSelectionRef.current = false;
        return;
      }

      setFormData(prev => ({ ...prev, subtema_id: '' }));
    } else {
      setSubtemas([]);
    }
  }, [formData.tema_id]);

  useEffect(() => {
    if (!showCreateModal || isEditMode || !isFlowScoped) {
      return;
    }

    preserveasignaturaselectionRef.current = true;
    preserveTemaSelectionRef.current = true;
    setSelectedasignaturaId(scopeasignaturaId);
    setFormData((prev) => ({
      ...prev,
      tema_id: scopeTemaId,
      subtema_id: scopeSubtemaId
    }));
  }, [showCreateModal, isEditMode, isFlowScoped, scopeasignaturaId, scopeTemaId, scopeSubtemaId]);

  // Función para cargar todos los contenidos
  const loadContenidos = async () => {
    setIsLoadingData(true);
    try {
      const requestOptions = {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include' as const
      };

      const [contentsResponse, temasResponse, subtemasResponse, asignaturasResponse] = await Promise.all([
        fetch(buildContenidosRequestUrl(), {
          method: 'GET',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json',
          }),
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/temas`, requestOptions),
        fetch(`${API_BASE_URL}/subtemas`, requestOptions),
        fetch(`${API_BASE_URL}/asignaturas`, requestOptions)
      ]);

      if (!contentsResponse.ok) {
        throw new Error('Error al cargar los contenidos');
      }

      const [data, temasCatalog, subtemasCatalog, asignaturasCatalog] = await Promise.all([
        contentsResponse.json() as Promise<BackendContenidoItem[]>,
        temasResponse.ok ? (temasResponse.json() as Promise<Tema[]>) : Promise.resolve([]),
        subtemasResponse.ok ? (subtemasResponse.json() as Promise<Subtema[]>) : Promise.resolve([]),
        asignaturasResponse.ok ? (asignaturasResponse.json() as Promise<Asignatura[]>) : Promise.resolve([])
      ]);

      setAsignaturas(asignaturasCatalog);

      const temasById = new Map(temasCatalog.map((tema) => [Number(tema.id), tema]));
      const subtemasById = new Map(subtemasCatalog.map((subtema) => [Number(subtema.id), subtema]));
      const asignaturasById = new Map(asignaturasCatalog.map((Asignatura) => [Number(Asignatura.id), Asignatura]));

      const contenidosMapeados: ContentItem[] = data.map((item) => {
        const tema = item.tema_id ? temasById.get(Number(item.tema_id)) : undefined;
        const subtema = item.subtema_id ? subtemasById.get(Number(item.subtema_id)) : undefined;
        const Asignatura = tema?.asignatura_id ? asignaturasById.get(Number(tema.asignatura_id)) : undefined;

        return {
          id: item.id?.toString() || '',
          title: item.titulo,
          type: normalizeContentType(item.tipo),
          linkedTo: 'subtheme',
          linkedName: subtema?.nombre || tema?.nombre || 'Sin vincular',
          subject: Asignatura?.nombre || 'Sin clasificar',
          status: item.estado === false ? 'draft' : 'published',
          estado: item.estado !== false,
          asignatura_id: tema?.asignatura_id,
          tema_id: item.tema_id,
          subtema_id: item.subtema_id,
          descripcion: item.descripcion,
          url: item.url
        };
      });

      setContents(contenidosMapeados);
    } catch (err) {
      toast.error('Error', {
        description: 'No se pudieron cargar los contenidos'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Función para crear o actualizar contenido
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();

    const descripcionHtml = quillRef.current ? quillRef.current.root.innerHTML : formData.descripcion;
    const descripcionPlano = descripcionHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isCPM = formData.tipo === 'simulacion_ruta_critica';
    const isCurvaS = formData.tipo === 'simulador_curva_s';

    const missing: string[] = [];
    if (!formData.titulo.trim()) missing.push('Título');
    if (!selectedAsignaturaId) missing.push('Asignatura');
    if (!formData.tema_id) missing.push('Tema');
    if (!formData.subtema_id) missing.push('Subtema');
    if (isCPM && !formData.url.trim()) missing.push('Actividades CPM (define al menos una)');
    if (!isCPM && !isCurvaS && !formData.url.trim()) missing.push('URL');
    if (!isCPM && !descripcionPlano) missing.push('Descripción');

    if (missing.length > 0) {
      toast.error('Formulario incompleto', {
        description: `Completa: ${missing.join(', ')}.`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `${API_BASE_URL}/contenidos/${selectedContent?.id}`
        : `${API_BASE_URL}/contenidos`;

      const response = await fetch(url, {
        method: method,
        headers: buildAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          titulo: formData.titulo,
          tipo: formData.tipo,
          descripcion:
            descripcionHtml && descripcionHtml.replace(/<[^>]*>/g, '').trim()
              ? descripcionHtml
              : formData.tipo === 'simulacion_ruta_critica'
                ? `Simulación de Ruta Crítica: ${formData.titulo}`
                : descripcionHtml,
          url:
            formData.tipo === 'simulador_curva_s'
              ? formData.url.trim() || 'https://edupath.app/contenido/simulador-curva-s-evm'
              : formData.url,
          tema_id: parseInt(formData.tema_id),
          subtema_id: parseInt(formData.subtema_id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el contenido`);
      }

      const contenidoActualizado = await response.json();

      if (isEditMode) {
        await loadContenidos();
        toast.success('Contenido actualizado', {
          description: 'El contenido se ha actualizado exitosamente',
          duration: 5000
        });
      } else {
        await loadContenidos();
        
        // Toast informativo para nuevo contenido
        toast.warning('Nuevo contenido creado', {
          description: `"${contenidoActualizado.titulo}" ha sido creado. Debes agregarlo a la Secuencia de Contenido para ordenarlo dentro del subtema.`,
          duration: 8000,
          closeButton: true
        });
      }

      // Limpiar formulario
      setFormData({
        titulo: '',
        tipo: 'video',
        descripcion: '',
        url: '',
        tema_id: isFlowScoped ? scopeTemaId : '',
        subtema_id: isFlowScoped ? scopeSubtemaId : ''
      });
      setSelectedasignaturaId(isFlowScoped ? scopeasignaturaId : '');
      if (quillRef.current) {
        quillRef.current.root.innerHTML = '';
      }
      setIsEditMode(false);
      setSelectedContent(null);

      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        setShowCreateModal(false);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para actualizar contenido (abrir modal en modo edición)
  const handleEditContent = async (content: ContentItem) => {
    setIsEditMode(true);
    setSelectedContent(content);
    preserveTemaSelectionRef.current = true;
    setFormData({
      titulo: content.title,
      tipo: content.type,
      descripcion: content.descripcion || '',
      url: content.url || '',
      tema_id: content.tema_id?.toString() || '',
      subtema_id: content.subtema_id?.toString() || ''
    });

    // Si hay tema_id, cargar el tema para obtener el asignatura
    if (content.tema_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/temas/` + content.tema_id, {
          headers: buildAuthHeaders({ Accept: 'application/json' }),
          credentials: 'include'
        });
        if (response.ok) {
          const tema = await response.json();
          preserveasignaturaselectionRef.current = true;
          setSelectedasignaturaId(tema.asignatura_id.toString());
        }
      } catch (err) {
      }
    }

    setShowCreateModal(true);
  };

  const handleToggleContent = async (content: ContentItem) => {
    const currentlyActive = isContentActive(content);
    const ok = window.confirm(`¿Deseas ${currentlyActive ? 'inhabilitar' : 'habilitar'} el contenido "${content.title}"?`);
    if (!ok) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contenidos/${content.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al cambiar estado');
      const data = await response.json().catch(() => null);
      const updatedEstado = data?.contenido?.estado ?? !currentlyActive;
      setContents(prev => prev.map(item =>
        item.id === content.id ? { ...item, estado: updatedEstado, status: updatedEstado ? 'published' : 'draft' } : item
      ));
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Ref y helpers del editor de texto enriquecido
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  // Inicializar Quill al abrir el modal y sincronizar contenido.
  useEffect(() => {
    let cancelled = false;

    const destroyEditor = () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      quillRef.current = null;
    };

    if (!showCreateModal) {
      destroyEditor();
      return undefined;
    }

    const initialHtml = isEditMode && selectedContent ? (selectedContent.descripcion || '') : (formData.descripcion || '');

    const initializeQuill = async () => {
      if (!editorRef.current) {
        return;
      }

      const Quill = await loadQuill();
      if (cancelled || !editorRef.current) {
        return;
      }

      if (quillRef.current) {
        quillRef.current.root.innerHTML = initialHtml;
        return;
      }

      editorRef.current.innerHTML = '';
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Ingrese la descripción del contenido',
        modules: createQuillModules()
      });
      quillRef.current.root.innerHTML = initialHtml;
      setFormData((prev) => ({ ...prev, descripcion: initialHtml }));

      quillRef.current.on('text-change', () => {
        setFormData((prev) => ({ ...prev, descripcion: quillRef.current.root.innerHTML }));
      });
    };

    initializeQuill();

    return () => {
      cancelled = true;
    };
  }, [showCreateModal, isEditMode, selectedContent]);

  const scopedContents = contents.filter((content) => {
    const matchesasignaturascope = !isFlowScoped || !scopeasignaturaId || String(content.asignatura_id || '') === scopeasignaturaId;
    const matchesTemaScope = !isFlowScoped || !scopeTemaId || String(content.tema_id || '') === scopeTemaId;
    const matchesSubtemaScope = !isFlowScoped || !scopeSubtemaId || String(content.subtema_id || '') === scopeSubtemaId;

    return matchesasignaturascope && matchesTemaScope && matchesSubtemaScope;
  });

  const filteredContents = scopedContents.filter((content) => {
    const matchesType = filterType === 'all' || content.type === filterType;
    const matchesState =
      stateFilter === 'all' ||
      (stateFilter === 'active' ? isContentActive(content) : !isContentActive(content));
    const matchesSearch = !searchTerm.trim() || [
      content.title,
      content.subject,
      content.linkedName,
      content.descripcion
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const matchesFilterAsignatura = !filterasignaturaId || String(content.asignatura_id || '') === filterasignaturaId;
    const matchesFilterTema = !filterTemaId || String(content.tema_id || '') === filterTemaId;
    const matchesFilterSubtema = !filterSubtemaId || String(content.subtema_id || '') === filterSubtemaId;

    return matchesType && matchesState && matchesSearch && matchesFilterAsignatura && matchesFilterTema && matchesFilterSubtema;
  });

  const selectedAsignatura = asignaturas.find((Asignatura) => String(Asignatura.id) === selectedAsignaturaId);
  const selectedTema = temas.find((tema) => String(tema.id) === formData.tema_id);
  const selectedSubtema = subtemas.find((subtema) => String(subtema.id) === formData.subtema_id);
  const contentTypeLabel =
    formData.tipo === 'video'
      ? 'Video'
      : formData.tipo === 'document'
        ? 'Documento'
        : formData.tipo === 'activity'
          ? 'Actividad'
          : formData.tipo === 'simulacion_ruta_critica'
            ? 'Simulación Ruta Crítica (CPM)'
            : formData.tipo === 'simulador_curva_s'
              ? 'Simulador Curva S (EVM)'
              : 'Explicación';
  const contentCompletion = [
    formData.titulo.trim(),
    formData.descripcion.replace(/<[^>]*>/g, '').trim(),
    ...(formData.tipo === 'simulador_curva_s' ? [] : [formData.url.trim()]),
    selectedAsignaturaId,
    formData.tema_id,
    formData.subtema_id
  ].filter(Boolean).length;
  const activeContentsCount = scopedContents.filter((content) => isContentActive(content)).length;
  const inactiveContentsCount = scopedContents.length - activeContentsCount;
  const flowScopeLabel = initialSubtemaName
    ? `subtema ${initialSubtemaName}`
    : initialTemaName
      ? `tema ${initialTemaName}`
      : initialAsignaturaName
        ? `asignatura ${initialAsignaturaName}`
        : 'recorrido actual';
  const flowBreadcrumbs = isFlowScoped
    ? [
        { label: isDocenteMode ? 'Panel docente' : 'Panel admin', onClick: onBreadcrumbPanel },
        ...(initialAsignaturaName ? [{ label: initialAsignaturaName, onClick: onBreadcrumbAsignatura }] : []),
        ...(initialTemaName ? [{ label: initialTemaName, onClick: onBreadcrumbTema }] : []),
        ...(initialSubtemaName ? [{ label: initialSubtemaName, onClick: onBreadcrumbSubtema }] : []),
        { label: 'Gestión de contenidos', current: true as const, onClick: undefined }
      ]
    : [];

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return PlayCircle;
      case 'document': return FileText;
      case 'activity': return Edit;
      case 'explicacion': return Edit;
      case 'simulacion_ruta_critica': return ArrowRight;
      case 'simulador_curva_s': return TrendingUp;
      default: return FileText;
    }
  };

  const getTypeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return '#4A90E2';
      case 'document': return '#7ED6A7';
      case 'activity': return '#F5A97F';
      case 'explicacion': return '#F5A97F';
      case 'simulacion_ruta_critica': return '#1a56db';
      case 'simulador_curva_s': return '#ca8a04';
      default: return '#64748B';
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} className="app-brand-icon" title="Panel principal">
                <AppLogo size={48} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>
                  Gestión de contenidos
                </p>
                <h1 className="leading-tight">
                  {initialSubtemaName || initialTemaName || initialAsignaturaName || 'Contenidos'}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Volver */}
        <button onClick={onBack} className="app-back-button mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Breadcrumb */}
        {isFlowScoped ? (
          <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
            {flowBreadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: '#bfd3f5' }}>→</span>}
                {bc.onClick ? (
                  <button type="button" onClick={bc.onClick}
                    className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
                    {bc.label}
                  </button>
                ) : (
                  <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
                    {bc.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
            <button type="button" onClick={onHome} className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
              {isDocenteMode ? 'Panel docente' : 'Panel admin'}
            </button>
            <span style={{ color: '#bfd3f5' }}>→</span>
            <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
              Contenidos
            </span>
          </nav>
        )}

        {/* Toolbar compacta */}
        <div className="app-filter-bar mb-4">
          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl px-3"
            style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: '40px' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
            <input type="text" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por título o descripción..."
              className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
          </div>
          {/* Filtros de tipo */}
          <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#e8eef8', height: '40px' }}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'explicacion', label: 'Explicación' },
              { key: 'simulacion_ruta_critica', label: 'CPM' },
              { key: 'simulador_curva_s', label: 'Curva S EVM' },
            ].map(f => (
              <button key={f.key} type="button" onClick={() => setFilterType(f.key as any)}
                className="px-3 py-1 rounded-lg text-sm font-semibold transition-all"
                style={{ background: filterType === f.key ? '#1a56db' : 'transparent', color: filterType === f.key ? '#fff' : '#4a6fa5' }}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Estado */}
          <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#e8eef8', height: '40px' }}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'active', label: `Activos (${activeContentsCount})` },
              { key: 'inactive', label: `Inactivos (${inactiveContentsCount})` },
            ].map(f => (
              <button key={f.key} type="button" onClick={() => setStateFilter(f.key as any)}
                className="px-3 py-1 rounded-lg text-sm font-semibold transition-all"
                style={{ background: stateFilter === f.key ? '#1a56db' : 'transparent', color: stateFilter === f.key ? '#fff' : '#4a6fa5' }}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Nuevo */}
          {!isDocenteMode && (
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: '40px', whiteSpace: 'nowrap' }}>
              <Plus className="w-4 h-4" />
              Nuevo contenido
            </button>
          )}
        </div>

        {/* Filtros contextuales de asignatura/tema/subtema */}
        {(!isFlowScoped || (isFlowScoped && !initialSubtemaName)) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {!isFlowScoped && (
              <select value={filterasignaturaId} onChange={e => setFilterasignaturaId(e.target.value)}
                className="rounded-xl px-3 text-sm font-medium outline-none"
                style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '38px', minWidth: '180px' }}>
                <option value="">Todas las asignaturas</option>
                {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            )}
            <select value={filterTemaId} onChange={e => setFilterTemaId(e.target.value)}
              disabled={filterTemas.length === 0}
              className="rounded-xl px-3 text-sm font-medium outline-none disabled:opacity-50"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '38px', minWidth: '180px' }}>
              <option value="">Todos los temas</option>
              {filterTemas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <select value={filterSubtemaId} onChange={e => setFilterSubtemaId(e.target.value)}
              disabled={!filterTemaId || filterSubtemas.length === 0}
              className="rounded-xl px-3 text-sm font-medium outline-none disabled:opacity-50"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '38px', minWidth: '180px' }}>
              <option value="">Todos los subtemas</option>
              {filterSubtemas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        )}

        {isLoadingData ? (
          <div className="app-empty-panel py-12 flex flex-col items-center gap-3">
            <Loader className="w-7 h-7 animate-spin" style={{ color: '#1a56db' }} />
            <p style={{ color: '#4a6fa5' }}>Cargando contenidos...</p>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">
              {isFlowScoped
                ? 'No hay contenidos del flujo actual con los filtros aplicados.'
                : 'No hay contenidos con los filtros aplicados.'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {isFlowScoped
                ? 'Prueba con otro tipo, cambia el estado o revisa el tramo académico en curso.'
                : 'Prueba con otro tipo, cambia el estado o ajusta el texto de búsqueda.'}
            </p>
          </div>
        ) : (
            <div className="app-table-card">
              <div className="overflow-x-auto">
            <table className="app-data-table">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)' }}>
                  <th style={{ color: '#fff', fontWeight: 700 }}>Título</th>
                  <th style={{ color: '#fff', fontWeight: 700 }}>Tipo</th>
                  <th style={{ color: '#fff', fontWeight: 700 }}>Estado</th>
                  <th style={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContents.map((content) => {
                  const Icon = getTypeIcon(content.type);
                  const color = getTypeColor(content.type);
                  const contentIsActive = isContentActive(content);
                  
                  return (
                    <tr key={content.id} className={contentIsActive ? '' : 'opacity-60'}>
                      <td style={{ color: '#1e3a5f', fontWeight: 500, fontSize: '13.5px' }}>
                        {content.title}
                      </td>
                      <td style={{ color: '#4a6fa5', fontSize: '13px' }}>
                        {content.type === 'video'
                          ? 'Video'
                          : content.type === 'document'
                            ? 'Documento'
                            : content.type === 'activity'
                              ? 'Actividad'
                              : content.type === 'simulacion_ruta_critica'
                                ? 'Simulación Ruta Crítica (CPM)'
                                : content.type === 'simulador_curva_s'
                                  ? 'Simulador Curva S (EVM)'
                                  : 'Explicación'}
                      </td>
                      <td style={{ color: contentIsActive ? '#1a56db' : '#b45309', fontSize: '13px', fontWeight: 500 }}>
                        {contentIsActive ? 'Activo' : 'Inhabilitado'}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button onClick={() => handleEditContent(content)}
                            className="flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                            style={{ width: '28px', height: '28px', background: '#dbeafe', color: '#1a56db' }}
                            title="Editar">
                            <Edit className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleToggleContent(content)} disabled={isLoading}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                            style={contentIsActive ? { background: '#fef2f2', color: '#b91c1c' } : { background: '#ecfdf5', color: '#047857' }}>
                            {contentIsActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {contentIsActive ? 'Inhabilitar' : 'Habilitar'}
                          </button>
                          {/* Botón Ejercicios — solo en flujo desde subtema */}
                          {isFlowScoped && onGoToEjerciciosByContenido && (
                            <button
                              onClick={() => onGoToEjerciciosByContenido(content.id)}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                              style={{ background: '#e0e7ff', color: '#4338ca', whiteSpace: 'nowrap' }}
                              title="Ver ejercicios de este contenido">
                              Ejercicios
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </div>
        )}

      </main>

      {/* Modal de Crear/Editar Contenido */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCreateModal(false)}>
          <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              width:
                formData.tipo === 'simulacion_ruta_critica'
                  ? '1200px'
                  : formData.tipo === 'simulador_curva_s'
                    ? '920px'
                    : '680px',
              maxWidth: '96vw',
              maxHeight: '90vh',
              background: '#fff',
            }}
            onClick={e => e.stopPropagation()}>
            {/* Cabecera azul */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Contenidos</p>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                  {isEditMode ? 'Editar contenido' : 'Nuevo contenido'}
                </h3>
              </div>
              <button type="button"
                onClick={() => { setShowCreateModal(false); setIsEditMode(false); setSelectedContent(null); setFormData({ titulo: '', tipo: 'video', descripcion: '', url: '', tema_id: isFlowScoped ? scopeTemaId : '', subtema_id: isFlowScoped ? scopeSubtemaId : '' }); setSelectedasignaturaId(isFlowScoped ? scopeasignaturaId : ''); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', lineHeight: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>✕</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '20px 22px' }}>
                <form id="content-form" onSubmit={handleSubmitContent} className="app-form-main app-form-stack">
                  {!isEditMode && (
                    <div className="app-form-note">
                      Después de crear el contenido, aún debes incorporarlo a la secuencia correspondiente para definir su orden dentro del recorrido de aprendizaje.
                    </div>
                  )}

                  <section className="app-form-section app-form-section--muted">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Información base</h4>
                      <p className="app-form-section-description">Define el nombre del recurso, su formato y la URL principal que utilizarán docentes o estudiantes.</p>
                    </div>

                    {/* Fila 1: Título + Tipo (siempre en 2 columnas simétricas) */}
                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label">Título *</label>
                        <input
                          type="text"
                          name="titulo"
                          value={formData.titulo}
                          onChange={handleInputChange}
                          placeholder="Ingrese el título del contenido"
                          className="app-form-input"
                          required
                        />
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Tipo de contenido *</label>
                        <select
                          name="tipo"
                          value={formData.tipo}
                          onChange={handleInputChange}
                          className="app-form-select"
                          required
                        >
                          <option value="video">Video</option>
                          <option value="document">Documento</option>
                          <option value="explicacion">Explicación</option>
                          <option value="simulacion_ruta_critica">🎯 Simulación Ruta Crítica (CPM)</option>
                          <option value="simulador_curva_s">Simulador · Curva S (EVM)</option>
                        </select>
                      </div>
                    </div>

                    {formData.tipo !== 'simulacion_ruta_critica' && (
                      <div className={`app-form-field ${formData.tipo === 'simulador_curva_s' ? '' : 'mt-4'}`}>
                        <label className="app-form-label">
                          {formData.tipo === 'simulador_curva_s' ? 'URL (opcional)' : 'URL *'}
                        </label>
                        <input
                          type="url"
                          name="url"
                          value={formData.url}
                          onChange={handleInputChange}
                          placeholder={
                            formData.tipo === 'simulador_curva_s'
                              ? 'Enlace opcional (p. ej. material complementario)'
                              : 'https://ejemplo.com/contenido'
                          }
                          className="app-form-input"
                          required={formData.tipo !== 'simulador_curva_s'}
                        />
                        {formData.tipo === 'simulador_curva_s' ? (
                          <p className="text-xs text-slate-500 mt-1">
                            El simulador interactivo es el recurso principal. Si dejas la URL vacía, el sistema guardará un enlace interno de referencia.
                          </p>
                        ) : null}
                      </div>
                    )}

                  </section>

                  {/* Descripción ANTES del editor CPM */}
                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Descripción del recurso</h4>
                      <p className="app-form-section-description">
                        {formData.tipo === 'simulacion_ruta_critica'
                          ? 'Explica brevemente el contexto del proyecto o los objetivos de aprendizaje de esta simulación.'
                          : formData.tipo === 'simulador_curva_s'
                            ? 'Contextualiza la simulación de la Curva S y los indicadores EVM para el estudiante.'
                            : 'Usa el editor enriquecido para explicar el enfoque del contenido, instrucciones de uso o contexto pedagógico.'}
                      </p>
                    </div>
                    <div className="app-form-field">
                      <label className="app-form-label">Descripción *</label>
                      <div className="quill-editor-container app-rich-text-editor">
                        <div ref={editorRef} className="w-full" data-placeholder="Ingrese la descripción del contenido" />
                      </div>
                    </div>
                  </section>

                  {/* Editor CPM DESPUÉS de la descripción */}
                  {formData.tipo === 'simulacion_ruta_critica' && (
                    <section className="app-form-section">
                      <div className="mb-4 space-y-1.5">
                        <h4 className="app-form-section-title">Actividades del proyecto (CPM) *</h4>
                        <p className="app-form-section-description">Define la tabla de actividades. Los cambios se guardan automáticamente.</p>
                      </div>
                      <div className="app-form-field">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                          {formData.url && (() => {
                            try { const n=JSON.parse(formData.url).activities?.length; return <span style={{fontSize:12,color:'#16a34a',fontWeight:600}}>✅ {n} actividad(es) configuradas</span>; } catch { return null; }
                          })()}
                        </div>
                        <div style={{ borderRadius: 12, border: '1.5px solid #bfd3f5' }}>
                          <CPMSimulationCreator
                            initialActivities={(() => { try { return JSON.parse(formData.url||'{}').activities as CPMActivity[]; } catch { return undefined; } })()}
                            onChange={(acts: CPMActivity[]) => setFormData(prev => ({ ...prev, url: JSON.stringify({ activities: acts }) }))}
                            onSave={(acts: CPMActivity[]) => setFormData(prev => ({ ...prev, url: JSON.stringify({ activities: acts }) }))}
                            hideActions
                          />
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Vinculación académica</h4>
                      <p className="app-form-section-description">Asocia el contenido con el asignatura, tema y subtema correctos para mantener ordenada la navegación del estudiante.</p>
                    </div>

                    <div className="app-form-grid">
                      <div className="app-form-field">
                        <label className="app-form-label">Asignatura *</label>
                        <select
                          value={selectedAsignaturaId}
                          onChange={(e) => setSelectedasignaturaId(e.target.value)}
                          className="app-form-select"
                          required
                          disabled={isFlowScoped}
                        >
                          <option value="">Seleccione un asignatura</option>
                          {asignaturas.map((Asignatura) => (
                            <option key={Asignatura.id} value={Asignatura.id}>
                              {Asignatura.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Tema *</label>
                        <select
                          name="tema_id"
                          value={formData.tema_id}
                          onChange={handleInputChange}
                          className="app-form-select"
                          required
                          disabled={!selectedAsignaturaId || temas.length === 0}
                        >
                          <option value="">Seleccione un tema</option>
                          {temas.map((tema) => (
                            <option key={tema.id} value={tema.id}>
                              {tema.nombre}
                            </option>
                          ))}
                        </select>
                        {selectedAsignaturaId && temas.length === 0 && (
                          <p className="text-sm text-gray-500">No hay temas disponibles para esta asignatura.</p>
                        )}
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Subtema *</label>
                        <select
                          name="subtema_id"
                          value={formData.subtema_id}
                          onChange={handleInputChange}
                          className="app-form-select"
                          required
                          disabled={!formData.tema_id || subtemas.length === 0}
                        >
                          <option value="">Seleccione un subtema</option>
                          {subtemas.map((subtema) => (
                            <option key={subtema.id} value={subtema.id}>
                              {subtema.nombre}
                            </option>
                          ))}
                        </select>
                        {formData.tema_id && subtemas.length === 0 && (
                          <p className="text-sm text-gray-500">No hay subtemas disponibles para este tema.</p>
                        )}
                      </div>
                    </div>
                  </section>
                </form>

                <aside className="app-form-aside app-form-stack md:self-start">
                  <section className="app-form-section app-form-section--accent">
                    <h4 className="app-form-section-title">Resumen del contenido</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Recurso</div>
                        <div className="app-form-summary-value">{formData.titulo.trim() || 'Sin título definido'}</div>
                        <div className="app-form-summary-help">{contentTypeLabel}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Asignatura</div>
                          <div className="app-form-summary-value">{selectedAsignatura?.nombre || 'Pendiente'}</div>
                        </div>
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Tema</div>
                          <div className="app-form-summary-value">{selectedTema?.nombre || 'Pendiente'}</div>
                        </div>
                      </div>
                      <div className="app-form-note">
                        <div className="app-form-summary-label">Subtema asignado</div>
                        <div className="app-form-summary-value">{selectedSubtema?.nombre || 'Selecciona un subtema'}</div>
                        <div className="app-form-summary-help">Avance del formulario: {contentCompletion}/6 campos clave completos.</div>
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <h4 className="app-form-section-title">Antes de guardar</h4>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      <p>Comprueba que la URL realmente abre el recurso esperado y no una página temporal.</p>
                      <p>Escribe una descripción útil: luego servirá de contexto para docentes y para la organización académica.</p>
                      <p>Ubica el recurso en el subtema correcto para que después la secuencia no quede desordenada.</p>
                    </div>
                  </section>
                </aside>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff', flexShrink: 0 }}>
              <button type="button" onClick={() => setShowCreateModal(false)} disabled={isLoading}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" form="content-form" disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', borderRadius: '10px', background: isLoading ? '#6b8fc8' : 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                {isLoading ? <><Loader className="w-4 h-4 animate-spin" />{isEditMode ? 'Actualizando...' : 'Creando...'}</> : <>{isEditMode ? 'Actualizar contenido' : 'Crear contenido'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
