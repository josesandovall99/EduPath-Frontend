import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Code, Database, BarChart3, Eye, EyeOff, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Plus, Edit2, Search, X } from 'lucide-react';
import axios from 'axios';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import { createQuillModules, loadQuill } from '../utils/quill';

interface SubThemeManagementScreenProps {
  /** Navega directamente al nivel indicado desde el breadcrumb (0=panel, 1=asignatura, 2=tema). */
  onNavigateToBreadcrumb?: (index: number) => void;
  onBack: () => void;
  onHome?: () => void;
  initialAsignaturaId?: number;
  initialTemaId?: number;
  onManageSequences?: (asignaturaId: number, asignaturaName: string, temaId: number, temaName: string) => void;
  onSelectSubtema?: (subtemaId: number, temaId: number, subtemaNombre: string) => void;
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
  onSelectSubtema,
  onNavigateToBreadcrumb,
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
    }, 120000); // 2 minutos

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
    setSubmitting(true);
    try {
      const payload = { nombre: formData.nombre.trim(), descripcion: formData.descripcion, tema_id: formData.tema_id };
      let res: Response;
      if (editingSubtema) {
        res = await fetch(`${API_BASE_URL}/subtemas/${editingSubtema.id}`, {
          method: 'PUT',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/subtemas`, {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.mensaje || d?.message || `Error ${res.status}`);
      }
      const data = await res.json();
      if (editingSubtema) {
        setSubtemas(prev => prev.map(s => s.id === editingSubtema.id ? { ...s, ...payload } : s));
      } else {
        setSubtemas(prev => [...prev, data]);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Error saving subtema:', err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar el subtema.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSubtema = async (subtema: Subtema) => {
    const currentlyActive = isSubtemaActive(subtema);
    const ok = window.confirm(
      `¿Deseas ${currentlyActive ? 'inhabilitar' : 'habilitar'} el subtema "${subtema.nombre}"?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/subtemas/${subtema.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || errData?.mensaje || `Error ${res.status}`);
      }

      const data = await res.json();
      const updatedEstado = data?.estado ?? !currentlyActive;

      setSubtemas(prev => prev.map(s =>
        s.id === subtema.id ? { ...s, estado: updatedEstado } : s
      ));
    } catch (err) {
      console.error('Error toggling subtema:', err);
      window.alert(`No se pudo cambiar el estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
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
  /** Cuando se entra desde la pantalla de temas con un tema ya elegido, se oculta
   * el selector de temas y se trabaja directamente con ese tema. */
  const hasLockedTemaContext = Boolean(initialTemaId);
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
      {/* Header */}
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} className="app-brand-icon" title="Panel principal">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>
                  Subtemas del tema
                </p>
                <h1 className="leading-tight">{currentTemaObj?.nombre || 'Gestión de Subtemas'}</h1>
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
        <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(0) : onHome}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {isDocenteMode ? 'Panel docente' : 'Panel admin'}
          </button>
          {currentAsignatura && (<><span style={{ color: '#bfd3f5' }}>→</span>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(1) : onBack}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {currentAsignatura.nombre}
          </button></>)}
          {currentTemaObj && (<><span style={{ color: '#bfd3f5' }}>→</span>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(2) : onBack}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {currentTemaObj.nombre}
          </button></>)}
          <span style={{ color: '#bfd3f5' }}>→</span>
          <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
            Subtemas
          </span>
        </nav>

        {selectedTema && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Filtros */}
              <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: '#e8eef8', height: '40px' }}>
                {[
                  { key: 'all',      label: `Todos (${subtemas.length})` },
                  { key: 'active',   label: `Activos (${activeSubtemas})` },
                  { key: 'inactive', label: `Inactivos (${inactiveSubtemas})` },
                ].map(f => (
                  <button key={f.key} type="button"
                    onClick={() => setStateFilter(f.key as 'all' | 'active' | 'inactive')}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: stateFilter === f.key ? '#1a56db' : 'transparent', color: stateFilter === f.key ? '#fff' : '#4a6fa5' }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3"
                style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: '40px' }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
                <input type="text" value={searchSubtemaTerm}
                  onChange={e => setSearchSubtemaTerm(e.target.value)}
                  placeholder="Buscar subtema..."
                  className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
              </div>

              {/* Botones */}
              {!isDocenteMode && (
                <button onClick={handleCreateSubtema}
                  className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', whiteSpace: 'nowrap', height: '40px' }}>
                  <Plus className="w-4 h-4" />
                  Nuevo subtema
                </button>
              )}
              {onManageSequences && (
                <button
                  onClick={() => { if (canManageSequences && onManageSequences && currentAsignatura && currentTemaObj) onManageSequences(Number(selectedAsignatura), currentAsignatura.nombre, Number(selectedTema), currentTemaObj.nombre); }}
                  disabled={!canManageSequences}
                  className="flex items-center gap-2 text-sm font-bold px-4 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  style={{ background: '#dbeafe', color: '#1a56db', whiteSpace: 'nowrap', height: '40px' }}>
                  Secuencia de subtemas
                </button>
              )}
            </div>

            {/* Tarjetas subtemas */}
            {subtemasLoading ? (
              <div className="app-empty-panel py-12 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#1a56db' }} />
                <p style={{ color: '#4a6fa5' }}>Cargando subtemas...</p>
              </div>
            ) : subtemasError ? (
              <div className="app-alert app-alert--error mb-4"><p>{subtemasError}</p></div>
            ) : subtemas.length === 0 ? (
              <div className="app-empty-panel py-12">
                <p style={{ color: '#4a6fa5' }}>No hay subtemas registrados para este tema.</p>
              </div>
            ) : filteredSubtemas.length === 0 ? (
              <div className="app-empty-panel py-12">
                <p style={{ color: '#4a6fa5' }}>Sin resultados para la búsqueda.</p>
              </div>
            ) : (
              <div className="app-card-grid">
                {filteredSubtemas.map(subtema => {
                  const isActive = isSubtemaActive(subtema);
                  return (
                    <div key={subtema.id}
                      className={`app-list-card flex flex-col cursor-pointer ${isActive ? '' : 'opacity-70'}`}
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (onSelectSubtema) {
                          onSelectSubtema(Number(subtema.id), Number(subtema.tema_id), subtema.nombre);
                        } else if (canManageSequences && onManageSequences && currentAsignatura && currentTemaObj) {
                          onManageSequences(Number(selectedAsignatura), currentAsignatura.nombre, Number(selectedTema), currentTemaObj.nombre);
                        }
                      }}
                    >
                      {/* Badge esquina superior derecha */}
                      <span style={{
                        position: 'absolute', top: '12px', right: '12px',
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        ...(isActive ? { background: '#dbeafe', color: '#1a56db' } : { background: '#fef3c7', color: '#b45309' })
                      }}>
                        {isActive ? 'Activo' : 'Inhabilitado'}
                      </span>

                      {/* Nombre */}
                      <h4 className="app-list-card__title flex-1 pr-16 mb-1">{subtema.nombre}</h4>

                      {/* Descripción */}
                      <p className="app-list-card__description"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: subtema.descripcion || 'Sin descripción registrada.' }} />

                      {/* Footer */}
                      {!isDocenteMode && (
                        <div className="flex items-center gap-2 mt-3 pt-3"
                          style={{ borderTop: '1px solid #e2e8f0' }}
                          onClick={e => e.stopPropagation()} role="presentation">
                          <button type="button"
                            onClick={e => { e.stopPropagation(); handleEditSubtema(subtema); }}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={{ background: '#dbeafe', color: '#1a56db' }}>
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                          <button type="button"
                            onClick={e => { e.stopPropagation(); handleToggleSubtema(subtema); }}
                            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
                            style={isActive ? { background: '#fef2f2', color: '#b91c1c' } : { background: '#ecfdf5', color: '#047857' }}>
                            {isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {isActive ? 'Inhabilitar' : 'Habilitar'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={handleCloseModal}>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: '620px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff' }}
            onClick={e => e.stopPropagation()}>
            {/* Cabecera azul */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Subtemas</p>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                  {editingSubtema ? 'Editar subtema' : 'Nuevo subtema'}
                </h3>
              </div>
              <button type="button" onClick={handleCloseModal}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', lineHeight: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Nombre *</label>
                <input type="text" value={formData.nombre}
                  onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="app-form-input" placeholder="Nombre del subtema"
                  style={{ fontSize: '14px', fontWeight: 500 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Descripción</label>
                <div className="quill-editor-container app-rich-text-editor">
                  <div ref={editorRef} className="w-full" />
                </div>
              </div>

              {/* Tema asociado */}
              <div style={{ background: '#f0f5ff', borderRadius: '10px', padding: '10px 14px', border: '1.5px solid #bfd3f5' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a6fa5', marginBottom: '2px' }}>Tema asociado</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>
                  {temas.find(t => t.id === formData.tema_id)?.nombre || currentTemaObj?.nombre || 'Tema no encontrado'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff', flexShrink: 0 }}>
              <button type="button" onClick={handleCloseModal} disabled={submitting}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSaveSubtema} disabled={submitting || !formData.nombre.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', borderRadius: '10px', background: submitting || !formData.nombre.trim() ? '#6b8fc8' : 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: submitting || !formData.nombre.trim() ? 'not-allowed' : 'pointer' }}>
                {submitting && <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />}
                {submitting ? 'Guardando...' : editingSubtema ? 'Actualizar subtema' : 'Guardar subtema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
