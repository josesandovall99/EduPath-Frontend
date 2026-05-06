import { useState, useEffect } from 'react';
import { ArrowLeft, Code, Database, BarChart3, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Plus, Edit2, ChevronUp, X, Search } from 'lucide-react';
import axios from 'axios';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const personaId = localStorage.getItem('personaId');
  const authToken = localStorage.getItem('authToken');
  const adminId = localStorage.getItem('adminId');
  const nextHeaders = { ...(config.headers || {}) } as Record<string, unknown>;

  if (personaId) {
    nextHeaders['x-persona-id'] = personaId;
  }

  if (adminId) {
    nextHeaders['x-admin-id'] = adminId;
    nextHeaders['x-administrador-id'] = adminId;
  }

  if (authToken) {
    nextHeaders.Authorization = `Bearer ${authToken}`;
  }

  config.headers = nextHeaders as any;

  return config;
});

interface ThemeManagementScreenProps {
  onBack: () => void;
  initialAreaId?: string | number;
  initialEditTema?: {
    id: string | number;
    nombre: string;
    descripcion?: string;
    estado?: boolean;
    area_id: string | number;
  };
  embedded?: boolean;
  backLabel?: string;
  mode?: 'admin' | 'docente';
  lockAreaSelection?: boolean;
}

interface Area {
  id: string;
  nombre: string;
  descripcion: string;
}

interface Tema {
  id: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
  area_id: string;
}

interface Subtema {
  id: string;
  nombre: string;
  descripcion: string;
  tema_id: string;
}

interface Theme {
  id: string;
  name: string;
  enabled: boolean;
  subthemes: Subtheme[];
}

interface Subtheme {
  id: string;
  name: string;
  enabled: boolean;
}

// Colores por materia
const subjectColors: Record<string, { primary: string; light: string; icon: any }> = {
  'fundamentos': { primary: '#4A90E2', light: '#E3F2FD', icon: Code },
  'analisis': { primary: '#7ED6A7', light: '#E8F5E9', icon: Database },
  'alcance': { primary: '#F5A97F', light: '#FFF3E0', icon: BarChart3 }
};

