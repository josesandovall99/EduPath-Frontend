import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, EyeOff, Eye, Loader, Plus, Search, X } from 'lucide-react';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface Tema {
  id: number;
  nombre: string;
  descripcion?: string;
  asignatura_id: number;
  estado?: boolean;
}

interface TemasManagementScreenProps {
  onNavigateToBreadcrumb?: (index: number) => void;
  asignaturaId: number;
  asignaturaName: string;
  onBack: () => void;
  onHome?: () => void;
  onSelectTema: (temaId: number, temaName: string) => void;
  mode?: 'admin' | 'docente';
}

export function TemasManagementScreen({ asignaturaId, asignaturaName, onBack, onHome, onSelectTema, onNavigateToBreadcrumb, mode = 'admin' }: TemasManagementScreenProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isDocenteMode = mode === 'docente';

  useEffect(() => { loadTemas(); }, [asignaturaId]);

  useEffect(() => {
    const id = window.setInterval(loadTemas, 120000);
    return () => window.clearInterval(id);
  }, [asignaturaId]);

  const loadTemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/temas/por-asignatura/${asignaturaId}`, {
        headers: buildAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error cargando temas');
      setTemas(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar temas');
      setTemas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTema = async (tema: Tema, e: React.MouseEvent) => {
    e.stopPropagation();
    const isActive = tema.estado !== false;
    const ok = window.confirm(`¿Deseas ${isActive ? 'inhabilitar' : 'habilitar'} el tema "${tema.nombre}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/temas/${tema.id}/toggle-estado`, {
        method: 'PUT',
        headers: buildAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cambiar estado');
      const updated = await res.json();
      setTemas(prev => prev.map(t => t.id === tema.id ? { ...t, estado: updated.estado ?? !isActive } : t));
    } catch (err) {
      console.error('Error toggling tema:', err);
    }
  };

  const openCreate = () => {
    setEditingTema(null);
    setFormData({ nombre: '', descripcion: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (tema: Tema, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTema(tema);
    setFormData({ nombre: tema.nombre, descripcion: tema.descripcion || '' });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = { nombre: formData.nombre.trim(), descripcion: formData.descripcion.trim(), asignatura_id: asignaturaId };
      let res: Response;
      if (editingTema) {
        res = await fetch(`${API_BASE_URL}/temas/${editingTema.id}`, {
          method: 'PUT',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/temas`, {
          method: 'POST',
          headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.mensaje || 'Error al guardar');
      }
      setShowModal(false);
      await loadTemas();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTemas   = temas.filter(t => t.estado !== false).length;
  const inactiveTemas = temas.length - activeTemas;

  const filteredTemas = temas.filter(t => {
    const matchName  = t.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchState = stateFilter === 'all' || (stateFilter === 'active' ? t.estado !== false : t.estado === false);
    return matchName && matchState;
  });

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
                  Temas de la asignatura
                </p>
                <h1 className="leading-tight">{asignaturaName}</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Volver */}
        <button onClick={onBack} className="app-back-button mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(0) : onHome}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {isDocenteMode ? 'Panel docente' : 'Panel admin'}
          </button>
          <span style={{ color: '#bfd3f5' }}>→</span>
          <button type="button" onClick={onBack} className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {asignaturaName}
          </button>
          <span style={{ color: '#bfd3f5' }}>→</span>
          <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
            Temas
          </span>
        </nav>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Filtros */}
          <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: '#e8eef8', height: '40px' }}>
            {[
              { key: 'all',      label: `Todos (${temas.length})` },
              { key: 'active',   label: `Activos (${activeTemas})` },
              { key: 'inactive', label: `Inactivos (${inactiveTemas})` },
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
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar tema..." className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#1e3a5f' }} />
          </div>

          {/* Nuevo */}
          {!isDocenteMode && (
            <button onClick={openCreate}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', whiteSpace: 'nowrap', height: '40px' }}>
              <Plus className="w-4 h-4" />
              Nuevo tema
            </button>
          )}
        </div>

        {/* Estados */}
        {loading ? (
          <div className="app-empty-panel py-12 flex flex-col items-center gap-3">
            <Loader className="w-7 h-7 animate-spin" style={{ color: '#1a56db' }} />
            <p style={{ color: '#4a6fa5' }}>Cargando temas...</p>
          </div>
        ) : error ? (
          <div className="app-alert app-alert--error mb-4">
            <p>{error}</p>
            <button onClick={loadTemas} className="app-btn app-btn-sm" style={{ background: '#dbeafe', color: '#1a56db' }}>Reintentar</button>
          </div>
        ) : temas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p style={{ color: '#4a6fa5' }}>No hay temas registrados para esta asignatura.</p>
          </div>
        ) : filteredTemas.length === 0 ? (
          <div className="app-empty-panel py-12">
            <p style={{ color: '#4a6fa5' }}>Sin resultados para la búsqueda.</p>
          </div>
        ) : (
          /* Grid 5 columnas */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {filteredTemas.map(tema => {
              const isActive = tema.estado !== false;
              return (
                <div key={tema.id}
                  onClick={() => onSelectTema(tema.id, tema.nombre)}
                  className="app-list-card cursor-pointer flex flex-col"
                  style={{ position: 'relative', padding: '14px' }}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTema(tema.id, tema.nombre); } }}
                >
                  {/* Badge — esquina superior derecha */}
                  <span style={{
                    position: 'absolute', top: '10px', right: '10px',
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                    ...(isActive ? { background: '#dbeafe', color: '#1a56db' } : { background: '#fef3c7', color: '#b45309' })
                  }}>
                    {isActive ? 'Activo' : 'Inhabilitado'}
                  </span>

                  {/* Nombre */}
                  <p className="flex-1" style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.4, marginBottom: '6px', paddingRight: '52px' }}>
                    {tema.nombre}
                  </p>

                  {/* Descripción */}
                  <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {tema.descripcion || 'Sin descripción.'}
                  </p>

                  {/* Footer */}
                  {!isDocenteMode && (
                    <div className="flex items-center gap-2 mt-3 pt-3"
                      style={{ borderTop: '1px solid #e2e8f0' }}
                      onClick={e => e.stopPropagation()} role="presentation">
                      <button type="button" onClick={e => openEdit(tema, e)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: '#dbeafe', color: '#1a56db' }}>
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </button>
                      <button type="button" onClick={e => handleToggleTema(tema, e)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
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
      </main>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: '440px', background: '#fff' }}
            onClick={e => e.stopPropagation()}>
            {/* Cabecera azul */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Temas</p>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                  {editingTema ? 'Editar tema' : 'Nuevo tema'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', lineHeight: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Nombre *</label>
                <input type="text" value={formData.nombre}
                  onChange={e => setFormData(p => ({ ...p, nombre: e.target.value }))}
                  className="app-form-input" placeholder="Nombre del tema"
                  style={{ fontSize: '14px', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Descripción</label>
                <textarea value={formData.descripcion}
                  onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
                  className="app-form-textarea" placeholder="Descripción breve del tema..." rows={3}
                  style={{ fontSize: '13px', minHeight: '80px' }} />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff' }}>
              <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={submitting || !formData.nombre.trim()}
                style={{ padding: '9px 22px', borderRadius: '10px', background: submitting || !formData.nombre.trim() ? '#6b8fc8' : 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: submitting || !formData.nombre.trim() ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Guardando...' : editingTema ? 'Actualizar' : 'Crear tema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
