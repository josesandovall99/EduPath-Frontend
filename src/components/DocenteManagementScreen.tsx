import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff, GraduationCap, Mail, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { AppLogo } from './AppLogo';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface DocenteManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
}

interface Asignatura {
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
  Asignatura?: Asignatura;
  asignaturaId?: number;
}

interface DocenteFormData {
  nombre: string;
  email: string;
  especialidad: string;
  asignaturaId: string;
}

const emptyForm: DocenteFormData = {
  nombre: '',
  email: '',
  especialidad: '',
  asignaturaId: ''
};

const accentColor = '#14B8A6';
const inputClassName = 'app-form-input';

const AsignaturaFilterButtonClass = (selected: boolean) =>
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
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
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
  const [selectedAsignaturaFilter, setSelectedAsignaturaFilter] = useState('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const modalTitle = editingDocente ? 'Editar docente' : 'Crear docente';
  const modalDescription = editingDocente
    ? 'Actualiza la información del docente manteniendo la misma experiencia visual del panel administrativo.'
    : 'Completa los datos del docente y EduPath enviará automáticamente las credenciales al correo registrado.';

  const loadAsignaturas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/asignaturas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al cargar asignaturas');
      }
      const data = await response.json();
      setAsignaturas(Array.isArray(data) ? data : []);
    } catch (err) {
      setAsignaturas([]);
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
      setError(err instanceof Error ? err.message : 'Error al cargar docentes');
    } finally {
      setLoading(false);
    }
  };

  const isDocenteActive = (docente: Docente) => docente.persona?.estado !== false;

  useEffect(() => {
    loadAsignaturas();
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
      asignaturaId: String(docente.Asignatura?.id ?? docente.asignaturaId ?? '')
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
    const currentlyActive = isDocenteActive(docente);
    const nombre = docente.persona?.nombre || 'este docente';
    if (!window.confirm(`¿${currentlyActive ? 'Inhabilitar' : 'Habilitar'} a ${nombre}?`)) return;
    // Actualización optimista inmediata — sin esperar al servidor
    setDocentes(prev => prev.map(d =>
      d.id === docente.id
        ? { ...d, persona: { ...d.persona, estado: !currentlyActive } }
        : d
    ));
    try {
      const response = await fetch(`${API_BASE_URL}/docente/${docente.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('No se pudo cambiar el estado');
    } catch (err) {
      // Revertir si falla
      setDocentes(prev => prev.map(d =>
        d.id === docente.id
          ? { ...d, persona: { ...d.persona, estado: currentlyActive } }
          : d
      ));
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado');
    }
  };

  const isFormValid = useMemo(() => {
    return !!(
      formData.nombre.trim() &&
      formData.email.trim() &&
      formData.especialidad.trim() &&
      formData.asignaturaId.trim()
    );
  }, [formData]);

  const filteredDocentes = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return docentes.filter((docente) => {
      const docenteIsActive = isDocenteActive(docente);
      const matchesAsignatura =
        selectedAsignaturaFilter === 'all' ||
        String(docente.Asignatura?.id ?? docente.asignaturaId ?? '') === selectedAsignaturaFilter;

      const matchesState =
        selectedStateFilter === 'all' ||
        (selectedStateFilter === 'active' ? docenteIsActive : !docenteIsActive);

      if (!matchesAsignatura || !matchesState) {
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
        docente.Asignatura?.nombre,
        docente.codigoAcceso
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [docentes, searchTerm, selectedAsignaturaFilter, selectedStateFilter]);

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
    const asignaturasCubiertas = new Set(
      docentes
        .map((docente) => String(docente.Asignatura?.id ?? docente.asignaturaId ?? ''))
        .filter((value) => value && value !== '0')
    ).size;
    const activos = docentes.filter((docente) => isDocenteActive(docente)).length;
    const inactivos = docentes.length - activos;

    return {
      total: docentes.length,
      docentesConCorreo,
      especialidades,
      asignaturasCubiertas,
      activos,
      inactivos
    };
  }, [docentes]);

  const visibleasignaturas = useMemo(() => asignaturas, [asignaturas]);

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
        asignaturaId: Number(formData.asignaturaId)
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

      if (editingDocente) {
        // Edición — actualizar solo ese registro en el array local
        const asignaturaObj = asignaturas.find(a => String(a.id) === formData.asignaturaId);
        setDocentes(prev => prev.map(d =>
          d.id === editingDocente.id
            ? {
                ...d,
                especialidad: formData.especialidad.trim(),
                Asignatura: asignaturaObj ?? d.Asignatura,
                asignaturaId: Number(formData.asignaturaId),
                persona: {
                  ...d.persona,
                  nombre: formData.nombre.trim(),
                  email: formData.email.trim(),
                }
              }
            : d
        ));
      } else {
        // Creación — necesitamos el nuevo ID del servidor
        await loadDocentes();
        setResultModal({
          open: true,
          success: true,
          message: 'Correo enviado con las credenciales del docente.'
        });
      }
      handleCloseModal();
    } catch (err) {
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
                  <AppLogo size={48} />
                </div>
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Docentes</h1>
                <p className="text-gray-500 text-sm">Equipo docente, asignaturas y estado operativo bajo el mismo lenguaje del panel.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">

        {/* Navegación */}
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* ── Toolbar: Estado + Búsqueda + Acción ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#e8eef8', height: 40 }}>
            {([
              { key: 'all',      label: `Todos (${stats.total})` },
              { key: 'active',   label: `Activos (${stats.activos})` },
              { key: 'inactive', label: `Inactivos (${stats.inactivos})` },
            ] as const).map(s => (
              <button key={s.key} type="button"
                onClick={() => setSelectedStateFilter(s.key)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: selectedStateFilter === s.key ? '#1a56db' : 'transparent', color: selectedStateFilter === s.key ? '#fff' : '#4a6fa5' }}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl px-3"
            style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: 40 }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, código o especialidad…"
              className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="shrink-0" style={{ color: '#94a3b8' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={handleOpenCreate}
            className="flex items-center gap-2 text-white font-bold text-sm px-5 rounded-xl transition-all hover:opacity-90 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: 40, whiteSpace: 'nowrap' }}>
            <Plus className="w-4 h-4" />
            Nuevo docente
          </button>
        </div>

        {/* ── 4 tarjetas de asignatura ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {/* Tarjeta "Todas" */}
          {(() => {
            const active = selectedAsignaturaFilter === 'all';
            const count = filteredDocentes.length;
            return (
              <button type="button" onClick={() => setSelectedAsignaturaFilter('all')}
                style={{ background: '#fff', border: active ? '2px solid #1a56db' : '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  boxShadow: active ? '0 0 0 3px rgba(26,86,219,0.10)' : '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s', textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Todas</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: active ? '#1a56db' : '#1e293b', lineHeight: 1 }}>{stats.total}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>docentes</div>
              </button>
            );
          })()}
          {asignaturas.map(a => {
            const active = selectedAsignaturaFilter === String(a.id);
            const count = docentes.filter(d => String(d.Asignatura?.id ?? d.asignaturaId ?? '') === String(a.id)).length;
            return (
              <button key={a.id} type="button" onClick={() => setSelectedAsignaturaFilter(String(a.id))}
                style={{ background: '#fff', border: active ? '2px solid #1a56db' : '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  boxShadow: active ? '0 0 0 3px rgba(26,86,219,0.10)' : '0 1px 3px rgba(0,0,0,0.06)', transition: 'all 0.15s', textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', lineHeight: 1.3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{a.nombre}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: active ? '#1a56db' : '#1e293b', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>docente(s)</div>
              </button>
            );
          })}
        </div>

        {/* Solo error crítico */}
        {error && (
          <div className="mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* ── Tabla ── */}
        {loading ? (
          <div className="app-empty-panel py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Cargando docentes…</p>
            </div>
          </div>
        ) : filteredDocentes.length === 0 ? (
          <div className="app-empty-panel py-12">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No hay docentes para los filtros activos.</p>
          </div>
        ) : (
          <div className="app-table-card">
            {/* Sin header extra — el thead de la tabla ya tiene el azul */}
            <div className="overflow-x-auto">
              <table className="app-data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Especialidad</th>
                    <th>Asignatura</th>
                    <th>Código</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocentes.map((docente) => {
                    const docenteIsActive = isDocenteActive(docente);
                    const codigo = docente.persona?.codigoAcceso || docente.codigoAcceso || '—';
                    return (
                      <tr key={docente.id} className={`transition-colors ${docenteIsActive ? 'hover:bg-[#f0f5ff]' : 'opacity-55'}`}>
                        {/* Nombre */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: docenteIsActive ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Users style={{ width: 15, height: 15, color: docenteIsActive ? '#1a56db' : '#94a3b8' }} />
                            </div>
                            <span style={{ fontWeight: 600, color: docenteIsActive ? '#1e293b' : '#94a3b8', fontSize: 13 }}>
                              {docente.persona?.nombre || 'Sin nombre'}
                            </span>
                          </div>
                        </td>
                        {/* Email */}
                        <td style={{ fontSize: 13, color: '#475569' }}>{docente.persona?.email || '—'}</td>
                        {/* Especialidad */}
                        <td style={{ fontSize: 13, color: '#475569' }}>{docente.especialidad || '—'}</td>
                        {/* Asignatura — sin truncar */}
                        <td style={{ fontSize: 13, color: '#475569' }}>{docente.Asignatura?.nombre || '—'}</td>
                        {/* Código — texto plano, sin caja */}
                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }} title={codigo}>{codigo}</td>
                        {/* Estado */}
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: docenteIsActive ? '#dcfce7' : '#fef9c3',
                            color: docenteIsActive ? '#16a34a' : '#a16207' }}>
                            {docenteIsActive ? 'Activo' : 'Inhabilitado'}
                          </span>
                        </td>
                        {/* Acciones — íconos minimalistas */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button onClick={() => handleOpenEdit(docente)} title="Editar"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent', color: '#1a56db', flexShrink: 0, transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#dbeafe')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <Pencil style={{ width: 12, height: 12 }} />
                            </button>
                            <button onClick={() => handleToggleEstado(docente)} title={docenteIsActive ? 'Inhabilitar' : 'Habilitar'}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, cursor: 'pointer', border: 'none', background: 'transparent', flexShrink: 0, transition: 'background 0.15s',
                                color: docenteIsActive ? '#dc2626' : '#16a34a' }}
                              onMouseEnter={e => (e.currentTarget.style.background = docenteIsActive ? '#fee2e2' : '#dcfce7')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {docenteIsActive ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                    <p className="app-form-section-description">Define especialidad y asignatura. El código DOC### se asigna automáticamente.</p>
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
                      <label className="app-form-label">Asignatura *</label>
                      <select
                        value={formData.asignaturaId}
                        onChange={(event) => updateField('asignaturaId', event.target.value)}
                        className="app-form-select"
                        required
                      >
                        <option value="">Selecciona un Asignatura</option>
                        {asignaturas.map((Asignatura) => (
                          <option key={Asignatura.id} value={Asignatura.id}>
                            {Asignatura.nombre}
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
                      <div className="app-form-summary-label">Asignatura asignada</div>
                      <div className="app-form-summary-value">{asignaturas.find((Asignatura) => String(Asignatura.id) === formData.asignaturaId)?.nombre || 'Selecciona un Asignatura'}</div>
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <h4 className="app-form-section-title">Verificación</h4>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>Validación del correo antes del guardado.</p>
                    <p>El código DOC### se asigna automáticamente al crear el docente.</p>
                    <p>Asigna el asignatura correcta para mantener consistencia operativa.</p>
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
