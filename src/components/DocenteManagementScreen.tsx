import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, GraduationCap, Mail, Pencil, Plus, Search, Users, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface DocenteManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
}

interface Area {
  id: number;
  nombre: string;
}

interface DocentePersona {
  nombre?: string;
  email?: string;
  codigoAcceso?: string;
  estado?: boolean;
}

interface Docente {
  id: number;
  especialidad?: string;
  codigoAcceso?: string;
  persona?: DocentePersona;
  area?: Area;
  areaId?: number;
}

interface DocenteFormData {
  nombre: string;
  email: string;
  especialidad: string;
  areaId: string;
}

const emptyForm: DocenteFormData = {
  nombre: '',
  email: '',
  especialidad: '',
  areaId: ''
};

const accentColor = '#14B8A6';
const inputClassName = 'app-form-input';

const areaFilterButtonClass = (selected: boolean) =>
  `app-filter-chip app-filter-chip--multiline ${
    selected
      ? 'app-filter-chip--blue'
      : ''
  }`;

const stateFilterButtonClass = (tone: 'all' | 'active' | 'inactive', selected: boolean) => {
  if (selected) {
    if (tone === 'active') return 'app-filter-chip app-filter-chip--green';
    if (tone === 'inactive') return 'app-filter-chip app-filter-chip--amber';
    return 'app-filter-chip app-filter-chip--blue';
  }

  if (tone === 'active') return 'app-filter-chip';
  if (tone === 'inactive') return 'app-filter-chip';
  return 'app-filter-chip';
};

