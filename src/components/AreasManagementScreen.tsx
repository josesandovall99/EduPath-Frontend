import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface Area {
  id: number;
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

interface AreasManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  onSelectArea: (areaId: number, areaName: string) => void;
}

export function AreasManagementScreen({ onBack, onHome, onSelectArea }: AreasManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

  const isAreaActive = (area: Area) => area.estado !== false;

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAreas();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const loadAreas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/areas`);
      if (!response.ok) {
        throw new Error('Error al cargar áreas');
      }
      const data = await response.json();
      setAreas(data);
    } catch (err) {
      console.error('Error en loadAreas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar áreas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleArea = async (area: Area) => {
    const currentlyActive = isAreaActive(area);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    if (!window.confirm(`Deseas ${actionLabel} el área ${area.nombre}?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/areas/${area.id}/toggle-estado`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error al ${actionLabel} el área`);
      }

      const data = await response.json().catch(() => null);
      const updatedEstado = data?.estado ?? !currentlyActive;

      setAreas((prev) => prev.map((item) => (
        item.id === area.id ? { ...item, estado: updatedEstado } : item
      )));
      setSuccessMessage(`Área ${updatedEstado ? 'habilitada' : 'inhabilitada'} correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del área');
    }
  };

  const getColorForArea = (index: number) => {
    const colors = [
      'from-[#4A90E2] to-[#5B9FED]',
      'from-[#7ED6A7] to-[#90E0B7]',
      'from-[#F5A97F] to-[#F7B98F]',
      'from-[#A78BFA] to-[#B79BFA]',
      'from-[#06B6D4] to-[#14B8A6]',
      'from-[#8B5CF6] to-[#A78BFA]',
    ];
    return colors[index % colors.length];
  };

  const handleOpenCreate = () => {
    setFormError(null);
    setSuccessMessage(null);
    setEditingAreaId(null);
    setFormData({ nombre: '', descripcion: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (area: Area) => {
    setFormError(null);
    setSuccessMessage(null);
    setEditingAreaId(area.id);
    setFormData({
      nombre: area.nombre,
      descripcion: area.descripcion || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleSaveArea = async () => {
    if (!formData.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const isEditMode = editingAreaId !== null;
      const endpoint = isEditMode
        ? `${API_BASE_URL}/areas/${editingAreaId}`
        : `${API_BASE_URL}/areas`;

      const response = await fetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || (isEditMode ? 'Error al actualizar el area' : 'Error al crear el area'));
      }

      const savedArea = await response.json();

      if (isEditMode) {
        setAreas((prev) => prev.map((area) => (area.id === savedArea.id ? savedArea : area)));
        setSuccessMessage('Area actualizada correctamente.');
      } else {
        setAreas((prev) => [savedArea, ...prev]);
        setSuccessMessage('Area creada correctamente.');
      }

      setShowModal(false);
      setEditingAreaId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : (editingAreaId !== null ? 'Error al actualizar el area' : 'Error al crear el area'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAreas = areas.filter((area) => {
    const matchesName = area.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesState =
      stateFilter === 'all' ||
      (stateFilter === 'active' ? isAreaActive(area) : !isAreaActive(area));

    return matchesName && matchesState;
  });

  const activeAreas = areas.filter((area) => isAreaActive(area)).length;
  const inactiveAreas = areas.length - activeAreas;

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
                <h1 className="text-[#3A4A5B]">Gestión de Áreas - Subtemas - Contenidos</h1>
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

        {/* Informational Message */}
        <div className="app-info-banner mb-8 p-6">
          <h2 className="text-lg font-bold mb-2">Gestión de Contenido Educativo</h2>
          <p className="text-sm opacity-95">
            Selecciona un área para gestionar sus subtemas y contenidos. Desde aquí podrás organizar la estructura completa 
            de aprendizaje, definir el orden de los temas y asignar materiales educativos a cada subtema.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#3A4A5B] text-xl">Areas académicas</h2>
            <p className="text-gray-500 text-sm">Crea nuevas areas para organizar los contenidos.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="app-btn app-primary-btn px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva area</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
            Filtrar por nombre de área
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Escribe el nombre del área..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
            />
          </div>

          <div className="app-filter-row mt-4">
            <button
              onClick={() => setStateFilter('all')}
              className={`app-filter-chip ${
                stateFilter === 'all'
                  ? 'app-filter-chip--blue'
                  : ''
              }`}
            >
              Todas ({areas.length})
            </button>
            <button
              onClick={() => setStateFilter('active')}
              className={`app-filter-chip ${
                stateFilter === 'active'
                  ? 'app-filter-chip--green'
                  : ''
              }`}
            >
              Activas ({activeAreas})
            </button>
            <button
              onClick={() => setStateFilter('inactive')}
              className={`app-filter-chip ${
                stateFilter === 'inactive'
                  ? 'app-filter-chip--amber'
                  : ''
              }`}
            >
              Inactivas ({inactiveAreas})
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-green-700 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando áreas...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : areas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4A90E2] to-[#357abd] rounded-full flex items-center justify-center opacity-10"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay áreas disponibles</h3>
            <p className="text-gray-600 mb-4">
              No se encontraron áreas en el sistema. Crea una nueva área para comenzar a organizar contenidos.
            </p>
            <p className="text-sm text-gray-500">
              Las áreas son las categorías principales de aprendizaje en la plataforma educativa.
            </p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin resultados</h3>
            <p className="text-gray-600">
              No se encontraron áreas con el nombre ingresado.
            </p>
          </div>
        ) : (
          <>
            {/* Areas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAreas.map((area, index) => {
                const gradient = getColorForArea(index);
                const areaIsActive = isAreaActive(area);
                return (
                  <div
                    key={area.id}
                    onClick={() => onSelectArea(area.id, area.nombre)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectArea(area.id, area.nombre);
                      }
                    }}
                    className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg transition-all duration-300 p-8 text-left group cursor-pointer ${
                      areaIsActive ? 'hover:shadow-2xl hover:scale-[1.05]' : 'opacity-70 saturate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            areaIsActive ? 'bg-white/20 text-white' : 'bg-black/20 text-white'
                          }`}>
                            {areaIsActive ? 'Activa' : 'Inhabilitada'}
                          </span>
                        </div>
                        <h2 className="text-white text-2xl font-bold group-hover:text-gray-100 transition-colors mb-2">
                          {area.nombre}
                        </h2>
                        <p className="text-white text-opacity-90 text-sm">
                          {areaIsActive
                            ? 'Click para gestionar subtemas y contenidos'
                            : 'Área inhabilitada. Puedes abrirla para revisar su estructura o volver a habilitarla.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleArea(area);
                          }}
                          className="app-btn mt-1 bg-white/20 px-3 py-1.5 text-white hover:bg-white/30"
                        >
                          {areaIsActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          <span className="text-sm font-medium">{areaIsActive ? 'Inhabilitar' : 'Habilitar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenEdit(area);
                          }}
                          className="app-btn mt-1 bg-white/20 px-3 py-1.5 text-white hover:bg-white/30"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="text-sm font-medium">Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--center">
          <div className="app-modal-card app-modal-card--sm">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Áreas</div>
                <h3 className="app-modal-title">{editingAreaId !== null ? 'Editar área' : 'Crear nueva área'}</h3>
                <p className="app-modal-description">Define el nombre y la descripción del área con el mismo patrón visual de los formularios administrativos.</p>
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
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <section className="app-form-section app-form-section--muted">
              <div className="app-form-field">
                <label className="app-form-label">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                  className="app-form-input"
                  placeholder="Ej: Programacion"
                  required
                />
              </div>

              <div className="app-form-field">
                <label className="app-form-label">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                  className="app-form-textarea"
                  placeholder="Descripcion breve del area"
                  rows={3}
                />
              </div>
              </section>
            </div>
            </div>

            <div className="app-form-footer">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="app-btn app-btn-secondary px-4 py-2.5 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveArea}
                disabled={submitting || !formData.nombre.trim()}
                className="app-btn app-primary-btn px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{editingAreaId !== null ? 'Actualizando...' : 'Guardando...'}</span>
                  </>
                ) : (
                  <span>{editingAreaId !== null ? 'Actualizar area' : 'Crear area'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
