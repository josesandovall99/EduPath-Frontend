import { useState, useEffect } from 'react';
import { ArrowLeft, Code, Database, BarChart3, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
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
        
        const response = await axios.get(`http://localhost:4000/temas/por-area/${selectedSubject}`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de temas');
        }
        
        setTemas(data);
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

  // Funciones para manejar el estado de temas
  const toggleTema = (temaId: string) => {
    setTemas(prev =>
      prev.map(t =>
        t.id === temaId ? { ...t, estado: !t.estado } : t
      )
    );
  };

  const toggleExpand = (temaId: string) => {
    const isExpanding = !expandedThemes[temaId];
    setExpandedThemes(prev => ({ ...prev, [temaId]: isExpanding }));
    
    // Cargar subtemas cuando se expande
    if (isExpanding) {
      loadSubtemas(temaId);
    }
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
            {temas.map((tema) => (
              <div
                key={tema.id}
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* Tema Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
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
                    
                    <button
                      onClick={() => toggleTema(tema.id)}
                      className="flex items-center gap-2 group ml-6 flex-shrink-0"
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


        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all"
            style={{ backgroundColor: currentColor.primary }}
          >
            Guardar Cambios
          </button>
        </div>
      </main>
    </div>
  );
}