export function DocenteManagementScreen({ onBack, onHome }: DocenteManagementScreenProps) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [resultModal, setResultModal] = useState<{ open: boolean; success: boolean; message: string }>(
    { open: false, success: true, message: '' }
  );
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [formData, setFormData] = useState<DocenteFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const modalTitle = editingDocente ? 'Editar docente' : 'Crear docente';
  const modalDescription = editingDocente
    ? 'Actualiza la información del docente manteniendo la misma experiencia visual del panel administrativo.'
    : 'Completa los datos del docente y EduPath enviará automáticamente las credenciales al correo registrado.';

  const loadAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/areas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al cargar areas');
      }
      const data = await response.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading areas:', err);
      setAreas([]);
    }
  };

  const loadDocentes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/docente`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al cargar docentes');
      }
      const data = await response.json();
      setDocentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading docentes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar docentes');
    } finally {
      setLoading(false);
    }
  };

  const isDocenteActive = (docente: Docente) => docente.persona?.estado !== false;

  useEffect(() => {
    loadAreas();
    loadDocentes();
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingDocente(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (docente: Docente) => {
    setEditingDocente(docente);
    setFormData({
      nombre: docente.persona?.nombre || '',
      email: docente.persona?.email || '',
      especialidad: docente.especialidad || '',
      areaId: String(docente.area?.id ?? docente.areaId ?? '')
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCloseConfirm = () => {
    if (submitting) return;
    setShowConfirmCreate(false);
  };

  const handleCloseResult = () => {
    setResultModal({ open: false, success: true, message: '' });
  };

  const updateField = (field: keyof DocenteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEstado = async (docente: Docente) => {
    const nombre = docente.persona?.nombre || 'este docente';
    const currentlyActive = isDocenteActive(docente);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    if (!window.confirm(`Deseas ${actionLabel} a ${nombre}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/docente/${docente.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`No se pudo ${actionLabel} el docente`);
      }

      await loadDocentes();
      setSuccessMessage(`Docente ${currentlyActive ? 'inhabilitado' : 'habilitado'} correctamente.`);
    } catch (err) {
      console.error('Error toggling docente:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del docente');
    }
  };

  const isFormValid = useMemo(() => {
    return !!(
      formData.nombre.trim() &&
      formData.email.trim() &&
      formData.especialidad.trim() &&
      formData.areaId.trim()
    );
  }, [formData]);

  const filteredDocentes = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return docentes.filter((docente) => {
      const docenteIsActive = isDocenteActive(docente);
      const matchesArea =
        selectedAreaFilter === 'all' ||
        String(docente.area?.id ?? docente.areaId ?? '') === selectedAreaFilter;

      const matchesState =
        selectedStateFilter === 'all' ||
        (selectedStateFilter === 'active' ? docenteIsActive : !docenteIsActive);

      if (!matchesArea || !matchesState) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        docente.persona?.nombre,
        docente.persona?.email,
        docente.persona?.codigoAcceso,
        docente.especialidad,
        docente.area?.nombre,
        docente.codigoAcceso
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [docentes, searchTerm, selectedAreaFilter, selectedStateFilter]);

  const currentViewLabel = useMemo(
    () =>
      selectedStateFilter === 'all'
        ? 'Vista completa'
        : selectedStateFilter === 'active'
          ? 'Solo activos'
          : 'Solo inactivos',
    [selectedStateFilter]
  );

  const stats = useMemo(() => {
    const docentesConCorreo = docentes.filter((docente) => docente.persona?.email?.trim()).length;
    const especialidades = new Set(
      docentes
        .map((docente) => docente.especialidad?.trim())
        .filter((value): value is string => Boolean(value))
    ).size;
    const areasCubiertas = new Set(
      docentes
        .map((docente) => String(docente.area?.id ?? docente.areaId ?? ''))
        .filter((value) => value && value !== '0')
    ).size;
    const activos = docentes.filter((docente) => isDocenteActive(docente)).length;
    const inactivos = docentes.length - activos;

    return {
      total: docentes.length,
      docentesConCorreo,
      especialidades,
      areasCubiertas,
      activos,
      inactivos
    };
  }, [docentes]);

  const visibleAreas = useMemo(() => areas, [areas]);

  const handleSave = async () => {
    if (!isFormValid) {
      return;
    }

    if (!editingDocente && !showConfirmCreate) {
      setShowConfirmCreate(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        especialidad: formData.especialidad.trim(),
        areaId: Number(formData.areaId)
      };

      const response = await fetch(
        `${API_BASE_URL}/docente${editingDocente ? `/${editingDocente.id}` : ''}`,
        {
          method: editingDocente ? 'PUT' : 'POST',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(editingDocente ? 'Error al actualizar docente' : 'Error al crear docente');
      }

      await loadDocentes();
      handleCloseModal();
      if (!editingDocente) {
        setResultModal({
          open: true,
          success: true,
          message: 'Correo enviado con las credenciales del docente.'
        });
      }
    } catch (err) {
      console.error('Error saving docente:', err);
      const message = err instanceof Error ? err.message : 'Error al guardar docente';
      setError(message);
      if (!editingDocente) {
        setResultModal({
          open: true,
          success: false,
          message: `No se pudo enviar el correo o crear el docente. ${message}`
        });
      }
    } finally {
      setSubmitting(false);
      setShowConfirmCreate(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} title="Ir al panel principal">
                <div className="app-brand-icon">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Docentes</h1>
                <p className="text-gray-500 text-sm">Equipo docente, áreas y estado operativo bajo el mismo lenguaje del panel.</p>
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
          <span>Volver al Panel</span>
        </button>

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Equipo académico</div>
              <h2 className="app-page-hero__title">Gestión de docentes</h2>
              <p className="app-page-hero__description">
                Consulta, filtra y registra docentes.
              </p>
            </div>

            <div className="app-hero-metrics">
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Docentes</div>
                <div className="app-hero-metric__value">{stats.total}</div>
                <div className="app-hero-metric__help">Registros totales cargados.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Con correo</div>
                <div className="app-hero-metric__value">{stats.docentesConCorreo}</div>
                <div className="app-hero-metric__help">Listos para el envío de credenciales.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Áreas</div>
                <div className="app-hero-metric__value">{stats.areasCubiertas}</div>
                <div className="app-hero-metric__help">Cobertura académica actual.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Especialidades</div>
                <div className="app-hero-metric__value">{stats.especialidades}</div>
                <div className="app-hero-metric__help">Perfiles distintos presentes en el equipo.</div>
              </div>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--balanced">
            <div className="app-toolbar-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Equipo docente</p>
                  <p className="mt-1 text-sm text-slate-600">Filtra por área y estado.</p>
                </div>
                <button onClick={handleOpenCreate} className="app-btn app-btn-success">
                  <Plus className="h-5 w-5" />
                  <span>Nuevo docente</span>
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="app-soft-card app-soft-card--blue">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtrar por área</p>
                      <p className="mt-1 text-sm text-slate-600">Mantén el foco por área sin cambiar de pantalla.</p>
                    </div>
                    <div className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                      {selectedAreaFilter === 'all' ? 'Todas' : areas.find((area) => String(area.id) === selectedAreaFilter)?.nombre || 'Área'}
                    </div>
                  </div>
                  <div className="app-filter-row items-start">
                    <button onClick={() => setSelectedAreaFilter('all')} className={areaFilterButtonClass(selectedAreaFilter === 'all')}>
                      Todas las áreas
                    </button>
                    {visibleAreas.map((area) => {
                      const isActive = selectedAreaFilter === String(area.id);
                      return (
                        <button key={area.id} onClick={() => setSelectedAreaFilter(String(area.id))} className={areaFilterButtonClass(isActive)}>
                          {area.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="app-soft-card app-soft-card--green">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado del registro</p>
                    <p className="mt-1 text-sm text-slate-600">Alterna entre docentes activos, inactivos o la vista completa.</p>
                  </div>
                  <div className="app-filter-row">
                    <button onClick={() => setSelectedStateFilter('all')} className={stateFilterButtonClass('all', selectedStateFilter === 'all')}>
                      <Users className="h-4 w-4 shrink-0" />
                      <span>Todos</span>
                    </button>
                    <button onClick={() => setSelectedStateFilter('active')} className={stateFilterButtonClass('active', selectedStateFilter === 'active')}>
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>Activos ({stats.activos})</span>
                    </button>
                    <button onClick={() => setSelectedStateFilter('inactive')} className={stateFilterButtonClass('inactive', selectedStateFilter === 'inactive')}>
                      <EyeOff className="h-4 w-4 shrink-0" />
                      <span>Inactivos ({stats.inactivos})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-sidebar-stack">
              <div className="app-soft-card app-soft-card--blue">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda rápida</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#3A4A5B]">Buscar docente</h3>
                  <p className="mt-1 text-sm text-slate-600">Busca por nombre, correo, código, especialidad o área.</p>
                </div>
                <div className="app-toolbar-card__search app-search-field mb-4">
                  <Search className="app-search-field__icon" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Ej: Ana, Programación o DOC123"
                    className="app-form-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="app-soft-card bg-white/85">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resultados</p>
                    <p className="mt-2 text-2xl font-semibold text-[#3A4A5B]">{filteredDocentes.length}</p>
                  </div>
                  <div className="app-soft-card bg-white/85">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vista</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{currentViewLabel}</p>
                  </div>
                </div>
              </div>

              <div className="app-soft-card app-context-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Flujo sugerido</p>
                <p className="app-context-card__title">Orden recomendado</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>1. Filtra por área o estado.</p>
                  <p>2. Busca el docente por nombre, correo o código.</p>
                  <p>3. Edita o cambia el estado desde la tabla.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="app-empty-panel py-12">
            <p className="text-gray-600">Cargando docentes...</p>
          </div>
        ) : filteredDocentes.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">No hay docentes para la vista actual.</p>
            <p className="mt-2 text-sm text-slate-500">Cambia los filtros o registra un nuevo docente para poblar el listado.</p>
          </div>
        ) : (
          <div className="app-table-card">
            <div className="app-table-card__header app-table-card__header--green">
              <div>
                <div className="app-table-card__title">Listado docente</div>
                <p className="app-table-card__description">Consulta el equipo completo, revisa su área asignada y aplica acciones rápidas sobre cada registro.</p>
              </div>
            </div>
            <div className="app-table-card__body p-0">
            <div className="overflow-x-auto">
              <table className="app-data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Especialidad</th>
                    <th>Área</th>
                    <th>Código</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocentes.map((docente) => {
                    const docenteIsActive = isDocenteActive(docente);

                    return (
                    <tr
                      key={docente.id}
                      className={`transition-colors ${
                        docenteIsActive ? 'hover:bg-gray-50' : 'bg-slate-50/70 text-slate-500'
                      }`}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${docenteIsActive ? 'bg-blue-100' : 'bg-slate-200'}`}>
                            <Users className={`w-5 h-5 ${docenteIsActive ? 'text-[#4A90E2]' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className={docenteIsActive ? 'text-[#3A4A5B]' : 'text-slate-500'}>{docente.persona?.nombre || 'Sin nombre'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{docente.persona?.email || '-'}</td>
                      <td>{docente.especialidad || '-'}</td>
                      <td>{docente.area?.nombre || '-'}</td>
                      <td>{docente.persona?.codigoAcceso || docente.codigoAcceso || '-'}</td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            docenteIsActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {docenteIsActive ? 'Activo' : 'Inhabilitado'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(docente)}
                            className="app-btn app-btn-ghost app-btn-icon app-btn-sm"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(docente)}
                            className={`app-btn app-btn-sm ${docenteIsActive ? 'app-btn-secondary' : 'app-btn-success'}`}
                            title={docenteIsActive ? 'Inhabilitar docente' : 'Habilitar docente'}
                          >
                            {docenteIsActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span>{docenteIsActive ? 'Inhabilitar' : 'Habilitar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div
            className="app-modal-card app-modal-card--xl"
            style={{
              height: 'min(860px, calc(100vh - 2rem))'
            }}
          >
            <div className="app-modal-header">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="app-modal-kicker">
                    Gestión docente
                  </div>
                  <h3 className="app-modal-title">{modalTitle}</h3>
                  <p className="app-modal-description">{modalDescription}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="app-modal-meta hidden sm:block">
                    <div className="app-modal-meta-label">Estado</div>
                    <div className="app-modal-meta-value">{editingDocente ? 'Edición activa' : 'Nuevo registro'}</div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="app-modal-close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
              <div className="app-form-main app-form-stack">
                {!editingDocente && (
                  <div className="app-form-note">
                    Al guardar, EduPath enviará las credenciales al correo registrado.
                  </div>
                )}

                <section className="app-form-section app-form-section--muted">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Información personal</h4>
                    <p className="app-form-section-description">Datos básicos del docente.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field">
                      <label className="app-form-label">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(event) => updateField('nombre', event.target.value)}
                        className={inputClassName}
                        placeholder="Ej: Ana Gomez"
                        required
                      />
                    </div>
                    <div className="app-form-field">
                      <label className="app-form-label">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        className={inputClassName}
                        placeholder="ana@demo.com"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Perfil académico</h4>
                    <p className="app-form-section-description">Define especialidad y área. El código DOC### se asigna automáticamente.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field">
                      <label className="app-form-label">Especialidad *</label>
                      <input
                        type="text"
                        value={formData.especialidad}
                        onChange={(event) => updateField('especialidad', event.target.value)}
                        className={inputClassName}
                        placeholder="Matematicas"
                        required
                      />
                    </div>
                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Área *</label>
                      <select
                        value={formData.areaId}
                        onChange={(event) => updateField('areaId', event.target.value)}
                        className="app-form-select"
                        required
                      >
                        <option value="">Selecciona un area</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="app-form-aside app-form-stack md:self-start">
                <section className="app-form-section app-form-section--accent">
                  <h4 className="app-form-section-title">Resumen del registro</h4>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Docente</div>
                      <div className="app-form-summary-value">{formData.nombre.trim() || 'Sin nombre definido'}</div>
                      <div className="app-form-summary-help break-all">{formData.email.trim() || 'Correo pendiente'}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Código</div>
                        <div className="app-form-summary-value">{editingDocente ? (editingDocente.persona?.codigoAcceso || editingDocente.codigoAcceso || '—') : 'DOC### (automático)'}</div>
                      </div>
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Especialidad</div>
                        <div className="app-form-summary-value">{formData.especialidad.trim() || 'Pendiente'}</div>
                      </div>
                    </div>
                    <div className="app-form-note">
                      <div className="app-form-summary-label">Área asignada</div>
                      <div className="app-form-summary-value">{areas.find((area) => String(area.id) === formData.areaId)?.nombre || 'Selecciona un area'}</div>
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <h4 className="app-form-section-title">Verificación</h4>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>Validación del correo antes del guardado.</p>
                    <p>El código DOC### se asigna automáticamente al crear el docente.</p>
                    <p>Asigna el área correcta para mantener consistencia operativa.</p>
                  </div>
                </section>
              </aside>
              </div>
            </div>

            <div className="app-form-footer">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={submitting || !isFormValid}
                className="app-btn rounded-xl px-6 py-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingDocente ? 'Actualizar Docente' : 'Crear Docente'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCreate && !editingDocente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50 p-6 rounded-t-[26px]">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">Confirmar creación</h3>
              <button
                onClick={handleCloseConfirm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 p-6 text-sm leading-6 text-slate-600">
              <p>Validación de datos del docente antes de confirmar la creación.</p>
              <p>Se enviarán las credenciales al correo proporcionado.</p>
            </div>
            <div className="flex gap-3 justify-end rounded-b-[26px] border-t border-slate-200 bg-white p-6">
              <button
                onClick={handleCloseConfirm}
                disabled={submitting}
                className="rounded-xl border-2 border-slate-300 px-5 py-2.5 text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="rounded-xl px-5 py-2.5 text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: accentColor }}
              >
                Confirmar y crear
              </button>
            </div>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50 p-6 rounded-t-[26px]">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">
                {resultModal.success ? 'Correo enviado' : 'Fallo al enviar'}
              </h3>
              <button
                onClick={handleCloseResult}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-sm leading-6 text-slate-600">
              {resultModal.message}
            </div>
            <div className="flex justify-end rounded-b-[26px] border-t border-slate-200 bg-white p-6">
              <button
                onClick={handleCloseResult}
                className="rounded-xl px-5 py-2.5 text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: resultModal.success ? accentColor : '#EF4444' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