export function ThemeManagementScreen({ onBack, initialAreaId, initialEditTema, embedded = false, backLabel, mode = 'admin', lockAreaSelection = false }: ThemeManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Record<string, Subtema[]>>({});
  const [loading, setLoading] = useState(true);
  const [temasLoading, setTemasLoading] = useState(false);
  const [subtemasLoading, setSubtemasLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [temasError, setTemasError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    estado: true,
    area_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const initialAreaIdValue = initialAreaId !== undefined && initialAreaId !== null ? String(initialAreaId) : '';
  const isDocenteMode = mode === 'docente';
  const buildAreaScopedConfig = (headers: Record<string, string> = {}, timeout?: number) => {
    const areaId = selectedSubject || initialAreaIdValue || formData.area_id;
    return {
      ...(timeout ? { timeout } : {}),
      headers: {
        ...headers,
        ...(isDocenteMode && areaId ? { 'x-area-id': String(areaId) } : {})
      }
    };
  };

  // Cargar áreas del backend
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        
      const response = await api.get('/areas', buildAreaScopedConfig({ Accept: 'application/json' }, 5000));
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de áreas');
        }
        
        setAreas(data);
        
        // Establecer área inicial (si llega desde el overlay) o la primera disponible
        const preferredAreaId = initialEditTema
          ? String(initialEditTema.area_id)
          : initialAreaIdValue;
        const matchedArea = data.find(area => area.id === preferredAreaId);
        if (matchedArea) {
          setSelectedSubject(matchedArea.id);
        } else if (data.length > 0) {
          setSelectedSubject(data[0].id);
        }
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar las áreas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor. ¿Está corriendo?';
          } else if (err.response?.status === 404) {
            errorMessage = 'El endpoint /areas no existe en el servidor.';
          } else if (err.response?.status) {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('Error fetching areas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  useEffect(() => {
    if (!initialEditTema) return;
    const normalizedTema: Tema = {
      id: String(initialEditTema.id),
      nombre: initialEditTema.nombre,
      descripcion: initialEditTema.descripcion || '',
      estado: initialEditTema.estado ?? true,
      area_id: String(initialEditTema.area_id)
    };
    setSelectedSubject(String(initialEditTema.area_id));
    setEditingTema(normalizedTema);
    setFormData({
      nombre: normalizedTema.nombre,
      descripcion: normalizedTema.descripcion,
      estado: normalizedTema.estado,
      area_id: normalizedTema.area_id
    });
    setShowModal(true);
  }, [initialEditTema]);

  // Cargar temas cuando cambia el área seleccionada
  useEffect(() => {
    if (!selectedSubject) return;

    const fetchTemas = async () => {
      try {
        setTemasLoading(true);
        setTemasError(null);
        
        // Admin necesita ver TODOS los temas (habilitados y deshabilitados)
        // Por eso usamos /temas en lugar de /temas/por-area que filtra por estado
        const response = await api.get('/temas', buildAreaScopedConfig({ Accept: 'application/json' }, 5000));
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de temas');
        }
        
        // Filtrar por área seleccionada
        const temasPorArea = data.filter(tema => tema.area_id === selectedSubject);
        
        // Ordenar temas por la columna 'orden'
        const temasOrdenados = temasPorArea.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setTemas(temasOrdenados);
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar los temas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor.';
          } else if (err.response?.status === 404) {
            errorMessage = 'No hay temas para esta área.';
          } else if (err.response?.status) {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setTemasError(errorMessage);
        setTemas([]);
        console.error('Error fetching temas:', err);
      } finally {
        setTemasLoading(false);
      }
    };

    fetchTemas();
  }, [selectedSubject]);

  // Cargar subtemas cuando se expande un tema
  const loadSubtemas = async (temaId: string) => {
    // Si ya están cargados, no hace nada
    if (subtemas[temaId]) {
      return;
    }

    try {
      setSubtemasLoading(prev => ({ ...prev, [temaId]: true }));
      
      const response = await api.get(`/subtemas/por-tema/${temaId}`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const data = response.data;
      
      if (!Array.isArray(data)) {
        throw new Error('La respuesta no es un array de subtemas');
      }
      
      setSubtemas(prev => ({ ...prev, [temaId]: data }));
    } catch (err) {
      console.error('Error fetching subtemas:', err);
      setSubtemas(prev => ({ ...prev, [temaId]: [] }));
    } finally {
      setSubtemasLoading(prev => ({ ...prev, [temaId]: false }));
    }
  };
  
  const [subjects] = useState([
    { id: 'fundamentos', name: 'Fundamentos de Programación' },
    { id: 'analisis', name: 'Análisis de Sistemas' },
    { id: 'alcance', name: 'Alcance, Tiempo y Costo' }
  ]);

  // Abrir modal para crear nuevo tema
  const handleCreateTema = () => {
    setEditingTema(null);
    setFormData({
      nombre: '',
      descripcion: '',
      estado: true,
      area_id: selectedSubject
    });
    setShowModal(true);
  };

  // Abrir modal para editar tema
  const handleEditTema = (tema: Tema) => {
    setEditingTema(tema);
    setFormData({
      nombre: tema.nombre,
      descripcion: tema.descripcion,
      estado: tema.estado,
      area_id: tema.area_id
    });
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTema(null);
    setFormData({
      nombre: '',
      descripcion: '',
      estado: true,
      area_id: selectedSubject
    });
  };

  // Guardar tema (crear o actualizar)
  const handleSaveTema = async () => {
    if (!formData.nombre.trim()) {
      alert('El nombre del tema es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingTema) {
        // Actualizar tema existente
      await api.put(`/temas/${editingTema.id}`, formData, buildAreaScopedConfig());
        setSuccessMessage('Tema actualizado exitosamente');
        
        // Actualizar en el estado local
        setTemas(prev =>
          prev.map(t => t.id === editingTema.id ? { ...t, ...formData } : t)
        );
      } else {
        // Crear nuevo tema
        const response = await api.post('/temas', formData, buildAreaScopedConfig());
        setSuccessMessage('Tema creado exitosamente');
        
        // Agregar al inicio del estado local (porque orden=0)
        setTemas(prev => [response.data, ...prev]);
      }
      
      handleCloseModal();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving tema:', err);
      if (axios.isAxiosError(err) && err.response) {
        alert(`Error: ${err.response.data.message || 'No se pudo guardar el tema'}`);
      } else {
        alert('Error al guardar el tema');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar tema
  const handleDeleteTema = async (tema: Tema) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el tema "${tema.nombre}"?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;
    
    try {
      await api.delete(`/temas/${tema.id}`, buildAreaScopedConfig());
      setSuccessMessage('Tema eliminado exitosamente');
      
      // Eliminar del estado local
      setTemas(prev => prev.filter(t => t.id !== tema.id));
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting tema:', err);
      if (axios.isAxiosError(err) && err.response) {
        alert(`Error: ${err.response.data.message || 'No se pudo eliminar el tema'}`);
      } else {
        alert('Error al eliminar el tema');
      }
    }
  };

  // Funciones para manejar el estado de temas
  const toggleTema = async (tema: Tema) => {
    try {
      const updatedEstado = !tema.estado;
      await api.put(`/temas/${tema.id}/toggle-estado`, undefined, buildAreaScopedConfig());
      setSuccessMessage(`Tema ${updatedEstado ? 'habilitado' : 'inhabilitado'} correctamente`);
      
      // Recargar todos los temas para que coincidan con el orden de la BD
      const response = await api.get('/temas', buildAreaScopedConfig({ Accept: 'application/json' }));
      
      const data = response.data;
      if (Array.isArray(data)) {
        const temasPorArea = data.filter(t => t.area_id === selectedSubject);
        const temasOrdenados = temasPorArea.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setTemas(temasOrdenados);
      }
    } catch (err) {
      console.error('Error toggling tema:', err);
      alert('Error al cambiar el estado del tema');
    }
  };

  const filteredTemas = temas.filter((tema) => {
    const matchesSearch = `${tema.nombre} ${tema.descripcion || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase().trim());

    if (!matchesSearch) {
      return false;
    }

    if (stateFilter === 'active') {
      return tema.estado !== false;
    }

    if (stateFilter === 'inactive') {
      return tema.estado === false;
    }

    return true;
  });

  const toggleExpand = (temaId: string) => {
    const isExpanding = !expandedThemes[temaId];
    setExpandedThemes(prev => ({ ...prev, [temaId]: isExpanding }));
    
    // Cargar subtemas cuando se expande
    if (isExpanding) {
      loadSubtemas(temaId);
    }
  };

  // Guardar el nuevo orden en el backend
  const saveOrden = async (newTemas: Tema[]) => {
    try {
      const orden = newTemas.map(tema => tema.id);
      await api.put('/temas/reordenar', { orden });
    } catch (err) {
      console.error('Error saving orden:', err);
      alert('Error al guardar el orden de los temas');
    }
  };

  // Mover tema hacia arriba en el orden
  const moveTemaUp = async (index: number) => {
    if (index === 0) return;
    
    const newTemas = [...temas];
    [newTemas[index - 1], newTemas[index]] = [newTemas[index], newTemas[index - 1]];
    setTemas(newTemas);
    
    // Guardar en el backend
    await saveOrden(newTemas);
  };

  // Mover tema hacia abajo en el orden
  const moveTemaDown = async (index: number) => {
    if (index === temas.length - 1) return;
    
    const newTemas = [...temas];
    [newTemas[index], newTemas[index + 1]] = [newTemas[index + 1], newTemas[index]];
    setTemas(newTemas);
    
    // Guardar en el backend
    await saveOrden(newTemas);
  };

  // Obtener el tema/color según el índice del área seleccionada
  const getColorByIndex = (index: number): string => {
    const colorKeys = Object.keys(subjectColors);
    return colorKeys[index % colorKeys.length];
  };

  const areaIndex = areas.findIndex(a => a.id === selectedSubject);
  const currentColorKey = areaIndex >= 0 ? getColorByIndex(areaIndex) : Object.keys(subjectColors)[0];
  const currentColor = subjectColors[currentColorKey];
  const currentSubject = areas.find(s => s.id === selectedSubject);
  const hasFixedAreaContext = Boolean(initialAreaIdValue || initialEditTema?.area_id || lockAreaSelection);
  const activeTemasCount = temas.filter((tema) => tema.estado !== false).length;
  const inactiveTemasCount = temas.filter((tema) => tema.estado === false).length;

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando áreas...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si ocurre
  if (error) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Error al cargar las áreas</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!embedded && (
        <header className="app-header">
          <div className="app-main py-4">
            <div className="app-page-header">
              <div className="app-brand-block">
                <button
                  type="button"
                  onClick={onBack}
                  className="app-brand-icon"
                  title="Volver"
                >
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </button>
                <div>
                  <h1 className="text-[#3A4A5B]">Gestión de temas</h1>
                  <p className="text-gray-500 text-sm">{currentSubject ? `Área activa: ${currentSubject.nombre}` : (isDocenteMode ? 'Panel docente - EduPath' : 'Panel de administrador - EduPath')}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="app-main">
        {!embedded && (
          <button 
            onClick={onBack}
            className="app-back-button mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel || 'Volver al Panel'}</span>
          </button>
        )}

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Estructura temática</div>
              <h2 className="app-page-hero__title">Gestión de temas</h2>
              <p className="app-page-hero__description">
                Ordena, edita y revisa los temas del área activa sin salir del flujo actual.
              </p>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--narrow">
            <div className="app-toolbar-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Área y filtros</p>
                  <p className="mt-1 text-sm text-slate-600">{hasFixedAreaContext ? 'El área se mantiene fija por el flujo de navegación actual.' : 'Selecciona el área activa antes de crear, ordenar o editar temas.'}</p>
                </div>
                <button
                  onClick={handleCreateTema}
                  className="app-btn app-primary-btn"
                  disabled={!selectedSubject}
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo tema</span>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="app-form-field">
                  <label className="app-form-label">Área</label>
                  {hasFixedAreaContext ? (
                    <div className="app-form-static">
                      <p className="text-gray-700 font-medium">{currentSubject?.nombre || 'Área no encontrada'}</p>
                      <p className="text-xs text-gray-500 mt-1">{currentSubject?.descripcion || 'Contexto fijado por la pantalla anterior.'}</p>
                    </div>
                  ) : (
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="app-form-input"
                    >
                      <option value="">Seleccionar área</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="app-form-field">
                  <label className="app-form-label">Buscar tema</label>
                  <div className="app-toolbar-card__search app-search-field max-w-none">
                    <Search className="app-search-field__icon" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o descripción"
                      className="app-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="app-filter-row mt-4">
                <button
                  onClick={() => setStateFilter('all')}
                  className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}
                >
                  Todos ({temas.length})
                </button>
                <button
                  onClick={() => setStateFilter('active')}
                  className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}
                >
                  Activos ({activeTemasCount})
                </button>
                <button
                  onClick={() => setStateFilter('inactive')}
                  className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}
                >
                  Inactivos ({inactiveTemasCount})
                </button>
              </div>
            </div>

            <div className="app-sidebar-stack">
              <div className="app-soft-card app-context-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flujo</p>
                <p className="app-context-card__title">Ordena y expande</p>
                <p className="app-context-card__text">Reordena desde las flechas laterales y expande cada tema para revisar sus subtemas.</p>
              </div>
            </div>
          </div>
        </section>

        {successMessage && (
          <div className="app-alert app-alert--success mb-6">
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {temasLoading ? (
          <div className="app-empty-panel py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando temas...</p>
            </div>
          </div>
        ) : temasError ? (
          <div className="app-alert app-alert--warning mb-6">
            <p>{temasError}</p>
          </div>
        ) : !selectedSubject ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">Selecciona un área para continuar.</p>
          </div>
        ) : temas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">No hay temas disponibles para esta área.</p>
            <p className="mt-2 text-sm text-slate-500">Crea un tema para comenzar la estructura del área.</p>
          </div>
        ) : filteredTemas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">No hay temas con los filtros aplicados.</p>
            <p className="mt-2 text-sm text-slate-500">Ajusta la búsqueda o el filtro para volver a listarlos.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemas.map((tema) => {
              const temaIndex = temas.findIndex((item) => item.id === tema.id);

              return (
              <div
                key={tema.id}
                className={`app-list-card ${
                  tema.estado === false ? 'opacity-70 saturate-50' : ''
                }`}
              >
                <div className="app-list-card__head">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveTemaUp(temaIndex)}
                        disabled={stateFilter !== 'all' || temaIndex === 0}
                        className={`p-1 rounded transition-colors ${
                          stateFilter !== 'all' || temaIndex === 0 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveTemaDown(temaIndex)}
                        disabled={stateFilter !== 'all' || temaIndex === temas.length - 1}
                        className={`p-1 rounded transition-colors ${
                          stateFilter !== 'all' || temaIndex === temas.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <button
                        onClick={() => toggleExpand(tema.id)}
                        className="text-gray-400 hover:text-[#3A4A5B] transition-colors flex-shrink-0"
                      >
                        {expandedThemes[tema.id] ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="mb-3 flex items-center gap-2">
                          <span className={`app-badge ${
                            tema.estado !== false
                              ? 'app-badge--green'
                              : 'app-badge--amber'
                          }`}>
                            {tema.estado !== false ? 'Activo' : 'Inhabilitado'}
                          </span>
                        </div>
                        <h4 className="app-list-card__title">{tema.nombre}</h4>
                        <p className="app-list-card__description mt-2">{tema.descripcion || 'Sin descripción registrada.'}</p>
                      </div>
                    </div>
                    
                    <div className="app-action-row">
                      <button
                        onClick={() => handleEditTema(tema)}
                        className="app-btn app-btn-ghost app-btn-sm"
                        title="Editar tema"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => toggleTema(tema)}
                        className="app-btn app-btn-secondary app-btn-sm"
                      >
                        {tema.estado ? (
                          <>
                            <ToggleRight className="w-4 h-4 transition-colors" />
                            <span>Habilitado</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 transition-colors" />
                            <span>Deshabilitado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedThemes[tema.id] && (
                  <div className="border-t border-slate-200 px-6 pb-6 pt-4">
                    {subtemasLoading[tema.id] ? (
                      <div className="flex justify-center items-center py-6">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-gray-600 text-sm">Cargando subtemas...</p>
                        </div>
                      </div>
                    ) : subtemas[tema.id] && subtemas[tema.id].length > 0 ? (
                      <div className="space-y-2">
                        {subtemas[tema.id].map((subtema) => (
                          <div
                            key={subtema.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: currentColor.primary }}
                                ></div>
                                <div>
                                  <span className="text-[#3A4A5B] font-medium">{subtema.nombre}</span>
                                  <p className="text-gray-500 text-xs mt-0.5 quill-render" dangerouslySetInnerHTML={{ __html: subtema.descripcion || '' }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">No hay subtemas disponibles</p>
                    )}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </main>

      {/* Modal para crear/editar tema */}
      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div className="app-modal-card app-modal-card--lg">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Temas</div>
                <h3 className="app-modal-title">{editingTema ? 'Editar tema' : 'Crear nuevo tema'}</h3>
                <p className="app-modal-description">Define la información del tema.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="app-modal-close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout">
                <section className="app-form-section app-form-section--muted">
                  <div className="app-form-field">
                    <label className="app-form-label">
                      Nombre del Tema <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="app-form-input"
                      placeholder="Ej: Variables y Tipos de Datos"
                      required
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="app-form-textarea"
                      placeholder="Descripción breve del tema..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <label className="app-form-label mb-1 block">
                        Estado del Tema
                      </label>
                      <p className="text-xs text-gray-500">
                        Define si el tema estará disponible para los estudiantes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, estado: !formData.estado })}
                      className="flex items-center gap-2 group"
                    >
                      {formData.estado ? (
                        <>
                          <span className="text-sm text-[#7ED6A7] font-medium">Habilitado</span>
                          <ToggleRight
                            className="w-12 h-12 transition-colors"
                            style={{ color: currentColor.primary }}
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-400 font-medium">Deshabilitado</span>
                          <ToggleLeft className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">
                      Área Asociada
                    </label>
                    <div className="app-form-static">
                      <p className="text-gray-700 font-medium">
                        {areas.find(a => a.id === formData.area_id)?.nombre || 'Área no encontrada'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {areas.find(a => a.id === formData.area_id)?.descripcion}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="app-form-footer">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="app-btn app-btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTema}
                disabled={submitting || !formData.nombre.trim()}
                className="app-btn app-primary-btn px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingTema ? 'Actualizar Tema' : 'Crear Tema'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
