import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, FileText, PlayCircle, Edit, Trash2, Eye, EyeOff, Search, Loader } from 'lucide-react';
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

export function ContentManagementScreen({ onBack }: ContentManagementScreenProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar contenidos al montar el componente
  useEffect(() => {
    loadContenidos();
  }, []);

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
      
      // Mapear los datos del backend a la estructura local
      const contenidosMapeados: ContentItem[] = data.map((item: any) => ({
        id: item.id?.toString() || '',
        title: item.titulo,
        type: item.tipo,
        linkedTo: 'subtheme',
        linkedName: `Tema ${item.tema_id} - Subtema ${item.subtema_id}`,
        subject: 'Sin clasificar',
        status: 'draft',
        tema_id: item.tema_id,
        subtema_id: item.subtema_id,
        descripcion: item.descripcion,
        url: item.url
      }));

      setContents(contenidosMapeados);
    } catch (err) {
      console.error('Error cargando contenidos:', err);
      setError('No se pudieron cargar los contenidos');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Función para crear o actualizar contenido
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `http://localhost:4000/contenidos/${selectedContent?.id}`
        : 'http://localhost:4000/contenidos';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: formData.titulo,
          tipo: formData.tipo,
          descripcion: formData.descripcion,
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
        setSuccess('Contenido actualizado exitosamente');
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
        setSuccess('Contenido creado exitosamente');
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
      setIsEditMode(false);
      setSelectedContent(null);

      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        setShowCreateModal(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para actualizar contenido (abrir modal en modo edición)
  const handleEditContent = (content: ContentItem) => {
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
    setShowCreateModal(true);
  };

  // Función para eliminar contenido
  const handleDeleteContent = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este contenido?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/contenidos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el contenido');
      }

      setContents(contents.filter(c => c.id !== id));
      setSuccess('Contenido eliminado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
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

  // When modal opens in edit mode, populate editor HTML
  useEffect(() => {
    if (showCreateModal && isEditMode && selectedContent && editorRef.current) {
      editorRef.current.innerHTML = selectedContent.descripcion || '';
      setFormData(prev => ({ ...prev, descripcion: selectedContent.descripcion || '' }));
    }
    if (showCreateModal && !isEditMode && editorRef.current) {
      editorRef.current.innerHTML = formData.descripcion || '';
    }
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
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Duración</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
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
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.duration || '-'}</td>
                      <td className="px-6 py-4">
                        {content.status === 'published' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            Publicado
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            Borrador
                          </span>
                        )}
                      </td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
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
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {success}
              </div>
            )}

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

                <div className="mb-2 flex gap-2">
                  <button type="button" onClick={() => document.execCommand('bold')} className="px-2 py-1 border rounded">B</button>
                  <button type="button" onClick={() => document.execCommand('italic')} className="px-2 py-1 border rounded">I</button>
                  <button type="button" onClick={() => document.execCommand('underline')} className="px-2 py-1 border rounded">U</button>
                  <button type="button" onClick={() => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return;
                    const range = sel.getRangeAt(0);
                    const text = range.toString().toUpperCase();
                    document.execCommand('insertHTML', false, `<span style=\"text-transform:uppercase\">${text}</span>`);
                  }} className="px-2 py-1 border rounded">Mayúsculas</button>
                  <button type="button" onClick={() => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return;
                    const range = sel.getRangeAt(0);
                    const text = range.toString().toLowerCase();
                    document.execCommand('insertHTML', false, `<span style=\"text-transform:lowercase\">${text}</span>`);
                  }} className="px-2 py-1 border rounded">Minúsculas</button>
                  <button type="button" onClick={() => document.execCommand('fontSize', false, '4')} className="px-2 py-1 border rounded">A+</button>
                  <button type="button" onClick={() => document.execCommand('fontSize', false, '2')} className="px-2 py-1 border rounded">A-</button>
                </div>

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setFormData(prev => ({ ...prev, descripcion: (e.target as HTMLDivElement).innerHTML }))}
                  className="w-full min-h-[100px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  data-placeholder="Ingrese la descripción del contenido"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {/* El contenido HTML se sincroniza en showCreateModal effect */}
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

              {/* Tema ID */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  ID del Tema *
                </label>
                <input
                  type="number"
                  name="tema_id"
                  value={formData.tema_id}
                  onChange={handleInputChange}
                  placeholder="Ingrese el ID del tema"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                />
              </div>

              {/* Subtema ID */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  ID del Subtema *
                </label>
                <input
                  type="number"
                  name="subtema_id"
                  value={formData.subtema_id}
                  onChange={handleInputChange}
                  placeholder="Ingrese el ID del subtema"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                />
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
    </div>
  );
}
