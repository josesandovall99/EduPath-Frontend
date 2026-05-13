import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface Asignatura {
  id: number;
  nombre: string;
  descripcion?: string;
  es_asignatura_pilar?: boolean;
  tipo_pilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
  estado?: boolean;
  /** Si true, los estudiantes avanzan en orden (tema → subtema → contenido) */
  progresion_secuencial?: boolean;
}

type PillarType = 'PROGRAMACION' | 'ANALISIS' | 'ATC';

const PILLAR_OPTIONS: Array<{ value: PillarType; label: string }> = [
  { value: 'PROGRAMACION', label: 'Programación' },
  { value: 'ANALISIS', label: 'Análisis' },
  { value: 'ATC', label: 'ATC' },
];

interface AsignaturasManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  onSelectAsignatura: (asignaturaId: number, asignaturaName: string) => void;
  mode?: 'admin' | 'docente';
  readOnly?: boolean;
}

export function AsignaturasManagementScreen({ onBack, onHome, onSelectAsignatura, mode = 'admin', readOnly = false }: AsignaturasManagementScreenProps) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingasignaturaId, setEditingasignaturaId] = useState<number | null>(null);
  const [progresionPatchingId, setProgresionPatchingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    esAsignaturaPilar: false,
    tipoPilar: '' as '' | PillarType,
    progresionSecuencial: false,
  });
  const isDocenteMode = mode === 'docente';

  const isAsignaturaActive = (Asignatura: Asignatura) => Asignatura.estado !== false;

  useEffect(() => {
    loadAsignaturas();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAsignaturas();
    }, 120000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const loadAsignaturas = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/asignaturas`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al cargar asignaturas');
      }
      const data = await response.json();
      setAsignaturas(data);
    } catch (err) {
      console.error('Error en loadAsignaturas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar asignaturas');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatchProgresionSecuencial = async (Asignatura: Asignatura, value: boolean) => {
    try {
      setProgresionPatchingId(Asignatura.id);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/asignaturas/${Asignatura.id}/progresion-secuencial`, {
        method: 'PATCH',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({ progresion_secuencial: value }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || 'No se pudo actualizar la preferencia');
      }
      const updated = await response.json();
      setAsignaturas((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
      setSuccessMessage(
        value
          ? 'Progresión secuencial activada: los estudiantes avanzan en orden.'
          : 'Navegación libre activada para los estudiantes.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la preferencia');
    } finally {
      setProgresionPatchingId(null);
    }
  };

  const handleToggleAsignatura = async (Asignatura: Asignatura) => {
    const currentlyActive = isAsignaturaActive(Asignatura);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    if (!window.confirm(`Deseas ${actionLabel} el asignatura ${Asignatura.nombre}?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/asignaturas/${Asignatura.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders({
          Accept: 'application/json'
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error al ${actionLabel} el asignatura`);
      }

      const data = await response.json().catch(() => null);
      const updatedEstado = data?.estado ?? !currentlyActive;

      setAsignaturas((prev) => prev.map((item) => (
        item.id === Asignatura.id ? { ...item, estado: updatedEstado } : item
      )));
      setSuccessMessage(`Asignatura ${updatedEstado ? 'habilitada' : 'inhabilitada'} correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del asignatura');
    }
  };

  const getColorForAsignatura = (index: number) => {
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

  const usedPillarTypes = new Set<PillarType>(
    asignaturas
      .filter((Asignatura) => Asignatura.id !== editingasignaturaId && isAsignaturaActive(Asignatura) && Asignatura.es_asignatura_pilar && Asignatura.tipo_pilar)
      .map((Asignatura) => Asignatura.tipo_pilar as PillarType)
  );

  const allPillarsTaken = usedPillarTypes.size === PILLAR_OPTIONS.length;

  const handleOpenCreate = () => {
    setFormError(null);
    setSuccessMessage(null);
    setEditingasignaturaId(null);
    setFormData({ nombre: '', descripcion: '', esAsignaturaPilar: false, tipoPilar: '', progresionSecuencial: false });
    setShowModal(true);
  };

  const handleOpenEdit = (Asignatura: Asignatura) => {
    setFormError(null);
    setSuccessMessage(null);
    setEditingasignaturaId(Asignatura.id);
    setFormData({
      nombre: Asignatura.nombre,
      descripcion: Asignatura.descripcion || '',
      esAsignaturaPilar: Boolean(Asignatura.es_asignatura_pilar),
      tipoPilar: Asignatura.tipo_pilar || '',
      progresionSecuencial: Boolean(Asignatura.progresion_secuencial),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleSaveAsignatura = async () => {
    if (!formData.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    if (formData.esAsignaturaPilar && !formData.tipoPilar) {
      setFormError('Debes seleccionar el tipo de asignatura principal.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const isEditMode = editingasignaturaId !== null;
      const endpoint = isEditMode
        ? `${API_BASE_URL}/asignaturas/${editingasignaturaId}`
        : `${API_BASE_URL}/asignaturas`;

      const response = await fetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined,
          es_asignatura_pilar: formData.esAsignaturaPilar,
          tipo_pilar: formData.esAsignaturaPilar ? formData.tipoPilar : null,
          progresion_secuencial: formData.progresionSecuencial,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || (isEditMode ? 'Error al actualizar el Asignatura' : 'Error al crear el Asignatura'));
      }

      const savedAsignatura = await response.json();

      if (isEditMode) {
        setAsignaturas((prev) => prev.map((Asignatura) => (Asignatura.id === savedAsignatura.id ? savedAsignatura : Asignatura)));
        setSuccessMessage('Asignatura actualizada correctamente.');
      } else {
        setAsignaturas((prev) => [savedAsignatura, ...prev]);
        setSuccessMessage('Asignatura creada correctamente.');
      }

      setShowModal(false);
      setEditingasignaturaId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : (editingasignaturaId !== null ? 'Error al actualizar el Asignatura' : 'Error al crear el Asignatura'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAsignaturas = asignaturas.filter((Asignatura) => {
    const matchesName = Asignatura.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesState =
      stateFilter === 'all' ||
      (stateFilter === 'active' ? isAsignaturaActive(Asignatura) : !isAsignaturaActive(Asignatura));

    return matchesName && matchesState;
  });

  const activeasignaturas = asignaturas.filter((Asignatura) => isAsignaturaActive(Asignatura)).length;
  const inactiveasignaturas = asignaturas.length - activeasignaturas;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} className="app-brand-icon" title="Ir al panel principal">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1>{isDocenteMode ? 'Mis asignaturas' : 'Gestión de asignaturas'}</h1>
                <p className="text-sm">{isDocenteMode ? 'Asignaturas asignadas al docente' : 'Administra el catálogo de asignaturas'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Volver */}
        <button onClick={onBack} className="app-back-button mb-5">
          <ArrowLeft className="w-4 h-4" />
          <span>{isDocenteMode ? 'Volver al panel docente' : 'Volver al Panel'}</span>
        </button>

        {/* Toolbar: filtros + búsqueda + nuevo */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Filtros */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#e8eef8' }}>
            {[
              { key: 'all',      label: `Todas (${asignaturas.length})` },
              { key: 'active',   label: `Activas (${activeasignaturas})` },
              { key: 'inactive', label: `Inactivas (${inactiveasignaturas})` },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStateFilter(f.key as 'all' | 'active' | 'inactive')}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: stateFilter === f.key ? '#1a56db' : 'transparent',
                  color: stateFilter === f.key ? '#fff' : '#4a6fa5',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3 py-2" style={{ background: '#fff', border: '1.5px solid #bfd3f5' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar asignatura..."
              className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#1e3a5f' }}
            />
          </div>

          {/* Botón nueva */}
          {!readOnly && (
            <button
              onClick={handleOpenCreate}
              className="app-btn flex items-center gap-2 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', whiteSpace: 'nowrap' }}
            >
              <Plus className="w-4 h-4" />
              <span>Nueva asignatura</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="app-empty-panel py-12">
            <p className="text-gray-600">Cargando asignaturas...</p>
          </div>
        ) : error ? (
          <div className="app-alert app-alert--error mb-6">
            <p>{error}</p>
          </div>
        ) : asignaturas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">{isDocenteMode ? 'No hay asignaturas asignadas disponibles.' : 'No hay asignaturas disponibles todavía.'}</p>
            <p className="mt-2 text-sm text-slate-500">{isDocenteMode ? 'Cuando se te asigne un asignatura podrás continuar con temas, subtemas y contenidos.' : 'El registro del primer asignatura habilita la organización de temas, subtemas y contenidos.'}</p>
          </div>
        ) : filteredAsignaturas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p className="text-base text-slate-600">Sin resultados para la búsqueda actual.</p>
            <p className="mt-2 text-sm text-slate-500">Modifique el nombre o el estado visible del catálogo para ampliar el resultado.</p>
          </div>
        ) : (
          <div className="app-card-grid">
            {filteredAsignaturas.map((Asignatura) => {
              const AsignaturaIsActive = isAsignaturaActive(Asignatura);
              const pillarLabel = Asignatura.es_asignatura_pilar && Asignatura.tipo_pilar
                ? PILLAR_OPTIONS.find(o => o.value === Asignatura.tipo_pilar)?.label || Asignatura.tipo_pilar
                : null;
              return (
                <div
                  key={Asignatura.id}
                  className={`app-list-card cursor-pointer flex flex-col ${AsignaturaIsActive ? '' : 'opacity-70'}`}
                  style={{ position: 'relative' }}
                  onClick={() => onSelectAsignatura(Asignatura.id, Asignatura.nombre)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectAsignatura(Asignatura.id, Asignatura.nombre); } }}
                >
                  {/* Badge estado — esquina superior derecha */}
                  <span
                    style={{
                      position: 'absolute', top: '12px', right: '12px',
                      fontSize: '11px', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '999px',
                      ...(AsignaturaIsActive
                        ? { background: '#dbeafe', color: '#1a56db' }
                        : { background: '#fef3c7', color: '#92400e' })
                    }}
                  >
                    {AsignaturaIsActive ? 'Activa' : 'Inhabilitada'}
                  </span>

                  {/* Nombre */}
                  <h3 className="app-list-card__title mb-1 pr-16">{Asignatura.nombre}</h3>

                  {/* Descripción corta */}
                  <p className="app-list-card__description flex-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {Asignatura.descripcion || 'Sin descripción.'}
                  </p>

                  {/* Footer: Editar + Inhabilitar */}
                  {!readOnly && (
                    <div
                      className="flex items-center gap-2 mt-3 pt-3"
                      style={{ borderTop: '1px solid #e2e8f0' }}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                      role="presentation"
                    >
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleOpenEdit(Asignatura); }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: '#dbeafe', color: '#1a56db' }}
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleToggleAsignatura(Asignatura); }}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={AsignaturaIsActive
                          ? { background: '#fef2f2', color: '#b91c1c' }
                          : { background: '#ecfdf5', color: '#047857' }}
                      >
                        {AsignaturaIsActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {AsignaturaIsActive ? 'Inhabilitar' : 'Habilitar'}
                      </button>
                    </div>
                  )}
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
                <div className="app-modal-kicker">Asignaturas</div>
                <h3 className="app-modal-title">{editingasignaturaId !== null ? 'Editar asignatura' : 'Crear nueva asignatura'}</h3>
                <p className="app-modal-description">Define el nombre, la descripción y si el asignatura pertenece a una de las tres asignaturas principales.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="app-modal-close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="app-modal-scroll">
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {formError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '10px', fontSize: '14px' }}>
                    {formError}
                  </div>
                )}

                {/* Nombre */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="app-form-input"
                    placeholder="Ej: Fundamentos de Programación"
                    style={{ fontSize: '15px', fontWeight: 500 }}
                    required
                  />
                </div>

                {/* Descripción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    className="app-form-textarea"
                    placeholder="Descripción breve de la asignatura..."
                    rows={5}
                    style={{ fontSize: '14px', minHeight: '120px' }}
                  />
                </div>

                {/* Progresión secuencial */}
                <label
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #bfd3f5', background: formData.progresionSecuencial ? '#f0f5ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <input
                    type="checkbox"
                    checked={formData.progresionSecuencial}
                    onChange={e => setFormData(prev => ({ ...prev, progresionSecuencial: e.target.checked }))}
                    style={{ marginTop: '2px', accentColor: '#1a56db', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#1e3a5f' }}>Progresión secuencial</span>
                    <span style={{ display: 'block', fontSize: '12.5px', color: '#4a6fa5', marginTop: '3px', lineHeight: 1.5 }}>
                      Los estudiantes deben completar en orden cada tema, subtema y contenido.
                    </span>
                  </span>
                </label>

                {/* Asignatura principal */}
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #bfd3f5', background: formData.esAsignaturaPilar ? '#f0f5ff' : '#fff', cursor: !editingasignaturaId && allPillarsTaken ? 'not-allowed' : 'pointer', opacity: !editingasignaturaId && allPillarsTaken ? 0.6 : 1 }}
                >
                  <input
                    type="checkbox"
                    checked={formData.esAsignaturaPilar}
                    disabled={!editingasignaturaId && allPillarsTaken}
                    onChange={e => setFormData(prev => ({ ...prev, esAsignaturaPilar: e.target.checked, tipoPilar: e.target.checked ? prev.tipoPilar : '' }))}
                    style={{ accentColor: '#1a56db', width: '16px', height: '16px', flexShrink: 0 }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e3a5f' }}>
                    Marcar como asignatura principal
                    {!editingasignaturaId && allPillarsTaken && <span style={{ fontWeight: 400, color: '#4a6fa5', fontSize: '12px' }}> — ya existen las tres principales</span>}
                  </span>
                </label>

                {/* Tipo pilar */}
                {formData.esAsignaturaPilar && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a5f' }}>Tipo de asignatura principal *</label>
                    <select
                      value={formData.tipoPilar}
                      onChange={e => setFormData(prev => ({ ...prev, tipoPilar: e.target.value as '' | PillarType }))}
                      className="app-form-select"
                    >
                      <option value="">Selecciona el tipo</option>
                      {PILLAR_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} disabled={usedPillarTypes.has(o.value) && o.value !== formData.tipoPilar}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff' }}>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsignatura}
                disabled={submitting || !formData.nombre.trim()}
                style={{ padding: '10px 24px', borderRadius: '10px', background: submitting || !formData.nombre.trim() ? '#6b8fc8' : 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: submitting || !formData.nombre.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submitting && <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />}
                {submitting ? (editingasignaturaId !== null ? 'Actualizando...' : 'Guardando...') : (editingasignaturaId !== null ? 'Actualizar asignatura' : 'Crear asignatura')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
