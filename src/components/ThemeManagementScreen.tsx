import { useState, useEffect } from 'react';
import { ArrowLeft, Code, Database, BarChart3, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Plus, Edit2, ChevronUp, X } from 'lucide-react';
import axios from 'axios';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ThemeManagementScreenProps {
  onBack: () => void;
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

export function ThemeManagementScreen({ onBack }: ThemeManagementScreenProps) {
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
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    estado: true,
    area_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar áreas del backend
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('http://localhost:4000/areas', {
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
        
        // Establecer la primera área como seleccionada por defecto
        if (data.length > 0) {
          setSelectedSubject(data[0].id);
        }
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar las áreas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor en http://localhost:4000. ¿Está corriendo?';
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
    if (!selectedSubject) return;

    const fetchTemas = async () => {
      try {
        setTemasLoading(true);
        setTemasError(null);
        
        // Admin necesita ver TODOS los temas (habilitados y deshabilitados)
        // Por eso usamos /temas en lugar de /temas/por-area que filtra por estado
        const response = await axios.get('http://localhost:4000/temas', {
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
        const temasPorArea = data.filter(tema => tema.area_id === selectedSubject);
        
        // Ordenar temas por la columna 'orden'
        const temasOrdenados = temasPorArea.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        setTemas(temasOrdenados);
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar los temas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor en http://localhost:4000.';
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
      
      const response = await axios.get(`http://localhost:4000/subtemas/por-tema/${temaId}`, {
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
        await axios.put(`http://localhost:4000/temas/${editingTema.id}`, formData);
        setSuccessMessage('Tema actualizado exitosamente');
        
        // Actualizar en el estado local
        setTemas(prev =>
          prev.map(t => t.id === editingTema.id ? { ...t, ...formData } : t)
        );
      } else {
        // Crear nuevo tema
        const response = await axios.post('http://localhost:4000/temas', formData);
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
      await axios.delete(`http://localhost:4000/temas/${tema.id}`);
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
      await axios.put(`http://localhost:4000/temas/${tema.id}`, {
        ...tema,
        estado: updatedEstado
      });
      
      // Recargar todos los temas para que coincidan con el orden de la BD
      const response = await axios.get('http://localhost:4000/temas', {
        headers: {
          'Accept': 'application/json',
        }
      });
      
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
      await axios.put('http://localhost:4000/temas/reordenar', { orden });
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
  const SubjectIcon = currentColor.icon;

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
                <h1 className="text-[#3A4A5B]">Gestión de Temas</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
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
          <span>Volver al Panel</span>
        </button>

        {/* Subject Selector */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-[#3A4A5B] mb-4">Seleccionar Materia</h3>
          {areas.length === 0 ? (
            <p className="text-gray-500 text-center">No hay áreas disponibles</p>
          ) : (
            <div className={`grid gap-4 ${areas.length >= 3 ? 'grid-cols-3' : `grid-cols-${areas.length}`}`}>
              {areas.map((area, index) => {
                const colorKey = getColorByIndex(index);
                const Icon = subjectColors[colorKey].icon;
                const color = subjectColors[colorKey].primary;
                const isSelected = selectedSubject === area.id;
                
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedSubject(area.id)}
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

        {/* Theme List */}
        <div 
          className="rounded-2xl p-8 mb-6 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${currentColor.primary} 0%, ${currentColor.primary}dd 100%)` }}
        >
          <div className="flex items-center gap-4 mb-2">
            <SubjectIcon className="w-8 h-8" />
            <h2 className="text-2xl">{currentSubject?.nombre || 'Selecciona una materia'}</h2>
          </div>
          <p className="text-white/90">
            {currentSubject?.descripcion || 'Administra qué temas y subtemas están disponibles para los estudiantes'}
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

        {/* Botón para agregar nuevo tema */}
        {selectedSubject && (
          <div className="mb-6">
            <button
              onClick={handleCreateTema}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              style={{ backgroundColor: currentColor.primary }}
            >
              <Plus className="w-5 h-5" />
              <span>Agregar Nuevo Tema</span>
            </button>
          </div>
        )}

        {/* Sección de Temas */}
        {temasLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Cargando temas...</p>
            </div>
          </div>
        ) : temasError ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
            <p className="text-yellow-600 text-sm">{temasError}</p>
          </div>
        ) : temas.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No hay temas disponibles para esta área</p>
          </div>
        ) : (
          <div className="space-y-4">
            {temas.map((tema, index) => (
              <div
                key={tema.id}
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* Tema Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    {/* Controles de ordenamiento */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveTemaUp(index)}
                        disabled={index === 0}
                        className={`p-1 rounded transition-colors ${
                          index === 0 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveTemaDown(index)}
                        disabled={index === temas.length - 1}
                        className={`p-1 rounded transition-colors ${
                          index === temas.length - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Contenido del tema */}
                    <div className="flex items-center gap-4 flex-1">
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
                      <div className="flex-1">
                        <h4 className="text-[#3A4A5B] text-lg font-semibold">{tema.nombre}</h4>
                        <p className="text-gray-600 text-sm mt-1">{tema.descripcion}</p>
                      </div>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Editar */}
                      <button
                        onClick={() => handleEditTema(tema)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar tema"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      
                      {/* Toggle Estado */}
                      <button
                        onClick={() => toggleTema(tema)}
                        className="flex items-center gap-2 group ml-2"
                      >
                        {tema.estado ? (
                          <>
                            <span className="text-sm text-[#7ED6A7]">Habilitado</span>
                            <ToggleRight 
                              className="w-12 h-12 transition-colors" 
                              style={{ color: currentColor.primary }}
                            />
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-400">Deshabilitado</span>
                            <ToggleLeft className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtemas */}
                {expandedThemes[tema.id] && (
                  <div 
                    className="border-t px-6 pb-6 pt-4"
                    style={{ borderColor: `${currentColor.primary}20` }}
                  >
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
                            className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: currentColor.primary }}
                                ></div>
                                <div>
                                  <span className="text-[#3A4A5B] font-medium">{subtema.nombre}</span>
                                  <p className="text-gray-500 text-xs mt-0.5">{subtema.descripcion}</p>
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
            ))}
          </div>
        )}


      </main>

      {/* Modal para crear/editar tema */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div 
              className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl"
              style={{ backgroundColor: `${currentColor.primary}10` }}
            >
              <h3 className="text-2xl font-semibold text-[#3A4A5B]">
                {editingTema ? 'Editar Tema' : 'Crear Nuevo Tema'}
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
                  Nombre del Tema <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  style={{ focusRing: currentColor.primary }}
                  placeholder="Ej: Variables y Tipos de Datos"
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
                  placeholder="Descripción breve del tema..."
                  rows={4}
                />
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado del Tema
                  </label>
                  <p className="text-xs text-gray-500">
                    Define si el tema estará disponible para los estudiantes
                  </p>
                </div>
                <button
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

              {/* Área (solo mostrar, no editable si está editando) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Área Asociada
                </label>
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-700 font-medium">
                    {areas.find(a => a.id === formData.area_id)?.nombre || 'Área no encontrada'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {areas.find(a => a.id === formData.area_id)?.descripcion}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-6 border-t border-gray-200 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTema}
                disabled={submitting || !formData.nombre.trim()}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: currentColor.primary }}
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
