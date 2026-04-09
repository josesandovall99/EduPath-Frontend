import { useState, useEffect } from 'react';
import { ArrowLeft, Code, Database, BarChart3, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Plus, Edit2, Search, X } from 'lucide-react';
import axios from 'axios';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface SubThemeManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  initialAreaId?: number;
  initialTemaId?: number;
  onManageSequences?: (areaId: number, areaName: string, temaId: number, temaName: string) => void;
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

// Colores por materia
const subjectColors: Record<string, { primary: string; light: string; icon: any }> = {
  'fundamentos': { primary: '#4A90E2', light: '#E3F2FD', icon: Code },
  'analisis': { primary: '#7ED6A7', light: '#E8F5E9', icon: Database },
  'alcance': { primary: '#F5A97F', light: '#FFF3E0', icon: BarChart3 }
};

export function SubThemeManagementScreen({
  onBack,
  onHome,
  initialAreaId,
  initialTemaId,
  onManageSequences
}: SubThemeManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [loading, setLoading] = useState(true);
  const [temasLoading, setTemasLoading] = useState(false);
  const [subtemasLoading, setSubtemasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temasError, setTemasError] = useState<string | null>(null);
  const [subtemasError, setSubtemasError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedTema, setSelectedTema] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubtema, setEditingSubtema] = useState<Subtema | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tema_id: ''
  });
  const [searchSubtemaTerm, setSearchSubtemaTerm] = useState('');
  const [searchAreaTerm, setSearchAreaTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar áreas del backend
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/areas`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de áreas');
        }
        
        setAreas(data);
        
        // Establecer área inicial (si viene del flujo Área -> Tema) o la primera disponible
        if (data.length > 0) {
          const initialArea = initialAreaId ? data.find((area) => Number(area.id) === Number(initialAreaId)) : null;
          setSelectedArea(initialArea ? initialArea.id : data[0].id);
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

  // Cargar temas cuando cambia el área seleccionada
  useEffect(() => {
    if (!selectedArea) return;

    const fetchTemas = async () => {
      try {
        setTemasLoading(true);
        setTemasError(null);
        setSelectedTema(''); // Resetear tema seleccionado
        setSubtemas([]); // Limpiar subtemas
        
        const response = await axios.get(`${API_BASE_URL}/temas`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de temas');
        }
        
        // Filtrar por área seleccionada
        const temasPorArea = data.filter(tema => tema.area_id === selectedArea);
        
        // Ordenar temas por la columna 'orden'
        const temasOrdenados = temasPorArea.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setTemas(temasOrdenados);
        
        // Seleccionar tema inicial (si aplica) o el primero disponible
        if (temasOrdenados.length > 0) {
          const initialTema = initialTemaId
            ? temasOrdenados.find((tema) => Number(tema.id) === Number(initialTemaId))
            : null;
          setSelectedTema(initialTema ? initialTema.id : temasOrdenados[0].id);
        }
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
  }, [selectedArea]);

  // Cargar subtemas cuando cambia el tema seleccionado
  useEffect(() => {
    if (!selectedTema) return;

    const fetchSubtemas = async () => {
      try {
        setSubtemasLoading(true);
        setSubtemasError(null);
        
        const response = await axios.get(`${API_BASE_URL}/subtemas/por-tema/${selectedTema}`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de subtemas');
        }
        
        setSubtemas(data);
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar los subtemas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor.';
          } else if (err.response?.status === 404) {
            errorMessage = 'No hay subtemas para este tema.';
          } else if (err.response?.status) {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setSubtemasError(errorMessage);
        setSubtemas([]);
        console.error('Error fetching subtemas:', err);
      } finally {
        setSubtemasLoading(false);
      }
    };

    fetchSubtemas();
  }, [selectedTema]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        if (!selectedArea) {
          return;
        }

        const temasResponse = await axios.get(`${API_BASE_URL}/temas`, {
          timeout: 5000,
          headers: { Accept: 'application/json' }
        });

        const temasData = Array.isArray(temasResponse.data)
          ? temasResponse.data.filter((tema) => tema.area_id === selectedArea)
          : [];

        const temasOrdenados = temasData.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setTemas(temasOrdenados);

        const temaActualVigente = temasOrdenados.some((tema) => tema.id === selectedTema);
        const temaObjetivo = temaActualVigente ? selectedTema : (temasOrdenados[0]?.id || '');

        if (!temaActualVigente && temaObjetivo) {
          setSelectedTema(temaObjetivo);
        }

        if (!temaObjetivo) {
          setSubtemas([]);
          return;
        }

        const subtemasResponse = await axios.get(`${API_BASE_URL}/subtemas/por-tema/${temaObjetivo}`, {
          timeout: 5000,
          headers: { Accept: 'application/json' }
        });

        if (Array.isArray(subtemasResponse.data)) {
          setSubtemas(subtemasResponse.data);
        }
      } catch (refreshError) {
        console.warn('Auto-actualización de subtemas omitida temporalmente:', refreshError);
      }
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedArea, selectedTema]);

  // Abrir modal para crear nuevo subtema
  const handleCreateSubtema = () => {
    setEditingSubtema(null);
    setFormData({
      nombre: '',
      descripcion: '',
      tema_id: selectedTema
    });
    setShowModal(true);
  };

  // Abrir modal para editar subtema
  const handleEditSubtema = (subtema: Subtema) => {
    setEditingSubtema(subtema);
    setFormData({
      nombre: subtema.nombre,
      descripcion: subtema.descripcion,
      tema_id: subtema.tema_id
    });
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubtema(null);
    setFormData({
      nombre: '',
      descripcion: '',
      tema_id: selectedTema
    });
  };

  // Guardar subtema (crear o actualizar)
  const handleSaveSubtema = async () => {
    if (!formData.nombre.trim()) {
      alert('El nombre del subtema es obligatorio');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingSubtema) {
        // Actualizar subtema existente
        await axios.put(`${API_BASE_URL}/subtemas/${editingSubtema.id}`, formData);
        setSuccessMessage('Subtema actualizado exitosamente');
        
        // Actualizar en el estado local
        setSubtemas(prev =>
          prev.map(s => s.id === editingSubtema.id ? { ...s, ...formData } : s)
        );
      } else {
        // Crear nuevo subtema
        const response = await axios.post(`${API_BASE_URL}/subtemas`, formData);
        setSuccessMessage('Subtema creado exitosamente');
        
        // Agregar al estado local
        setSubtemas(prev => [...prev, response.data]);
      }
      
      handleCloseModal();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving subtema:', err);
      if (axios.isAxiosError(err) && err.response) {
        alert(`Error: ${err.response.data.message || 'No se pudo guardar el subtema'}`);
      } else {
        alert('Error al guardar el subtema');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar subtema
  const handleDeleteSubtema = async (subtema: Subtema) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el subtema "${subtema.nombre}"?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/subtemas/${subtema.id}`);
      setSuccessMessage('Subtema eliminado exitosamente');
      
      // Eliminar del estado local
      setSubtemas(prev => prev.filter(s => s.id !== subtema.id));
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting subtema:', err);
      if (axios.isAxiosError(err) && err.response) {
        alert(`Error: ${err.response.data.message || 'No se pudo eliminar el subtema'}`);
      } else {
        alert('Error al eliminar el subtema');
      }
    }
  };

  // Obtener el tema/color según el índice del área seleccionada
  const getColorByIndex = (index: number): string => {
    const colorKeys = Object.keys(subjectColors);
    return colorKeys[index % colorKeys.length];
  };

  const areaIndex = areas.findIndex(a => a.id === selectedArea);
  const currentColorKey = areaIndex >= 0 ? getColorByIndex(areaIndex) : Object.keys(subjectColors)[0];
  const currentColor = subjectColors[currentColorKey];
  const currentArea = areas.find(a => a.id === selectedArea);
  const currentTemaObj = temas.find(t => t.id === selectedTema);
  const AreaIcon = currentColor.icon;
  const hasMinimumSubtemasForSequence = subtemas.length >= 2;
  const canManageSequences = Boolean(
    onManageSequences &&
    selectedArea &&
    selectedTema &&
    currentArea &&
    currentTemaObj &&
    hasMinimumSubtemasForSequence
  );

  const filteredSubtemas = subtemas.filter((subtema) =>
    subtema.nombre.toLowerCase().includes(searchSubtemaTerm.toLowerCase().trim())
  );

  const filteredAreas = areas.filter((area) =>
    area.nombre.toLowerCase().includes(searchAreaTerm.toLowerCase().trim())
  );

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
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
      <div className="app-shell flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Error al cargar las áreas</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-[#3A4A5B]">Gestión de Subtemas</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
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

        {/* Area Selector */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-[#3A4A5B] mb-4">Seleccionar Área</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
              Filtrar áreas por nombre
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchAreaTerm}
                onChange={(event) => setSearchAreaTerm(event.target.value)}
                placeholder="Escribe el nombre del área..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              />
            </div>
          </div>

          {areas.length === 0 ? (
            <p className="text-gray-500 text-center">No hay áreas disponibles</p>
          ) : filteredAreas.length === 0 ? (
            <p className="text-gray-500 text-center">No se encontraron áreas con ese nombre</p>
          ) : (
            <div className={`grid gap-4 ${filteredAreas.length >= 3 ? 'grid-cols-3' : `grid-cols-${filteredAreas.length}`}`}>
              {filteredAreas.map((area, index) => {
                const colorKey = getColorByIndex(index);
                const Icon = subjectColors[colorKey].icon;
                const color = subjectColors[colorKey].primary;
                const isSelected = selectedArea === area.id;
                
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-current shadow-lg transform scale-105'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                    style={{
                      borderColor: isSelected ? color : undefined,
                      backgroundColor: isSelected ? `${color}10` : 'white'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color }} />
                      </div>
                      <div className="text-left">
                        <div className="text-[#3A4A5B] text-sm font-semibold">{area.nombre}</div>
                        <div className="text-gray-500 text-xs">{area.descripcion}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tema Selector */}
        {selectedArea && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <h3 className="text-[#3A4A5B] mb-4">Seleccionar Tema</h3>
            {temasLoading ? (
              <div className="flex justify-center py-4">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Cargando temas...</p>
                </div>
              </div>
            ) : temasError ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-600 text-sm">{temasError}</p>
              </div>
            ) : temas.length === 0 ? (
              <p className="text-gray-500 text-center">No hay temas disponibles para esta área</p>
            ) : (
              <div className="grid gap-3 grid-cols-2">
                {temas.map((tema) => {
                  const isSelected = selectedTema === tema.id;
                  
                  return (
                    <button
                      key={tema.id}
                      onClick={() => setSelectedTema(tema.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        isSelected
                          ? 'border-current shadow-lg transform scale-105'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                      style={{
                        borderColor: isSelected ? currentColor.primary : undefined,
                        backgroundColor: isSelected ? `${currentColor.primary}10` : 'white'
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: currentColor.primary }}
                        ></div>
                        <h4 className="text-[#3A4A5B] font-semibold">{tema.nombre}</h4>
                      </div>
                      <p className="text-gray-600 text-xs">{tema.descripcion}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Header de Subtemas */}
        {selectedTema && (
          <>
            <div 
              className="rounded-2xl p-8 mb-6 text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${currentColor.primary} 0%, ${currentColor.primary}dd 100%)` }}
            >
              <div className="flex items-center gap-4 mb-2">
                <AreaIcon className="w-8 h-8" />
                <h2 className="text-2xl">{currentTemaObj?.nombre || 'Subtemas'}</h2>
              </div>
              <p className="text-white/90">
                Administra los subtemas del tema "{currentTemaObj?.nombre}" en {currentArea?.nombre}
              </p>
            </div>

            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-green-700 font-medium">{successMessage}</p>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Botón para agregar nuevo subtema */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreateSubtema}
                className="app-btn app-primary-btn px-6 py-3"
              >
                <Plus className="w-5 h-5" />
                <span>Agregar Nuevo Subtema</span>
              </button>

              <button
                onClick={() => {
                  if (!canManageSequences || !onManageSequences || !currentArea || !currentTemaObj) {
                    return;
                  }
                  onManageSequences(
                    Number(selectedArea),
                    currentArea.nombre,
                    Number(selectedTema),
                    currentTemaObj.nombre
                  );
                }}
                disabled={!canManageSequences}
                className="app-btn app-btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Gestionar Secuencia de Subtemas</span>
              </button>
            </div>

            {!hasMinimumSubtemasForSequence && selectedTema && (
              <p className="mb-6 text-sm text-gray-600">
                Se habilita con mínimo 2 subtemas creados.
              </p>
            )}

            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Filtrar por nombre de subtema
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchSubtemaTerm}
                  onChange={(event) => setSearchSubtemaTerm(event.target.value)}
                  placeholder="Escribe el nombre del subtema..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
              </div>
            </div>

            {/* Lista de Subtemas */}
            {subtemasLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Cargando subtemas...</p>
                </div>
              </div>
            ) : subtemasError ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
                <p className="text-yellow-600 text-sm">{subtemasError}</p>
              </div>
            ) : subtemas.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">No hay subtemas disponibles para este tema</p>
              </div>
            ) : filteredSubtemas.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">No se encontraron subtemas con el nombre ingresado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubtemas.map((subtema) => (
                  <div
                    key={subtema.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: currentColor.primary }}
                          ></div>
                          <div className="flex-1">
                            <h4 className="text-[#3A4A5B] text-lg font-semibold">{subtema.nombre}</h4>
                            <p className="text-gray-600 text-sm mt-1">{subtema.descripcion}</p>
                          </div>
                        </div>
                        
                        {/* Botones de acción */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Editar */}
                          <button
                            onClick={() => handleEditSubtema(subtema)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar subtema"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          
                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteSubtema(subtema)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar subtema"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal para crear/editar subtema */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div 
              className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl"
              style={{ backgroundColor: `${currentColor.primary}10` }}
            >
              <h3 className="text-2xl font-semibold text-[#3A4A5B]">
                {editingSubtema ? 'Editar Subtema' : 'Crear Nuevo Subtema'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Subtema <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  style={{ focusRing: currentColor.primary }}
                  placeholder="Ej: Variables locales y globales"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all resize-none"
                  placeholder="Descripción breve del subtema..."
                  rows={4}
                />
              </div>

              {/* Tema Asociado (solo mostrar, no editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema Asociado
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-700 font-medium">
                    {temas.find(t => t.id === formData.tema_id)?.nombre || 'Tema no encontrado'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {temas.find(t => t.id === formData.tema_id)?.descripcion}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-6 border-t border-gray-200 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="app-btn app-btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSubtema}
                disabled={submitting || !formData.nombre.trim()}
                className="app-btn app-primary-btn px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingSubtema ? 'Actualizar Subtema' : 'Crear Subtema'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
