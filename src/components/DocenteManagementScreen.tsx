import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, GraduationCap, Mail, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
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
const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500/25';

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

  const handleDelete = async (docente: Docente) => {
    const nombre = docente.persona?.nombre || 'este docente';
    if (!window.confirm(`Deseas eliminar a ${nombre}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/docente/${docente.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el docente');
      }

      await loadDocentes();
    } catch (err) {
      console.error('Error deleting docente:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar docente');
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
      const matchesArea =
        selectedAreaFilter === 'all' ||
        String(docente.area?.id ?? docente.areaId ?? '') === selectedAreaFilter;

      if (!matchesArea) {
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
  }, [docentes, searchTerm, selectedAreaFilter]);

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

    return {
      total: docentes.length,
      docentesConCorreo,
      especialidades,
      areasCubiertas
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

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedAreaFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedAreaFilter === 'all'
                    ? 'app-primary-btn text-white shadow-md'
                    : 'app-btn-secondary text-gray-700'
                }`}
              >
                Todos
              </button>
              {visibleAreas.map((area) => {
                const isActive = selectedAreaFilter === String(area.id);
                return (
                  <button
                    key={area.id}
                    onClick={() => setSelectedAreaFilter(String(area.id))}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'app-primary-btn text-white shadow-md'
                        : 'app-btn-secondary text-gray-700'
                    }`}
                  >
                    {area.nombre}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar docentes..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent w-[240px] md:w-[300px]"
              />
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
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocentes.map((docente) => (
                    <tr key={docente.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Users className="w-5 h-5 text-[#4A90E2]" />
                          </div>
                          <div>
                            <div className="text-[#3A4A5B]">{docente.persona?.nombre || 'Sin nombre'}</div>
                            <div className="text-xs text-gray-400">ID #{docente.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm break-all">{docente.persona?.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.especialidad || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.area?.nombre || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{docente.persona?.codigoAcceso || docente.codigoAcceso || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(docente)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(docente)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-white to-cyan-50 px-6 py-5 rounded-t-[28px] lg:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Gestión docente
                  </div>
                  <h3 className="text-2xl font-semibold text-[#3A4A5B]">{modalTitle}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{modalDescription}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden rounded-2xl border border-teal-100 bg-white/80 px-4 py-3 text-right shadow-sm sm:block">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Estado</div>
                    <div className="mt-1 text-sm font-semibold text-[#3A4A5B]">{editingDocente ? 'Edición activa' : 'Nuevo registro'}</div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] lg:px-8 lg:py-7">
              <div className="space-y-6">
                {!editingDocente && (
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-5 py-4 text-sm leading-6 text-teal-800 shadow-sm">
                    El alta del docente mantiene el flujo del panel y enviará las credenciales automáticamente al correo registrado.
                  </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-[#3A4A5B]">Información personal</h4>
                    <p className="mt-1 text-sm text-slate-500">Datos base para identificar al docente dentro de la plataforma.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(event) => updateField('nombre', event.target.value)}
                        className={inputClassName}
                        placeholder="Ej: Ana Gomez"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Email *</label>
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

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-[#3A4A5B]">Perfil académico</h4>
                    <p className="mt-1 text-sm text-slate-500">Relaciona el código de acceso, la especialidad y el área que usará el docente.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Código de acceso *</label>
                      <input
                        type="text"
                        value={formData.codigoAcceso}
                        onChange={(event) => updateField('codigoAcceso', event.target.value)}
                        className={inputClassName}
                        placeholder="DOC123"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Especialidad *</label>
                      <input
                        type="text"
                        value={formData.especialidad}
                        onChange={(event) => updateField('especialidad', event.target.value)}
                        className={inputClassName}
                        placeholder="Matematicas"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Área *</label>
                      <select
                        value={formData.areaId}
                        onChange={(event) => updateField('areaId', event.target.value)}
                        className={`${inputClassName} bg-white`}
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

              <aside className="space-y-5">
                <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-[#3A4A5B]">Resumen del registro</h4>
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Docente</div>
                      <div className="mt-2 font-semibold text-slate-800">{formData.nombre.trim() || 'Sin nombre definido'}</div>
                      <div className="mt-1 break-all text-slate-500">{formData.email.trim() || 'Correo pendiente'}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Código</div>
                        <div className="mt-2 font-semibold text-slate-800">{formData.codigoAcceso.trim() || 'Pendiente'}</div>
                      </div>
                      <div className="rounded-xl border border-white/70 bg-white/90 p-4 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Especialidad</div>
                        <div className="mt-2 font-semibold text-slate-800">{formData.especialidad.trim() || 'Pendiente'}</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/70 p-4 text-teal-800">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em]">Área asignada</div>
                      <div className="mt-2 font-semibold">{areas.find((area) => String(area.id) === formData.areaId)?.nombre || 'Selecciona un area'}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-base font-semibold text-[#3A4A5B]">Antes de guardar</h4>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>Verifica el correo porque ahí llegarán las credenciales iniciales.</p>
                    <p>Usa un código de acceso fácil de comunicar pero suficientemente claro para el equipo docente.</p>
                    <p>Asigna el área correcta para mantener consistencia con contenidos y permisos.</p>
                  </div>
                </section>
              </aside>
            </div>

            <div className="sticky bottom-0 flex gap-4 justify-end rounded-b-[28px] border-t border-slate-200 bg-white/95 px-6 py-5 backdrop-blur lg:px-8">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="rounded-xl border-2 border-slate-300 px-6 py-3 text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={submitting || !isFormValid}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
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
