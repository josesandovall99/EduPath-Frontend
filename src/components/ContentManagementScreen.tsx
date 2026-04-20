import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Plus, FileText, PlayCircle, Edit, Eye, EyeOff, Search, Loader } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';
import { createQuillModules, loadQuill } from '../utils/quill';

interface ContentManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  scopeMode?: 'catalog' | 'flow';
  initialAreaId?: number;
  initialAreaName?: string;
  initialTemaId?: number;
  initialTemaName?: string;
  initialSubtemaId?: number;
  initialSubtemaName?: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity';
  linkedTo: 'theme' | 'subtheme';
  linkedName: string;
  subject: string;
  duration?: string;
  status: 'published' | 'draft';
  estado?: boolean;
  area_id?: number;
  tema_id?: number;
  subtema_id?: number;
  descripcion?: string;
  url?: string;
}

interface CreateContentFormData {
  titulo: string;
  tipo: 'video' | 'document' | 'activity';
  descripcion: string;
  url: string;
  tema_id: string;
  subtema_id: string;
}

interface Area {
  id: number;
  nombre: string;
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

  if (normalized === 'activity' || normalized === 'actividad' || normalized === 'explicacion' || normalized === 'explicación') {
    return 'activity';
  }

  return 'activity';
};

export function ContentManagementScreen({
  onBack,
  onHome,
  scopeMode = 'catalog',
  initialAreaId,
  initialAreaName,
  initialTemaId,
  initialTemaName,
  initialSubtemaId,
  initialSubtemaName,
}: ContentManagementScreenProps) {
  const scopeAreaId = initialAreaId ? String(initialAreaId) : '';
  const scopeTemaId = initialTemaId ? String(initialTemaId) : '';
  const scopeSubtemaId = initialSubtemaId ? String(initialSubtemaId) : '';
  const isFlowScoped = scopeMode === 'flow' && Boolean(scopeAreaId || scopeTemaId || scopeSubtemaId);

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

  // Estados para áreas, temas y subtemas
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(isFlowScoped ? scopeAreaId : '');
  const preserveAreaSelectionRef = useRef(false);
  const preserveTemaSelectionRef = useRef(false);
  const isContentActive = (content: ContentItem) => content.estado !== false;

  const buildContenidosRequestUrl = () => {
    const query = new URLSearchParams();

    if (isFlowScoped) {
      if (scopeAreaId) {
        query.set('areaId', scopeAreaId);
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
  const loadAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/areas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAreas(data);
      }
    } catch (err) {
      console.error('Error cargando áreas:', err);
    }
  };

  const loadTemasByArea = async (areaId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/temas/por-area/` + areaId, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTemas(data);
      }
    } catch (err) {
      console.error('Error cargando temas:', err);
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
      console.error('Error cargando subtemas:', err);
      setSubtemas([]);
    }
  };

  // Cargar contenidos y áreas al montar el componente
  useEffect(() => {
    loadContenidos();
  }, [scopeAreaId, scopeTemaId, scopeSubtemaId, isFlowScoped]);

  // Cargar temas cuando cambia el área seleccionada
  useEffect(() => {
    if (selectedAreaId) {
      loadTemasByArea(selectedAreaId);
      if (preserveAreaSelectionRef.current) {
        preserveAreaSelectionRef.current = false;
        return;
      }

      setFormData(prev => ({ ...prev, tema_id: '', subtema_id: '' }));
    } else {
      setTemas([]);
      setSubtemas([]);
    }
  }, [selectedAreaId]);

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

    preserveAreaSelectionRef.current = true;
    preserveTemaSelectionRef.current = true;
    setSelectedAreaId(scopeAreaId);
    setFormData((prev) => ({
      ...prev,
      tema_id: scopeTemaId,
      subtema_id: scopeSubtemaId
    }));
  }, [showCreateModal, isEditMode, isFlowScoped, scopeAreaId, scopeTemaId, scopeSubtemaId]);

  // Función para cargar todos los contenidos
  const loadContenidos = async () => {
    setIsLoadingData(true);
    try {
      const requestOptions = {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include' as const
      };

      const [contentsResponse, temasResponse, subtemasResponse, areasResponse] = await Promise.all([
        fetch(buildContenidosRequestUrl(), {
          method: 'GET',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json',
          }),
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/temas`, requestOptions),
        fetch(`${API_BASE_URL}/subtemas`, requestOptions),
        fetch(`${API_BASE_URL}/areas`, requestOptions)
      ]);

      if (!contentsResponse.ok) {
        throw new Error('Error al cargar los contenidos');
      }

      const [data, temasCatalog, subtemasCatalog, areasCatalog] = await Promise.all([
        contentsResponse.json() as Promise<BackendContenidoItem[]>,
        temasResponse.ok ? (temasResponse.json() as Promise<Tema[]>) : Promise.resolve([]),
        subtemasResponse.ok ? (subtemasResponse.json() as Promise<Subtema[]>) : Promise.resolve([]),
        areasResponse.ok ? (areasResponse.json() as Promise<Area[]>) : Promise.resolve([])
      ]);

      setAreas(areasCatalog);

      const temasById = new Map(temasCatalog.map((tema) => [Number(tema.id), tema]));
      const subtemasById = new Map(subtemasCatalog.map((subtema) => [Number(subtema.id), subtema]));
      const areasById = new Map(areasCatalog.map((area) => [Number(area.id), area]));

      const contenidosMapeados: ContentItem[] = data.map((item) => {
        const tema = item.tema_id ? temasById.get(Number(item.tema_id)) : undefined;
        const subtema = item.subtema_id ? subtemasById.get(Number(item.subtema_id)) : undefined;
        const area = tema?.area_id ? areasById.get(Number(tema.area_id)) : undefined;

        return {
          id: item.id?.toString() || '',
          title: item.titulo,
          type: normalizeContentType(item.tipo),
          linkedTo: 'subtheme',
          linkedName: tema?.nombre && subtema?.nombre ? `${tema.nombre} - ${subtema.nombre}` : 'Sin vincular',
          subject: area?.nombre || 'Sin clasificar',
          status: item.estado === false ? 'draft' : 'published',
          estado: item.estado !== false,
          area_id: tema?.area_id,
          tema_id: item.tema_id,
          subtema_id: item.subtema_id,
          descripcion: item.descripcion,
          url: item.url
        };
      });

      setContents(contenidosMapeados);
    } catch (err) {
      console.error('Error cargando contenidos:', err);
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

    if (!formData.titulo.trim() || !formData.url.trim() || !selectedAreaId || !formData.tema_id || !formData.subtema_id || !descripcionPlano) {
      toast.error('Formulario incompleto', {
        description: 'Completa título, descripción, URL, área, tema y subtema antes de guardar.'
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
          descripcion: descripcionHtml,
          url: formData.url,
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
      setSelectedAreaId(isFlowScoped ? scopeAreaId : '');
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

    // Si hay tema_id, cargar el tema para obtener el área
    if (content.tema_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/temas/` + content.tema_id, {
          headers: buildAuthHeaders({ Accept: 'application/json' }),
          credentials: 'include'
        });
        if (response.ok) {
          const tema = await response.json();
          preserveAreaSelectionRef.current = true;
          setSelectedAreaId(tema.area_id.toString());
        }
      } catch (err) {
        console.error('Error cargando tema:', err);
      }
    }

    setShowCreateModal(true);
  };

  const handleToggleContent = async (content: ContentItem) => {
    const currentlyActive = isContentActive(content);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    if (!window.confirm(`Deseas ${actionLabel} el contenido "${content.title}"?`)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contenidos/${content.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error al ${actionLabel} el contenido`);
      }

      const data = await response.json().catch(() => null);
      const updatedEstado = data?.contenido?.estado ?? !currentlyActive;

      setContents((prev) => prev.map((item) => (
        item.id === content.id
          ? {
              ...item,
              estado: updatedEstado,
              status: updatedEstado ? 'published' : 'draft'
            }
          : item
      )));
      
      toast.success(`Contenido ${updatedEstado ? 'habilitado' : 'inhabilitado'}`, {
        description: updatedEstado
          ? `"${content.title}" vuelve a estar disponible en la gestión administrativa.`
          : `"${content.title}" quedó inhabilitado. Si estaba en una secuencia, revisa esa Secuencia de Contenido.`,
        duration: 6000,
        closeButton: true
      });
    } catch (err) {
      toast.error('Error al cambiar estado', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
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

  // Rich text editor ref and helpers
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  // Initialize Quill when modal opens and sync content.
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
    const matchesAreaScope = !isFlowScoped || !scopeAreaId || String(content.area_id || '') === scopeAreaId;
    const matchesTemaScope = !isFlowScoped || !scopeTemaId || String(content.tema_id || '') === scopeTemaId;
    const matchesSubtemaScope = !isFlowScoped || !scopeSubtemaId || String(content.subtema_id || '') === scopeSubtemaId;

    return matchesAreaScope && matchesTemaScope && matchesSubtemaScope;
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

    return matchesType && matchesState && matchesSearch;
  });

  const selectedArea = areas.find((area) => String(area.id) === selectedAreaId);
  const selectedTema = temas.find((tema) => String(tema.id) === formData.tema_id);
  const selectedSubtema = subtemas.find((subtema) => String(subtema.id) === formData.subtema_id);
  const contentTypeLabel = formData.tipo === 'video'
    ? 'Video'
    : formData.tipo === 'document'
      ? 'Documento'
      : 'Explicación';
  const contentCompletion = [
    formData.titulo.trim(),
    formData.descripcion.replace(/<[^>]*>/g, '').trim(),
    formData.url.trim(),
    selectedAreaId,
    formData.tema_id,
    formData.subtema_id
  ].filter(Boolean).length;
  const activeContentsCount = scopedContents.filter((content) => isContentActive(content)).length;
  const inactiveContentsCount = scopedContents.length - activeContentsCount;
  const flowScopeLabel = initialSubtemaName
    ? `subtema ${initialSubtemaName}`
    : initialTemaName
      ? `tema ${initialTemaName}`
      : initialAreaName
        ? `área ${initialAreaName}`
        : 'recorrido actual';
  const flowBreadcrumbs = isFlowScoped
    ? [
        { label: 'Panel admin' },
        ...(initialAreaName ? [{ label: initialAreaName }] : []),
        ...(initialTemaName ? [{ label: initialTemaName }] : []),
        ...(initialSubtemaName ? [{ label: initialSubtemaName }] : []),
        { label: 'Gestión de contenidos', current: true as const }
      ]
    : [];

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return PlayCircle;
      case 'document': return FileText;
      case 'activity': return Edit;
      default: return FileText;
    }
  };

  const getTypeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return '#4A90E2';
      case 'document': return '#7ED6A7';
      case 'activity': return '#F5A97F';
      default: return '#64748B';
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button
                type="button"
                onClick={onHome}
                className="app-brand-icon"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Contenidos</h1>
                <p className="text-gray-500 text-sm">Catálogo, búsqueda y mantenimiento de recursos dentro del mismo entorno administrativo.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button 
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <section className="app-page-hero mb-6">
          {isFlowScoped && (
            <div className="app-flow-guide__breadcrumbs mb-6">
              {flowBreadcrumbs.map((breadcrumb, index) => (
                <div key={`${breadcrumb.label}-${index}`} className="app-flow-guide__breadcrumb-wrap">
                  <span
                    className={`app-flow-guide__breadcrumb ${breadcrumb.current ? 'app-flow-guide__breadcrumb--current' : ''}`}
                  >
                    {breadcrumb.label}
                  </span>
                  {index < flowBreadcrumbs.length - 1 && <ArrowRight className="app-flow-guide__separator" />}
                </div>
              ))}
            </div>
          )}

          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Biblioteca administrativa</div>
              <h2 className="app-page-hero__title">Gestión de contenidos</h2>
              <p className="app-page-hero__description">
                {isFlowScoped
                  ? `Consulta, filtra y actualiza solo los contenidos del ${flowScopeLabel}.`
                  : 'Consulta, filtra y actualiza contenidos.'}
              </p>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--wide-main">
            <div className="app-toolbar-card">
              <div className="app-content-toolbar__header">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catálogo</p>
                  <p className="mt-1 text-sm text-slate-600">Filtra, busca y deja listo el acceso al catálogo.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="app-btn app-btn-success">
                  <Plus className="w-5 h-5" />
                  <span>Nuevo contenido</span>
                </button>
              </div>

              <div className="app-content-toolbar__search app-search-field">
                <Search className="app-search-field__icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por título, área o descripción"
                  className="app-form-input"
                />
              </div>

              <div className="app-content-filter-grid">
                <div className="app-content-filter-block">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tipo de contenido</p>
                  <p className="mt-1 text-sm text-slate-600">Filtra por formato.</p>
                  <div className="app-filter-row mt-4">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`app-filter-chip ${filterType === 'all' ? 'app-filter-chip--blue' : ''}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterType('video')}
                      className={`app-filter-chip ${filterType === 'video' ? 'app-filter-chip--blue' : ''}`}
                    >
                      Videos
                    </button>
                    <button
                      onClick={() => setFilterType('document')}
                      className={`app-filter-chip ${filterType === 'document' ? 'app-filter-chip--green' : ''}`}
                    >
                      Documentos
                    </button>
                    <button
                      onClick={() => setFilterType('activity')}
                      className={`app-filter-chip ${filterType === 'activity' ? 'app-filter-chip--amber' : ''}`}
                    >
                      Actividades
                    </button>
                  </div>
                </div>

                <div className="app-content-filter-block">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado visible</p>
                  <p className="mt-1 text-sm text-slate-600">Filtra por disponibilidad.</p>
                  <div className="app-filter-row mt-4">
                    <button
                      onClick={() => setStateFilter('all')}
                      className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setStateFilter('active')}
                      className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}
                    >
                      Activos ({activeContentsCount})
                    </button>
                    <button
                      onClick={() => setStateFilter('inactive')}
                      className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}
                    >
                      Inactivos ({inactiveContentsCount})
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-sidebar-stack">
              <div className="app-soft-card app-soft-card--blue">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {isFlowScoped ? 'Contexto del flujo' : 'Catálogo'}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#3A4A5B]">
                  {isFlowScoped ? 'Ruta activa' : 'Gestión del catálogo'}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {isFlowScoped
                    ? `Mostrando únicamente los contenidos vinculados al ${flowScopeLabel}.`
                    : 'Usa tipo, estado y búsqueda desde el mismo bloque para revisar el listado sin saltos visuales.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {isLoadingData ? (
          <div className="app-empty-panel py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando contenidos...</p>
            </div>
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
              <div className="app-table-card__header app-table-card__header--blue">
                <div>
                  <div className="app-table-card__title">Biblioteca de contenidos</div>
                  <p className="app-table-card__description">
                    {isFlowScoped
                      ? `Consulta únicamente los contenidos vinculados al ${flowScopeLabel}.`
                      : 'Consulta el catálogo y aplica acciones rápidas.'}
                  </p>
                </div>
              </div>
              <div className="app-table-card__body p-0">
              <div className="overflow-x-auto">
            <table className="app-data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Materia</th>
                  <th>Vinculado a</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContents.map((content) => {
                  const Icon = getTypeIcon(content.type);
                  const color = getTypeColor(content.type);
                  const contentIsActive = isContentActive(content);
                  
                  return (
                    <tr key={content.id} className={contentIsActive ? '' : 'bg-slate-50/70 text-slate-500'}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <span className="text-[#3A4A5B]">{content.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${color}15`, color }}>
                          {content.type === 'video' ? 'Videos' : content.type === 'document' ? 'Documento' : 'Explicación'}
                        </span>
                      </td>
                      <td>{content.subject}</td>
                      <td>{content.linkedName}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          contentIsActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {contentIsActive ? 'Activo' : 'Inhabilitado'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditContent(content)}
                            className="app-btn app-btn-ghost app-btn-icon app-btn-sm"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleContent(content)}
                            disabled={isLoading}
                            className={`app-btn app-btn-sm disabled:opacity-50 ${contentIsActive ? 'app-btn-secondary' : 'app-btn-success'}`}
                            title={contentIsActive ? 'Inhabilitar contenido' : 'Habilitar contenido'}
                          >
                            {contentIsActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span>{contentIsActive ? 'Inhabilitar' : 'Habilitar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
              </div>
            </div>
        )}

      </main>

      {/* Modal de Crear/Editar Contenido */}
      {showCreateModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div
            className="app-modal-card app-modal-card--xl"
            style={{ height: 'min(860px, calc(100vh - 2rem))' }}
          >
            <div className="app-modal-header">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="app-modal-kicker">Contenido</div>
                  <h2 className="app-modal-title">
                    {isEditMode ? 'Editar contenido' : 'Crear nuevo contenido'}
                  </h2>
                  <p className="app-modal-description">
                    Completa la ficha del recurso y déjalo listo para ubicarlo dentro de la secuencia del subtema correcto.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="app-modal-meta hidden sm:block">
                    <div className="app-modal-meta-label">Estado</div>
                    <div className="app-modal-meta-value">{isEditMode ? 'Edición activa' : 'Nuevo recurso'}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setIsEditMode(false);
                      setSelectedContent(null);
                      setFormData({
                        titulo: '',
                        tipo: 'video',
                        descripcion: '',
                        url: '',
                        tema_id: isFlowScoped ? scopeTemaId : '',
                        subtema_id: isFlowScoped ? scopeSubtemaId : ''
                      });
                      setSelectedAreaId(isFlowScoped ? scopeAreaId : '');
                    }}
                    className="app-modal-close"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
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

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field md:col-span-2">
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
                          <option value="video">Videos</option>
                          <option value="document">Documento</option>
                          <option value="activity">Explicación</option>
                        </select>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">URL *</label>
                        <input
                          type="url"
                          name="url"
                          value={formData.url}
                          onChange={handleInputChange}
                          placeholder="https://ejemplo.com/contenido"
                          className="app-form-input"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Descripción del recurso</h4>
                      <p className="app-form-section-description">Usa el editor enriquecido para explicar el enfoque del contenido, instrucciones de uso o contexto pedagógico.</p>
                    </div>

                    <div className="app-form-field">
                      <label className="app-form-label">Descripción *</label>
                      <div className="quill-editor-container app-rich-text-editor">
                        <div
                          ref={editorRef}
                          className="w-full"
                          data-placeholder="Ingrese la descripción del contenido"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Vinculación académica</h4>
                      <p className="app-form-section-description">Asocia el contenido con el área, tema y subtema correctos para mantener ordenada la navegación del estudiante.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Área *</label>
                        <select
                          value={selectedAreaId}
                          onChange={(e) => setSelectedAreaId(e.target.value)}
                          className="app-form-select"
                          required
                        >
                          <option value="">Seleccione un área</option>
                          {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.nombre}
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
                          disabled={!selectedAreaId || temas.length === 0}
                        >
                          <option value="">Seleccione un tema</option>
                          {temas.map((tema) => (
                            <option key={tema.id} value={tema.id}>
                              {tema.nombre}
                            </option>
                          ))}
                        </select>
                        {selectedAreaId && temas.length === 0 && (
                          <p className="text-sm text-gray-500">No hay temas disponibles para esta área.</p>
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
                          <div className="app-form-summary-label">Área</div>
                          <div className="app-form-summary-value">{selectedArea?.nombre || 'Pendiente'}</div>
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

            <div className="app-form-footer">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isLoading}
                className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="content-form"
                disabled={isLoading}
                className="app-btn app-btn-success rounded-xl px-6 py-3 text-white disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>{isEditMode ? 'Actualizando...' : 'Creando...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{isEditMode ? 'Actualizar Contenido' : 'Crear Contenido'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
