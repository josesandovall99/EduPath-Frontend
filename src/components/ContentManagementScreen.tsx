import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, FileText, PlayCircle, Edit, Trash2, Eye, EyeOff, Search, Loader, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ContentManagementScreenProps {
  onBack: () => void;
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

export function ContentManagementScreen({ onBack }: ContentManagementScreenProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<ContentItem | null>(null);

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

  // Funciones para cargar datos
  const loadAreas = async () => {
    try {
      const response = await fetch('http://localhost:4000/areas');
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
      const response = await fetch('http://localhost:4000/temas/por-area/' + areaId);
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
      const response = await fetch('http://localhost:4000/subtemas/por-tema/' + temaId);
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
      const response = await fetch('http://localhost:4000/contenidos', {
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
              const temaResponse = await fetch(`http://localhost:4000/temas/${item.tema_id}`);
              if (temaResponse.ok) {
                const tema = await temaResponse.json();
                temaNombre = tema.nombre;

                // Obtener información del área
                if (tema.area_id) {
                  try {
                    const areaResponse = await fetch(`http://localhost:4000/areas/${tema.area_id}`);
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
              const subtemaResponse = await fetch(`http://localhost:4000/subtemas/${item.subtema_id}`);
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
            status: 'draft',
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
        ? `http://localhost:4000/contenidos/${selectedContent?.id}`
        : 'http://localhost:4000/contenidos';

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
            ? {
                ...c,
                title: contenidoActualizado.titulo,
                type: contenidoActualizado.tipo,
                descripcion: contenidoActualizado.descripcion,
                url: contenidoActualizado.url,
                tema_id: contenidoActualizado.tema_id,
                subtema_id: contenidoActualizado.subtema_id
              }
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
          status: 'draft',
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
        const response = await fetch('http://localhost:4000/temas/' + content.tema_id);
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

  // Función para eliminar contenido
  const handleDeleteContent = async (id: string) => {
    const content = contents.find(c => c.id === id);
    if (content) {
      setContentToDelete(content);
      setShowDeleteConfirmation(true);
    }
  };

  // Función para confirmar eliminación
  const confirmDeleteContent = async () => {
    if (!contentToDelete) return;

    setIsLoading(true);
    setShowDeleteConfirmation(false);

    try {
      const response = await fetch(`http://localhost:4000/contenidos/${contentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el contenido');
      }

      setContents(contents.filter(c => c.id !== contentToDelete.id));
      
      // Toast informativo cuando se elimina contenido
      toast.warning('⚠️ Contenido eliminado', {
        description: `"${contentToDelete.title}" ha sido eliminado. Si estaba en una secuencia, verifica y actualiza esa Secuencia de Contenido.`,
        duration: 8000,
        closeButton: true
      });
    } catch (err) {
      toast.error('Error al eliminar', {
        description: err instanceof Error ? err.message : 'Error desconocido'
      });
    } finally {
      setIsLoading(false);
      setContentToDelete(null);
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

  // Initialize Quill when modal opens and sync content
  useEffect(() => {
    // When the modal opens, (re)create the Quill instance so the toolbar
    // and editor are always freshly rendered. Register custom font and
    // numeric size whitelists so the toolbar shows desired options.
    if (showCreateModal && editorRef.current && (window as any).Quill) {
      try {
        const Quill = (window as any).Quill;
        // Register size as STYLE attributor (applies font-size in px, not classes)
        const SizeStyle = Quill.import('attributors/style/size');
        SizeStyle.whitelist = ['10px','12px','14px','16px','18px','20px','24px','32px'];
        Quill.register(SizeStyle, true);

        // Register fonts as STYLE attributor 
        const FontStyle = Quill.import('attributors/style/font');
        FontStyle.whitelist = ['Arial','Monospace','Algerian'];
        Quill.register(FontStyle, true);
      } catch (err) {
        console.warn('Quill format registration failed', err);
      }

      // Ensure container is empty before creating Quill
      editorRef.current.innerHTML = '';
      quillRef.current = new (window as any).Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Ingrese la descripción del contenido',
        modules: {
          toolbar: [
            [{ 'font': ['Arial','Monospace','Algerian'] }],
            [{ 'size': ['10px','12px','14px','16px','18px','20px','24px','32px'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
          ]
        }
      });

      // Set default size to 14px
      quillRef.current.format('size', '14px');

      // Determine initial content (edit mode takes precedence)
      const initialHtml = isEditMode && selectedContent ? (selectedContent.descripcion || '') : (formData.descripcion || '');
      quillRef.current.root.innerHTML = initialHtml;
      setFormData(prev => ({ ...prev, descripcion: initialHtml }));

      quillRef.current.on('text-change', () => {
        setFormData(prev => ({ ...prev, descripcion: quillRef.current.root.innerHTML }));
      });
    }

    // Cleanup: when modal closes, remove Quill's DOM and clear ref so it
    // will be recreated next time the modal opens (prevents toolbar missing).
    return () => {
      if (!showCreateModal && quillRef.current) {
        if (editorRef.current) editorRef.current.innerHTML = '';
        quillRef.current = null;
      }
    };
  }, [showCreateModal, isEditMode, selectedContent]);

  const filteredContents = filterType === 'all' 
    ? contents 
    : contents.filter(c => c.type === filterType);

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
                <h1 className="text-[#3A4A5B]">Gestión de Contenidos</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Contenido</span>
            </button>
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
                {contents.filter(c => c.status === 'published').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Publicados</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-gray-500" />
              </div>
              <span className="text-3xl text-gray-500">
                {contents.filter(c => c.status === 'draft').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Borradores</p>
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
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-[#4A90E2] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('video')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'video'
                    ? 'bg-[#4A90E2] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setFilterType('document')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'document'
                    ? 'bg-[#7ED6A7] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Documentos
              </button>
              <button
                onClick={() => setFilterType('activity')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'activity'
                    ? 'bg-[#F5A97F] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Actividades
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
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
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContents.map((content) => {
                  const Icon = getTypeIcon(content.type);
                  const color = getTypeColor(content.type);
                  
                  return (
                    <tr key={content.id} className="hover:bg-gray-50 transition-colors">
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditContent(content)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContent(content.id)}
                            disabled={isLoading}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
        </div>
      </main>

      {/* Modal de Crear/Editar Contenido */}
      {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
                  <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-[1640px] max-w-[80%] max-h-[90vh] overflow-auto relative" style={{ borderLeft: '6px solid rgba(74,144,226,0.08)', width: 1640, maxWidth: '95%', maxHeight: '90vh' }}>
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: 'linear-gradient(90deg, rgba(74,144,226,0.12), rgba(74,144,226,0.06))' }} />
                  <div className="flex items-center justify-between mb-6 pt-2">
              <h2 className="text-2xl font-bold text-[#3A4A5B]">
                {isEditMode ? 'Editar Contenido' : 'Crear Nuevo Contenido'}
              </h2>
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
                }}
                      className="text-gray-400 hover:text-[#4A90E2] text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitContent} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  placeholder="Ingrese el título del contenido"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                />
              </div>

              {/* Descripción (editor enriquecido) */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Descripción *
                </label>
                <div className="quill-editor-container">
                  <div
                    ref={editorRef}
                    className="w-full"
                    data-placeholder="Ingrese la descripción del contenido"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://ejemplo.com/contenido"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                />
              </div>

              {/* Tipo de Contenido */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Tipo de Contenido *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                >
                  <option value="video">Videos</option>
                  <option value="document">Documento</option>
                  <option value="activity">Explicación</option>
                </select>
              </div>

              {/* Área */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Área *
                </label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
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

              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Tema *
                </label>
                <select
                  name="tema_id"
                  value={formData.tema_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
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
                  <p className="text-sm text-gray-500 mt-1">No hay temas disponibles para esta área</p>
                )}
              </div>

              {/* Subtema */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Subtema *
                </label>
                <select
                  name="subtema_id"
                  value={formData.subtema_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
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
                  <p className="text-sm text-gray-500 mt-1">No hay subtemas disponibles para este tema</p>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirmation && contentToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '420px', width: '100%', padding: '32px' }}>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flexShrink: 0 }}>
                <AlertTriangle style={{ width: '32px', height: '32px', color: '#dc2626' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3A4A5B', marginBottom: '16px' }}>
                  Eliminar contenido
                </h3>
                <p style={{ color: '#4b5563', marginBottom: '16px', lineHeight: '1.5' }}>
                  ¿Estás seguro de que deseas eliminar <strong>"{contentToDelete.title}"</strong>?
                </p>
                
                <div style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '6px', padding: '12px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '14px', color: '#78350f', lineHeight: '1.6' }}>
                    <strong>⚠️ Importante:</strong> Si este contenido está vinculado a una <strong>Secuencia de Contenido</strong>, la secuencia se verá afectada y se redireccionará automáticamente al siguiente contenido.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setContentToDelete(null);
                }}
                disabled={isLoading}
                style={{ padding: '8px 16px', color: '#374151', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '500', opacity: isLoading ? 0.5 : 1 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteContent}
                disabled={isLoading}
                style={{ padding: '8px 16px', color: 'white', backgroundColor: '#dc2626', borderRadius: '8px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: isLoading ? 0.5 : 1 }}
              >
                {isLoading ? (
                  <>
                    <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                    Sí, eliminar
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
