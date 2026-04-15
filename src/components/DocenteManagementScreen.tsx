import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, GraduationCap, Mail, Pencil, Plus, Search, Users, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface DocenteManagementScreenProps {
  onBack: () => void;
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
  codigoAcceso: string;
  especialidad: string;
  areaId: string;
}

const emptyForm: DocenteFormData = {
  nombre: '',
  email: '',
  codigoAcceso: '',
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

export function DocenteManagementScreen({ onBack }: DocenteManagementScreenProps) {
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
      const response = await fetch(`${API_BASE_URL}/areas`);
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
      const response = await fetch(`${API_BASE_URL}/docente`);
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
      codigoAcceso: docente.persona?.codigoAcceso || docente.codigoAcceso || '',
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
        method: 'PUT'
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
    const baseValid =
      formData.nombre.trim() &&
      formData.email.trim() &&
      formData.codigoAcceso.trim() &&
      formData.especialidad.trim() &&
      formData.areaId.trim();

    if (!baseValid) {
      return false;
    }
    return true;
  }, [editingDocente, formData]);

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

  const visibleAreas = useMemo(() => areas.slice(0, 4), [areas]);

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
        codigoAcceso: formData.codigoAcceso.trim(),
        especialidad: formData.especialidad.trim(),
        areaId: Number(formData.areaId)
      };

      const response = await fetch(
        `${API_BASE_URL}/docente${editingDocente ? `/${editingDocente.id}` : ''}`,
        {
          method: editingDocente ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
        <div className="mx-auto max-w-7xl px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Docentes</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={handleOpenCreate}
              className="app-btn app-btn-success px-6 py-3"
            >
              <Plus className="h-5 w-5" />
              <span>Crear Nuevo Docente</span>
            </button>
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

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{stats.total}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Docentes</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Mail className="h-6 w-6" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">{stats.docentesConCorreo}</span>
            </div>
            <p className="text-gray-600 text-sm">Con correo</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="text-3xl text-gray-500">{stats.areasCubiertas}</span>
            </div>
            <p className="text-gray-600 text-sm">Áreas cubiertas</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{stats.especialidades}</span>
            </div>
            <p className="text-gray-600 text-sm">Especialidades</p>
          </div>
        </div>

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

        <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-md">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_340px]">
            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtrar por área</p>
                    <p className="mt-1 text-sm text-slate-600">Muestra docentes por su área asignada.</p>
                  </div>
                  <div className="max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                    {selectedAreaFilter === 'all'
                      ? 'Todas'
                      : areas.find((area) => String(area.id) === selectedAreaFilter)?.nombre || 'Área'}
                  </div>
                </div>
                <div className="app-filter-row items-start">
                  <button
                    onClick={() => setSelectedAreaFilter('all')}
                    className={areaFilterButtonClass(selectedAreaFilter === 'all')}
                  >
                    Todas las áreas
                  </button>
                  {visibleAreas.map((area) => {
                    const isActive = selectedAreaFilter === String(area.id);
                    return (
                      <button
                        key={area.id}
                        onClick={() => setSelectedAreaFilter(String(area.id))}
                        className={areaFilterButtonClass(isActive)}
                      >
                        {area.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado del registro</p>
                  <p className="mt-1 text-sm text-slate-600">Alterna entre docentes activos, inactivos o la vista completa.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedStateFilter('all')}
                    className={stateFilterButtonClass('all', selectedStateFilter === 'all')}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Todos</span>
                  </button>
                  <button
                    onClick={() => setSelectedStateFilter('active')}
                    className={stateFilterButtonClass('active', selectedStateFilter === 'active')}
                  >
                    <Eye className="h-4 w-4 shrink-0" />
                    <span>Activos ({stats.activos})</span>
                  </button>
                  <button
                    onClick={() => setSelectedStateFilter('inactive')}
                    className={stateFilterButtonClass('inactive', selectedStateFilter === 'inactive')}
                  >
                    <EyeOff className="h-4 w-4 shrink-0" />
                    <span>Inactivos ({stats.inactivos})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-6 lg:border-l lg:border-t-0">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda rápida</p>
                <h3 className="mt-2 text-lg font-semibold text-[#3A4A5B]">Buscar docente</h3>
                <p className="mt-1 text-sm text-slate-600">Busca por nombre, correo, código, especialidad o área.</p>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ej: Ana, matemáticas o Programación"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resultados</p>
                  <p className="mt-2 text-2xl font-semibold text-[#3A4A5B]">{filteredDocentes.length}</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vista actual</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {selectedStateFilter === 'all' ? 'Combinada' : selectedStateFilter === 'active' ? 'Solo activos' : 'Solo inactivos'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando docentes...</p>
          </div>
        ) : filteredDocentes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No hay docentes registrados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Nombre</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Email</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Especialidad</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Área</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Código</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
                    <th className="px-6 py-4 text-center text-[#3A4A5B]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocentes.map((docente) => {
                    const docenteIsActive = isDocenteActive(docente);

                    return (
                    <tr
                      key={docente.id}
                      className={`transition-colors ${
                        docenteIsActive ? 'hover:bg-gray-50' : 'bg-slate-50/70 text-slate-500'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${docenteIsActive ? 'bg-blue-100' : 'bg-slate-200'}`}>
                            <Users className={`w-5 h-5 ${docenteIsActive ? 'text-[#4A90E2]' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className={docenteIsActive ? 'text-[#3A4A5B]' : 'text-slate-500'}>{docente.persona?.nombre || 'Sin nombre'}</div>
                            <div className="text-xs text-gray-400">ID #{docente.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm break-all">{docente.persona?.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.especialidad || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.area?.nombre || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.persona?.codigoAcceso || docente.codigoAcceso || '-'}</td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(docente)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(docente)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              docenteIsActive
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
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
                    El alta del docente mantiene el flujo del panel y enviará las credenciales automáticamente al correo registrado.
                  </div>
                )}

                <section className="app-form-section app-form-section--muted">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Información personal</h4>
                    <p className="app-form-section-description">Datos base para identificar al docente dentro de la plataforma.</p>
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
                    <p className="app-form-section-description">Relaciona el código de acceso, la especialidad y el área que usará el docente.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field">
                      <label className="app-form-label">Código de acceso *</label>
                      <input
                        type="text"
                        value={formData.codigoAcceso}
                        onChange={(event) => updateField('codigoAcceso', event.target.value)}
                        className={inputClassName}
                        placeholder="DOC123"
                        required
                      />
                    </div>
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
                        <div className="app-form-summary-value">{formData.codigoAcceso.trim() || 'Pendiente'}</div>
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
                  <h4 className="app-form-section-title">Antes de guardar</h4>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>Verifica el correo porque ahí llegarán las credenciales iniciales.</p>
                    <p>Usa un código de acceso fácil de comunicar pero suficientemente claro para el equipo docente.</p>
                    <p>Asigna el área correcta para mantener consistencia con contenidos y permisos.</p>
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
              <h3 className="text-xl font-semibold text-[#3A4A5B]">Confirmar creacion</h3>
              <button
                onClick={handleCloseConfirm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 p-6 text-sm leading-6 text-slate-600">
              <p>Verifica que los datos del docente sean correctos.</p>
              <p>Se enviaran las credenciales al correo proporcionado.</p>
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
