import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Code, Database, BarChart3, Eye, EyeOff, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Plus, Edit2, Search, X } from 'lucide-react';
import axios from 'axios';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import { createQuillModules, loadQuill } from '../utils/quill';

interface SubThemeManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  initialAsignaturaId?: number;
  initialTemaId?: number;
  onManageSequences?: (asignaturaId: number, asignaturaName: string, temaId: number, temaName: string) => void;
  mode?: 'admin' | 'docente';
}

interface Asignatura {
  id: string;
  nombre: string;
  descripcion: string;
}

interface Tema {
  id: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
  asignatura_id: string;
}

interface Subtema {
  id: string;
  nombre: string;
  descripcion: string;
  tema_id: string;
  estado?: boolean;
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
  initialAsignaturaId,
  initialTemaId,
  onManageSequences,
  mode = 'admin'
}: SubThemeManagementScreenProps) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [loading, setLoading] = useState(true);
  const [temasLoading, setTemasLoading] = useState(false);
  const [subtemasLoading, setSubtemasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [temasError, setTemasError] = useState<string | null>(null);
  const [subtemasError, setSubtemasError] = useState<string | null>(null);
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  const [selectedTema, setSelectedTema] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubtema, setEditingSubtema] = useState<Subtema | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tema_id: ''
  });
  const [searchSubtemaTerm, setSearchSubtemaTerm] = useState('');
  const [searchAsignaturaTerm, setSearchAsignaturaTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isDocenteMode = mode === 'docente';
  const isSubtemaActive = (subtema: Subtema) => subtema.estado !== false;
  const buildRequestConfig = (headers: Record<string, string> = {}, timeout?: number) => {
    const asignaturaId = initialAsignaturaId || selectedAsignatura;
    return {
      ...(timeout ? { timeout } : {}),
      headers: buildAuthHeaders({
        ...headers,
        ...(isDocenteMode && asignaturaId ? { 'x-asignatura-id': String(asignaturaId) } : {})
      })
    };
  };

  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  // Initialize Quill when modal opens
  useEffect(() => {
    let cancelled = false;

    const destroyEditor = () => {
      if (editorRef.current) editorRef.current.innerHTML = '';
      quillRef.current = null;
    };

    if (!showModal) {
      destroyEditor();
      return undefined;
    }

    const initialHtml = editingSubtema ? (editingSubtema.descripcion || '') : '';

    const initializeQuill = async () => {
      if (!editorRef.current) return;
      const Quill = await loadQuill();
      if (cancelled || !editorRef.current) return;
      if (quillRef.current) {
        quillRef.current.root.innerHTML = initialHtml;
        return;
      }
      editorRef.current.innerHTML = '';
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Descripción del subtema',
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
  }, [showModal, editingSubtema]);

  // Cargar asignaturas del backend
  useEffect(() => {
    const fetchasignaturas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/asignaturas`, buildRequestConfig({ Accept: 'application/json' }, 5000));
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de asignaturas');
        }
        
        setAsignaturas(data);
        
        // Establecer asignatura inicial (si viene del flujo Asignatura -> Tema) o la primera disponible
        if (data.length > 0) {
          const initialAsignatura = initialAsignaturaId ? data.find((Asignatura) => Number(Asignatura.id) === Number(initialAsignaturaId)) : null;
          setSelectedAsignatura(initialAsignatura ? initialAsignatura.id : data[0].id);
        }
      } catch (err) {
        let errorMessage = 'Error desconocido al cargar las asignaturas';
        
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNREFUSED') {
            errorMessage = 'No se pudo conectar al servidor. ¿Está corriendo?';
          } else if (err.response?.status === 404) {
            errorMessage = 'El endpoint /asignaturas no existe en el servidor.';
          } else if (err.response?.status) {
            errorMessage = `Error ${err.response.status}: ${err.response.statusText}`;
          } else if (err.message) {
            errorMessage = err.message;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('Error fetching asignaturas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchasignaturas();
  }, []);

  // Cargar temas cuando cambia el asignatura seleccionada
  useEffect(() => {
    if (!selectedAsignatura) return;

    const fetchTemas = async () => {
      try {
        setTemasLoading(true);
        setTemasError(null);
        setSelectedTema(''); // Resetear tema seleccionado
        setSubtemas([]); // Limpiar subtemas
        
        const response = await axios.get(`${API_BASE_URL}/temas`, buildRequestConfig({ Accept: 'application/json' }, 5000));
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de temas');
        }
        
        // Filtrar por asignatura seleccionada
        const temasPorAsignatura = data.filter(tema => tema.asignatura_id === selectedAsignatura);
        
        // Ordenar temas por la columna 'orden'
        const temasOrdenados = temasPorAsignatura.sort((a, b) => (a.orden || 0) - (b.orden || 0));
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
            errorMessage = 'No hay temas para esta asignatura.';
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
  }, [selectedAsignatura]);

  // Cargar subtemas cuando cambia el tema seleccionado
  useEffect(() => {
    if (!selectedTema) return;

    const fetchSubtemas = async () => {
      try {
        setSubtemasLoading(true);
        setSubtemasError(null);
        
        const response = await axios.get(`${API_BASE_URL}/subtemas`, buildRequestConfig({ Accept: 'application/json' }, 5000));
        
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('La respuesta no es un array de subtemas');
        }
        
        const subtemasPorTema = data.filter((subtema) => subtema.tema_id === selectedTema);
        setSubtemas(subtemasPorTema);
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
        if (!selectedAsignatura) {
          return;
        }

        const temasResponse = await axios.get(`${API_BASE_URL}/temas`, buildRequestConfig({ Accept: 'application/json' }, 5000));

        const temasData = Array.isArray(temasResponse.data)
          ? temasResponse.data.filter((tema) => tema.asignatura_id === selectedAsignatura)
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

        const subtemasResponse = await axios.get(`${API_BASE_URL}/subtemas`, buildRequestConfig({ Accept: 'application/json' }, 5000));

        if (Array.isArray(subtemasResponse.data)) {
          setSubtemas(subtemasResponse.data.filter((subtema) => subtema.tema_id === temaObjetivo));
        }
      } catch (refreshError) {
        console.warn('Auto-actualización de subtemas omitida temporalmente:', refreshError);
      }
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedAsignatura, selectedTema]);

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
      setError('El nombre del subtema es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingSubtema) {
        // Actualizar subtema existente
        await axios.put(`${API_BASE_URL}/subtemas/${editingSubtema.id}`, formData, buildRequestConfig());
        setSuccessMessage('Subtema actualizado correctamente.');
        
        // Actualizar en el estado local
        setSubtemas(prev =>
          prev.map(s => s.id === editingSubtema.id ? { ...s, ...formData } : s)
        );
      } else {
        // Crear nuevo subtema
        const response = await axios.post(`${API_BASE_URL}/subtemas`, formData, buildRequestConfig());
        setSuccessMessage('Subtema registrado correctamente.');
        
        // Agregar al estado local
        setSubtemas(prev => [...prev, response.data]);
      }
      
      handleCloseModal();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving subtema:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'No se pudo guardar el subtema.');
      } else {
        setError('No se pudo guardar el subtema.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSubtema = async (subtema: Subtema) => {
    const currentlyActive = isSubtemaActive(subtema);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas ${actionLabel} el subtema "${subtema.nombre}"?`
    );
    
    if (!confirmDelete) return;
    
    try {
      const response = await axios.put(`${API_BASE_URL}/subtemas/${subtema.id}/toggle-estado`, undefined, buildRequestConfig());
      const updatedEstado = response.data?.estado ?? !currentlyActive;
      setSuccessMessage(`Subtema ${updatedEstado ? 'habilitado' : 'inhabilitado'} correctamente.`);
      
      setSubtemas(prev => prev.map((item) => (
        item.id === subtema.id ? { ...item, estado: updatedEstado } : item
      )));
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling subtema:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'No se pudo cambiar el estado del subtema.');
      } else {
        setError('No se pudo cambiar el estado del subtema.');
      }
    }
  };

  // Obtener el tema/color según el índice del asignatura seleccionada
  const getColorByIndex = (index: number): string => {
    const colorKeys = Object.keys(subjectColors);
    return colorKeys[index % colorKeys.length];
  };

  const AsignaturaIndex = asignaturas.findIndex(a => a.id === selectedAsignatura);
  const currentColorKey = AsignaturaIndex >= 0 ? getColorByIndex(AsignaturaIndex) : Object.keys(subjectColors)[0];
  const currentColor = subjectColors[currentColorKey];
  const currentAsignatura = asignaturas.find(a => a.id === selectedAsignatura);
  const currentTemaObj = temas.find(t => t.id === selectedTema);
  const hasLockedAsignaturaContext = Boolean(initialAsignaturaId);
  const AsignaturaIcon = currentColor.icon;
  const hasMinimumSubtemasForSequence = subtemas.length >= 2;
  const canManageSequences = Boolean(
    onManageSequences &&
    selectedAsignatura &&
    selectedTema &&
    currentAsignatura &&
    currentTemaObj &&
    currentTemaObj.estado !== false &&
    hasMinimumSubtemasForSequence
  );

  const filteredSubtemas = subtemas.filter((subtema) =>
    subtema.nombre.toLowerCase().includes(searchSubtemaTerm.toLowerCase().trim()) &&
    (
      stateFilter === 'all' ||
      (stateFilter === 'active' ? isSubtemaActive(subtema) : !isSubtemaActive(subtema))
    )
  );

  const filteredAsignaturas = asignaturas.filter((Asignatura) =>
    Asignatura.nombre.toLowerCase().includes(searchAsignaturaTerm.toLowerCase().trim())
  );
  const activeSubtemas = subtemas.filter((subtema) => isSubtemaActive(subtema)).length;
  const inactiveSubtemas = subtemas.length - activeSubtemas;

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asignaturas...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si ocurre
  if (error) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Error al cargar las asignaturas</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-[#3A4A5B]">Gestión de Subtemas</h1>
                <p className="text-gray-500 text-sm">{hasLockedAsignaturaContext ? 'Temas y subtemas dentro del asignatura seleccionada.' : 'Asignaturas, temas y subtemas en una misma vista operativa.'}</p>
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
          <span>{isDocenteMode ? 'Volver a Temas' : 'Volver al Panel'}</span>
        </button>

        <AdminFlowGuide
          title="Gestión de subtemas"
          description={hasLockedAsignaturaContext ? 'Administración de tema y subtemas dentro del asignatura seleccionada.' : 'Administración de asignatura, tema y subtemas asociados.'}
          breadcrumbs={[
            { label: isDocenteMode ? 'Panel docente' : 'Panel admin' },
            { label: currentAsignatura?.nombre || 'Asignaturas' },
            { label: currentTemaObj?.nombre || 'Temas' },
            { label: 'Subtemas', current: true }
          ]}
          steps={[
            { label: 'Asignaturas', helper: 'Asignatura registrada en el contexto actual.', status: selectedAsignatura ? 'complete' : 'current' },
            { label: 'Temas', helper: 'Tema base de la operación actual.', status: selectedTema ? 'complete' : selectedAsignatura ? 'current' : 'upcoming' },
            { label: 'Subtemas', helper: 'Administración del detalle temático.', status: selectedAsignatura && selectedTema ? 'current' : 'upcoming' },
            { label: 'Secuencias', helper: 'Secuencia disponible cuando el tema esté habilitado.', status: canManageSequences ? 'upcoming' : 'upcoming' }
          ]}
          asideTitle="Siguiente paso"
          asideDescription="La gestión de secuencias se habilita cuando el tema dispone de al menos dos subtemas activos."
        />

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Estructura académica</div>
              <h2 className="app-page-hero__title">Gestión de subtemas</h2>
              <p className="app-page-hero__description">
                {hasLockedAsignaturaContext
                  ? 'Consulta, filtra y organiza subtemas dentro del asignatura y tema seleccionados.'
                  : 'Consulta, filtra y organiza subtemas dentro del tema seleccionado.'}
              </p>
            </div>
          </div>
        </section>

        <div className={hasLockedAsignaturaContext ? 'mb-6' : 'grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]'}>
          {!hasLockedAsignaturaContext && (
          <section className="app-toolbar-card">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selección de asignatura</p>
              <p className="mt-1 text-sm text-slate-600">Filtra el catálogo y define el contexto de trabajo antes de pasar a temas y subtemas.</p>
            </div>
            <div className="app-search-field mb-4">
              <Search className="app-search-field__icon" />
              <input
                type="text"
                value={searchAsignaturaTerm}
                onChange={(event) => setSearchAsignaturaTerm(event.target.value)}
                placeholder="Buscar asignatura"
                className="app-form-input"
              />
            </div>

            {asignaturas.length === 0 ? (
              <div className="app-empty-panel">No hay asignaturas disponibles.</div>
            ) : filteredAsignaturas.length === 0 ? (
              <div className="app-empty-panel">No hay coincidencias para el filtro aplicado.</div>
            ) : (
              <div className="app-card-grid">
              {filteredAsignaturas.map((Asignatura, index) => {
                const colorKey = getColorByIndex(index);
                const Icon = subjectColors[colorKey].icon;
                const color = subjectColors[colorKey].primary;
                const isSelected = selectedAsignatura === Asignatura.id;
                
                return (
                  <button
                    key={Asignatura.id}
                    onClick={() => setSelectedAsignatura(Asignatura.id)}
                    className={`app-list-card border-2 text-left ${
                      isSelected
                        ? 'shadow-lg translate-y-[-1px]'
                        : ''
                    }`}
                    style={{
                      borderColor: isSelected ? color : undefined,
                      backgroundColor: isSelected ? `${color}10` : 'white',
                      boxShadow: isSelected ? `0 16px 28px ${color}22` : undefined
                    }}
                  >
                    <div className="app-list-card__head">
                      <div 
                        className="app-list-card__icon"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color }} />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="app-list-card__title">{Asignatura.nombre}</div>
                        <div className="app-list-card__description mt-1">{Asignatura.descripcion || 'Sin descripción registrada.'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            )}
          </section>
          )}

          {selectedAsignatura && (
            <section className="app-toolbar-card">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selección de tema</p>
                <p className="mt-1 text-sm text-slate-600">
                  {hasLockedAsignaturaContext && currentAsignatura
                    ? `Define el tema de trabajo dentro de ${currentAsignatura.nombre}.`
                    : 'Define el tema de trabajo dentro del asignatura seleccionada.'}
                </p>
              </div>
            {temasLoading ? (
              <div className="app-empty-panel py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Cargando temas...</p>
                </div>
              </div>
            ) : temasError ? (
              <div className="app-alert app-alert--warning">
                <p>{temasError}</p>
              </div>
            ) : temas.length === 0 ? (
              <div className="app-empty-panel py-8">No hay temas disponibles para esta asignatura.</div>
            ) : (
              <div className="space-y-3">
                {temas.map((tema) => {
                  const isSelected = selectedTema === tema.id;
                  
                  return (
                    <button
                      key={tema.id}
                      onClick={() => setSelectedTema(tema.id)}
                      className={`app-list-card border-2 text-left ${
                        isSelected
                          ? 'shadow-lg translate-y-[-1px]'
                          : ''
                      }`}
                      style={{
                        borderColor: isSelected ? currentColor.primary : undefined,
                        backgroundColor: isSelected ? `${currentColor.primary}10` : 'white',
                        opacity: tema.estado === false ? 0.65 : 1
                      }}
                    >
                      <div className="app-list-card__head">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`app-badge ${tema.estado !== false ? 'app-badge--green' : 'bg-amber-100 text-amber-700'}`}>
                              {tema.estado !== false ? 'Activo' : 'Inhabilitado'}
                            </span>
                          </div>
                          <h4 className="app-list-card__title">{tema.nombre}</h4>
                          <p className="app-list-card__description mt-2">{tema.descripcion || 'Sin descripción registrada.'}</p>
                        </div>
                        <AsignaturaIcon className="w-5 h-5" style={{ color: currentColor.primary }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            </section>
          )}
        </div>

        {/* Header de Subtemas */}
        {selectedTema && (
          <>
            <section className="app-page-hero mb-6">
              <div className="app-page-hero__content">
                <div className="app-page-hero__copy">
                  <div className="app-page-hero__eyebrow">Subtemas</div>
                  <h2 className="app-page-hero__title">Gestión de subtemas</h2>
                  <p className="app-page-hero__description">Gestiona los subtemas del tema seleccionado.</p>
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

            {error && (
              <div className="app-alert app-alert--error mb-6">
                <p>{error}</p>
              </div>
            )}

            {!hasMinimumSubtemasForSequence && selectedTema && (
              <div className="app-flow-helper mb-6">
                La secuencia de subtemas se habilita cuando el tema tiene al menos dos subtemas activos.
              </div>
            )}

            {currentTemaObj?.estado === false && (
              <div className="app-alert app-alert--warning mb-6">
                <p>El tema está inhabilitado. Los subtemas permanecen disponibles para consulta, pero la gestión de secuencias queda en espera hasta su reactivación.</p>
              </div>
            )}

            <div className="mb-6">
              <div className="app-toolbar-card">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda y estado</p>
                    <p className="mt-1 text-sm text-slate-600">Filtra el listado por nombre y por estado operativo.</p>
                  </div>
                  <div className="app-action-row justify-start">
                    <button onClick={handleCreateSubtema} className="app-btn app-primary-btn">
                      <Plus className="w-5 h-5" />
                      <span>Nuevo subtema</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!canManageSequences || !onManageSequences || !currentAsignatura || !currentTemaObj) {
                          return;
                        }
                        onManageSequences(
                          Number(selectedAsignatura),
                          currentAsignatura.nombre,
                          Number(selectedTema),
                          currentTemaObj.nombre
                        );
                      }}
                      disabled={!canManageSequences}
                      className="app-btn app-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Secuencia de subtemas</span>
                    </button>
                  </div>
                </div>
                <div className="app-toolbar-card__search app-search-field mb-4">
                  <Search className="app-search-field__icon" />
                  <input
                    type="text"
                    value={searchSubtemaTerm}
                    onChange={(event) => setSearchSubtemaTerm(event.target.value)}
                    placeholder="Buscar subtema"
                    className="app-form-input"
                  />
                </div>

                <div className="app-filter-row">
                  <button onClick={() => setStateFilter('all')} className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>
                    <span>Todos ({subtemas.length})</span>
                  </button>
                  <button onClick={() => setStateFilter('active')} className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}>
                    <Eye className="h-4 w-4 shrink-0" />
                    <span>Activos ({activeSubtemas})</span>
                  </button>
                  <button onClick={() => setStateFilter('inactive')} className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}>
                    <EyeOff className="h-4 w-4 shrink-0" />
                    <span>Inactivos ({inactiveSubtemas})</span>
                  </button>
                </div>
              </div>
            </div>

            {subtemasLoading ? (
              <div className="app-empty-panel py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 text-sm">Cargando subtemas...</p>
                </div>
              </div>
            ) : subtemasError ? (
              <div className="app-alert app-alert--warning mb-6">
                <p>{subtemasError}</p>
              </div>
            ) : subtemas.length === 0 ? (
              <div className="app-empty-panel py-12">
                <p className="text-base text-slate-600">No hay subtemas registrados para este tema.</p>
                <p className="mt-2 text-sm text-slate-500">Registra el primer subtema para continuar con la estructura.</p>
              </div>
            ) : filteredSubtemas.length === 0 ? (
              <div className="app-empty-panel py-12">
                <p className="text-base text-slate-600">No hay resultados para el filtro actual.</p>
                <p className="mt-2 text-sm text-slate-500">Ajusta la búsqueda o cambia el estado visible del listado.</p>
              </div>
            ) : (
              <div className="app-card-grid app-subtema-catalog-grid">
                {filteredSubtemas.map((subtema) => (
                  <div
                    key={subtema.id}
                    onClick={() => {
                      if (!canManageSequences || !onManageSequences || !currentAsignatura || !currentTemaObj) return;
                      onManageSequences(Number(selectedAsignatura), currentAsignatura.nombre, Number(selectedTema), currentTemaObj.nombre);
                    }}
                    className={`app-list-card app-list-card--compact app-subtema-catalog-card ${isSubtemaActive(subtema) ? '' : 'opacity-75'} ${canManageSequences ? 'cursor-pointer hover:ring-2 hover:ring-[#4A90E2] hover:ring-offset-1 transition-shadow' : ''}`}
                  >
                    <div className="app-subtema-catalog-card__top">
                      <span className={`app-badge ${isSubtemaActive(subtema) ? 'app-badge--green' : 'bg-amber-100 text-amber-700'}`}>
                        {isSubtemaActive(subtema) ? 'Activo' : 'Inhabilitado'}
                      </span>
                      <div className="app-action-row app-subtema-catalog-card__actions">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditSubtema(subtema); }}
                          className="app-btn app-btn-ghost app-btn-icon app-btn-sm"
                          title="Editar subtema"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleSubtema(subtema); }}
                          className={`app-btn app-btn-sm ${isSubtemaActive(subtema) ? 'app-btn-secondary' : 'app-btn-success'}`}
                          title={isSubtemaActive(subtema) ? 'Inhabilitar subtema' : 'Habilitar subtema'}
                        >
                          {isSubtemaActive(subtema) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          <span>{isSubtemaActive(subtema) ? 'Inhabilitar' : 'Habilitar'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h4 className="app-list-card__title app-subtema-catalog-card__title">{subtema.nombre}</h4>
                      <p className="app-list-card__description app-subtema-catalog-card__description quill-render" dangerouslySetInnerHTML={{ __html: subtema.descripcion || 'Sin descripción registrada.' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div className="app-modal-card app-modal-card--lg">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Subtemas</div>
                <h2 className="app-modal-title">{editingSubtema ? 'Editar subtema' : 'Nuevo subtema'}</h2>
                <p className="app-modal-description">Registra la información principal del subtema dentro del tema seleccionado.</p>
              </div>
              <button onClick={handleCloseModal} className="app-modal-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout">
                <div className="app-form-note mb-6">
                  <p className="text-sm text-blue-800">Se requiere nombre, descripción y validación del tema asociado antes de guardar.</p>
                </div>

                <section className="space-y-5">
                  <div className="app-form-field">
                    <label className="app-form-label">Nombre del subtema</label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                      className="app-form-input"
                      placeholder="Nombre del subtema"
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Descripción</label>
                    <div className="quill-editor-container app-rich-text-editor">
                      <div
                        ref={editorRef}
                        className="w-full"
                        data-placeholder="Descripción del subtema"
                      />
                    </div>
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Tema asociado</label>
                    <div className="app-form-static">
                      <p className="text-gray-700 font-medium">
                        {temas.find(t => t.id === formData.tema_id)?.nombre || 'Tema no encontrado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {temas.find(t => t.id === formData.tema_id)?.descripcion || 'Sin descripción registrada.'}
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
                className="app-btn app-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSubtema}
                disabled={submitting || !formData.nombre.trim()}
                className="app-btn app-primary-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingSubtema ? 'Actualizar subtema' : 'Guardar subtema'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
