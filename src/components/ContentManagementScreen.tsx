import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, FileText, PlayCircle, Edit, Eye, EyeOff, Search, Loader } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { createQuillModules, loadQuill } from '../utils/quill';

interface ContentManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
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

export function ContentManagementScreen({ onBack, onHome }: ContentManagementScreenProps) {
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
    tema_id: '',
    subtema_id: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Estados para áreas, temas y subtemas
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const isContentActive = (content: ContentItem) => content.estado !== false;

  // Funciones para cargar datos
  const loadAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/areas`);
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
      const response = await fetch(`${API_BASE_URL}/temas/por-area/` + areaId);
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
      const response = await fetch(`${API_BASE_URL}/subtemas/por-tema/` + temaId);
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
    loadAreas();
  }, []);

  // Cargar temas cuando cambia el área seleccionada
  useEffect(() => {
    if (selectedAreaId) {
      loadTemasByArea(selectedAreaId);
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
      setFormData(prev => ({ ...prev, subtema_id: '' }));
    } else {
      setSubtemas([]);
    }
  }, [formData.tema_id]);

  // Función para cargar todos los contenidos
  const loadContenidos = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contenidos`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar los contenidos');
      }

      const data = await response.json();
      
      // Para cada contenido, obtener los nombres de área, tema y subtema
      const contenidosMapeados: ContentItem[] = await Promise.all(
        data.map(async (item: any) => {
          let areaNombre = 'Sin clasificar';
          let temaNombre = '';
          let subtemaNombre = '';

          // Obtener información del tema
          if (item.tema_id) {
            try {
              const temaResponse = await fetch(`${API_BASE_URL}/temas/${item.tema_id}`);
              if (temaResponse.ok) {
                const tema = await temaResponse.json();
                temaNombre = tema.nombre;

                // Obtener información del área
                if (tema.area_id) {
                  try {
                    const areaResponse = await fetch(`${API_BASE_URL}/areas/${tema.area_id}`);
                    if (areaResponse.ok) {
                      const area = await areaResponse.json();
                      areaNombre = area.nombre;
                    }
                  } catch (err) {
                    console.error('Error cargando área:', err);
                  }
                }
              }
            } catch (err) {
              console.error('Error cargando tema:', err);
            }
          }

          // Obtener información del subtema
          if (item.subtema_id) {
            try {
              const subtemaResponse = await fetch(`${API_BASE_URL}/subtemas/${item.subtema_id}`);
              if (subtemaResponse.ok) {
                const subtema = await subtemaResponse.json();
                subtemaNombre = subtema.nombre;
              }
            } catch (err) {
              console.error('Error cargando subtema:', err);
            }
          }

          return {
            id: item.id?.toString() || '',
            title: item.titulo,
            type: item.tipo,
            linkedTo: 'subtheme',
            linkedName: temaNombre && subtemaNombre ? `${temaNombre} - ${subtemaNombre}` : 'Sin vincular',
            subject: areaNombre,
            status: item.estado === false ? 'draft' : 'published',
            estado: item.estado !== false,
            tema_id: item.tema_id,
            subtema_id: item.subtema_id,
            descripcion: item.descripcion,
            url: item.url
          };
        })
      );

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
    setIsLoading(true);

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `${API_BASE_URL}/contenidos/${selectedContent?.id}`
        : `${API_BASE_URL}/contenidos`;

      const descripcionHtml = quillRef.current ? quillRef.current.root.innerHTML : formData.descripcion;

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
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
        // Actualizar en la lista
        const contenidosActualizados = contents.map(c => 
          c.id === selectedContent?.id
            ? (() => {
                const nextEstado = contenidoActualizado.estado ?? c.estado;
                const nextStatus: ContentItem['status'] = nextEstado === false ? 'draft' : 'published';

                return {
                  ...c,
                  title: contenidoActualizado.titulo,
                  type: contenidoActualizado.tipo,
                  descripcion: contenidoActualizado.descripcion,
                  url: contenidoActualizado.url,
                  estado: nextEstado,
                  status: nextStatus,
                  tema_id: contenidoActualizado.tema_id,
                  subtema_id: contenidoActualizado.subtema_id
                };
              })()
            : c
        );
        setContents(contenidosActualizados);
        toast.success('✓ Contenido actualizado', {
          description: 'El contenido se ha actualizado exitosamente',
          duration: 5000
        });
      } else {
        // Agregar nuevo contenido
        const nuevoItemLocal: ContentItem = {
          id: contenidoActualizado.id?.toString() || Date.now().toString(),
          title: contenidoActualizado.titulo,
          type: contenidoActualizado.tipo,
          linkedTo: 'subtheme',
          linkedName: `Tema ${contenidoActualizado.tema_id} - Subtema ${contenidoActualizado.subtema_id}`,
          subject: 'Sin clasificar',
          status: 'published',
          estado: true,
          tema_id: contenidoActualizado.tema_id,
          subtema_id: contenidoActualizado.subtema_id,
          descripcion: contenidoActualizado.descripcion,
          url: contenidoActualizado.url
        };
        setContents([...contents, nuevoItemLocal]);
        
        // Toast informativo para nuevo contenido
        toast.warning('⚠️ Nuevo contenido creado', {
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
        tema_id: '',
        subtema_id: ''
      });
      setSelectedAreaId('');
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
        const response = await fetch(`${API_BASE_URL}/temas/` + content.tema_id);
        if (response.ok) {
          const tema = await response.json();
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
        headers: {
          'Content-Type': 'application/json',
        }
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

  const filteredContents = contents.filter((content) => {
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

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return PlayCircle;
      case 'document': return FileText;
      case 'activity': return Edit;
    }
  };

  const getTypeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return '#4A90E2';
      case 'document': return '#7ED6A7';
      case 'activity': return '#F5A97F';
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onHome}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Contenidos</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="app-btn app-btn-success px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Contenido</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{contents.length}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Contenidos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-[#7ED6A7]" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">
                {contents.filter((content) => isContentActive(content)).length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Activos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-gray-500" />
              </div>
              <span className="text-3xl text-gray-500">
                {contents.filter((content) => !isContentActive(content)).length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Inhabilitados</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <PlayCircle className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">
                {contents.filter(c => c.type === 'video').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Videos</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="app-filter-row">
              <button
                onClick={() => setFilterType('all')}
                className={`app-filter-chip ${
                  filterType === 'all'
                    ? 'app-filter-chip--blue'
                    : ''
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('video')}
                className={`app-filter-chip ${
                  filterType === 'video'
                    ? 'app-filter-chip--blue'
                    : ''
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setFilterType('document')}
                className={`app-filter-chip ${
                  filterType === 'document'
                    ? 'app-filter-chip--green'
                    : ''
                }`}
              >
                Documentos
              </button>
              <button
                onClick={() => setFilterType('activity')}
                className={`app-filter-chip ${
                  filterType === 'activity'
                    ? 'app-filter-chip--amber'
                    : ''
                }`}
              >
                Actividades
              </button>
            </div>

              <div className="app-filter-row">
                <button
                  onClick={() => setStateFilter('all')}
                  className={`app-filter-chip ${
                    stateFilter === 'all'
                      ? 'app-filter-chip--blue'
                      : ''
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStateFilter('active')}
                  className={`app-filter-chip ${
                    stateFilter === 'active'
                      ? 'app-filter-chip--green'
                      : ''
                  }`}
                >
                  Activos ({contents.filter((content) => isContentActive(content)).length})
                </button>
                <button
                  onClick={() => setStateFilter('inactive')}
                  className={`app-filter-chip ${
                    stateFilter === 'inactive'
                      ? 'app-filter-chip--amber'
                      : ''
                  }`}
                >
                  Inactivos ({contents.filter((content) => !isContentActive(content)).length})
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar contenidos..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingData ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando contenidos...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Content Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Título</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Tipo</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Materia</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Vinculado a</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
                  <th className="px-6 py-4 text-center text-[#3A4A5B]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContents.map((content) => {
                  const Icon = getTypeIcon(content.type);
                  const color = getTypeColor(content.type);
                  const contentIsActive = isContentActive(content);
                  
                  return (
                    <tr key={content.id} className={`transition-colors ${contentIsActive ? 'hover:bg-gray-50' : 'bg-slate-50/70 text-slate-500'}`}>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${color}15`, color }}>
                          {content.type === 'video' ? 'Videos' : content.type === 'document' ? 'Documento' : 'Explicación'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.subject}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.linkedName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          contentIsActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {contentIsActive ? 'Activo' : 'Inhabilitado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditContent(content)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleContent(content)}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                              contentIsActive
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
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
          </>
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
                        tema_id: '',
                        subtema_id: ''
                      });
                      setSelectedAreaId('');
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
