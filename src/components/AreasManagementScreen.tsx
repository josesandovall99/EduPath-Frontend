import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { buildAuthHeaders } from '../utils/authHeaders';
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
      const response = await fetch(`${API_BASE_URL}/areas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
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
        headers: buildAuthHeaders({
          Accept: 'application/json'
        }),
        credentials: 'include'
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
        headers: buildAuthHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }),
        credentials: 'include',
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
                <h1 className="text-[#3A4A5B]">Gestión de Áreas - Subtemas - Contenidos</h1>
                <p className="text-gray-500 text-sm">Mapa académico y entrada a la estructura de contenidos de EduPath.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <button
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <AdminFlowGuide
          title="Gestión de áreas académicas"
          description="Registro y selección de áreas dentro de la estructura académica."
          breadcrumbs={[
            { label: 'Panel admin' },
            { label: 'Áreas', current: true }
          ]}
          steps={[
            { label: 'Áreas', helper: 'Registro o selección del área base.', status: 'current' },
            { label: 'Temas', helper: 'Organización temática por área.', status: 'upcoming' },
            { label: 'Subtemas', helper: 'Detalle de la estructura temática.', status: 'upcoming' },
            { label: 'Secuencias', helper: 'Orden de la ruta académica.', status: 'upcoming' }
          ]}
          asideTitle="Siguiente paso"
          asideDescription="La selección de un área habilita la gestión temática dentro del mismo flujo."
        />

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Arquitectura académica</div>
              <h2 className="app-page-hero__title">Gestión de áreas</h2>
              <p className="app-page-hero__description">
                Consulta áreas y accede a sus temas.
              </p>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--aside">
            <div className="app-toolbar-card">
              <div className="app-hero-panel">
                <div className="app-hero-panel__header">
                  <div className="app-hero-panel__copy">
                    <p className="app-hero-panel__eyebrow">Catálogo</p>
                    <h3 className="app-hero-panel__title">Estado del catálogo</h3>
                    <p className="app-hero-panel__description">Filtra por estado.</p>
                  </div>
                  <button onClick={handleOpenCreate} className="app-btn app-primary-btn">
                    <Plus className="w-4 h-4" />
                    <span>Nueva área</span>
                  </button>
                </div>
                <div className="app-hero-panel__body">
                  <div className="app-filter-row">
                    <button onClick={() => setStateFilter('all')} className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>
                      <span>Todas ({areas.length})</span>
                    </button>
                    <button onClick={() => setStateFilter('active')} className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}>
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>Activas ({activeAreas})</span>
                    </button>
                    <button onClick={() => setStateFilter('inactive')} className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}>
                      <EyeOff className="h-4 w-4 shrink-0" />
                      <span>Inactivas ({inactiveAreas})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-sidebar-stack">
              <div className="app-toolbar-card">
                <div className="app-hero-panel">
                  <div className="app-hero-panel__copy">
                    <p className="app-hero-panel__eyebrow">Búsqueda</p>
                    <h3 className="app-hero-panel__title">Buscar área</h3>
                    <p className="app-hero-panel__description">Busca por nombre.</p>
                  </div>
                  <div className="app-hero-panel__body">
                    <div className="app-search-field">
                      <Search className="app-search-field__icon" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar área"
                        className="app-form-input"
                      />
                    </div>
                  </div>
                </div>
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

        {isLoading ? (
          <div className="app-empty-panel py-12">
            <p className="text-gray-600">Cargando áreas...</p>
          </div>
        ) : error ? (
          <div className="app-alert app-alert--error mb-6">
            <p>{error}</p>
          </div>
        ) : areas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">No hay áreas disponibles todavía.</p>
            <p className="mt-2 text-sm text-slate-500">El registro del primer área habilita la organización de temas, subtemas y contenidos.</p>
          </div>
        ) : filteredAreas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">Sin resultados para la búsqueda actual.</p>
            <p className="mt-2 text-sm text-slate-500">Modifique el nombre o el estado visible del catálogo para ampliar el resultado.</p>
          </div>
        ) : (
          <div className="app-card-grid app-area-catalog-grid">
              {filteredAreas.map((area, index) => {
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
                    className={`app-list-card app-area-catalog-card cursor-pointer ${areaIsActive ? '' : 'opacity-75'}`}
                  >
                    <div className="app-area-catalog-card__top">
                      <div className="flex flex-wrap items-center gap-2">
                          <span className={`app-badge ${areaIsActive ? 'app-badge--blue' : 'bg-amber-100 text-amber-700'}`}>
                            {areaIsActive ? 'Activa' : 'Inhabilitada'}
                          </span>
                      </div>
                      <span className="app-area-catalog-card__hint">
                        {areaIsActive ? 'Abrir temas' : 'Consultar área'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="app-list-card__title app-area-catalog-card__title">
                        {area.nombre}
                      </h2>
                      <p className="app-list-card__description app-area-catalog-card__summary">
                        {areaIsActive
                          ? 'Gestión de temas, subtemas y recursos vinculados.'
                          : 'Registro inhabilitado, disponible para consulta o reactivación.'}
                      </p>
                    </div>
                    <div className="app-area-catalog-card__body">
                      <p className="app-area-catalog-card__label">Descripción</p>
                      <p className="app-list-card__meta app-area-catalog-card__description">
                        {area.descripcion || 'Sin descripción registrada.'}
                      </p>
                    </div>
                    <div className="app-list-card__footer app-area-catalog-card__footer">
                      <div className="app-action-row">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleArea(area);
                          }}
                          className={`app-btn app-btn-sm ${areaIsActive ? 'app-btn-secondary' : 'app-btn-success'}`}
                        >
                          {areaIsActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          <span>{areaIsActive ? 'Inhabilitar' : 'Habilitar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenEdit(area);
                          }}
                          className="app-btn app-btn-sm app-btn-ghost"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--center">
          <div className="app-modal-card app-modal-card--sm">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Áreas</div>
                <h3 className="app-modal-title">{editingAreaId !== null ? 'Editar área' : 'Crear nueva área'}</h3>
                <p className="app-modal-description">Define el nombre y la descripción del área.</p>
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
