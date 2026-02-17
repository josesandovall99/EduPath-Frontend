import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Pencil, Trash2, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface DocenteAreaManagementScreenProps {
  onBack: () => void;
  docenteId: number;
  areaId: number;
  areaNombre?: string;
}

interface Tema {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  area_id: number;
}

interface Subtema {
  id: number;
  nombre: string;
  descripcion?: string;
  tema_id: number;
}

const API_BASE_URL = '/api';

export function DocenteAreaManagementScreen({ onBack, docenteId, areaId, areaNombre }: DocenteAreaManagementScreenProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Record<number, Subtema[]>>({});
  const [expandedTemas, setExpandedTemas] = useState<Record<number, boolean>>({});
  const [loadingTemas, setLoadingTemas] = useState(true);
  const [loadingSubtemas, setLoadingSubtemas] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showTemaModal, setShowTemaModal] = useState(false);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [temaForm, setTemaForm] = useState({ nombre: '', descripcion: '', estado: true });
  const [showSubtemaModal, setShowSubtemaModal] = useState(false);
  const [editingSubtema, setEditingSubtema] = useState<Subtema | null>(null);
  const [subtemaForm, setSubtemaForm] = useState({ nombre: '', descripcion: '' });
  const [activeTemaId, setActiveTemaId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headers = useMemo(() => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-docente-id': String(docenteId)
  }), [docenteId]);

  const parseResponse = async (response: Response) => {
    const text = await response.text();
    let body: any = undefined;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { mensaje: text };
      }
    }
    return { ok: response.ok, status: response.status, body };
  };

  const loadTemas = async () => {
    setLoadingTemas(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/temas/por-area/${areaId}`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'Error al cargar temas');
      }
      setTemas(Array.isArray(parsed.body) ? parsed.body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar temas');
    } finally {
      setLoadingTemas(false);
    }
  };

  const loadSubtemas = async (temaId: number) => {
    setLoadingSubtemas((prev) => ({ ...prev, [temaId]: true }));
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/subtemas/por-tema/${temaId}`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'Error al cargar subtemas');
      }
      setSubtemas((prev) => ({ ...prev, [temaId]: Array.isArray(parsed.body) ? parsed.body : [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar subtemas');
    } finally {
      setLoadingSubtemas((prev) => ({ ...prev, [temaId]: false }));
    }
  };

  useEffect(() => {
    loadTemas();
  }, [areaId]);

  const handleToggleTema = (temaId: number) => {
    setExpandedTemas((prev) => {
      const next = { ...prev, [temaId]: !prev[temaId] };
      return next;
    });
    if (!subtemas[temaId]) {
      loadSubtemas(temaId);
    }
  };

  const handleOpenTemaCreate = () => {
    setEditingTema(null);
    setTemaForm({ nombre: '', descripcion: '', estado: true });
    setShowTemaModal(true);
  };

  const handleOpenTemaEdit = (tema: Tema) => {
    setEditingTema(tema);
    setTemaForm({
      nombre: tema.nombre || '',
      descripcion: tema.descripcion || '',
      estado: tema.estado
    });
    setShowTemaModal(true);
  };

  const handleSaveTema = async () => {
    if (!temaForm.nombre.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        nombre: temaForm.nombre.trim(),
        descripcion: temaForm.descripcion.trim(),
        estado: temaForm.estado,
        area_id: areaId
      };

      const response = await fetch(
        `${API_BASE_URL}/temas${editingTema ? `/${editingTema.id}` : ''}`,
        {
          method: editingTema ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo guardar el tema');
      }

      setShowTemaModal(false);
      setEditingTema(null);
      await loadTemas();
      setSuccess(editingTema ? 'Tema actualizado' : 'Tema creado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar tema');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTema = async (tema: Tema) => {
    if (!window.confirm(`Deseas eliminar el tema ${tema.nombre}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/temas/${tema.id}`, {
        method: 'DELETE',
        headers
      });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo eliminar el tema');
      }
      await loadTemas();
      setSuccess('Tema eliminado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar tema');
    }
  };

  const handleOpenSubtemaCreate = (temaId: number) => {
    setEditingSubtema(null);
    setSubtemaForm({ nombre: '', descripcion: '' });
    setActiveTemaId(temaId);
    setShowSubtemaModal(true);
  };

  const handleOpenSubtemaEdit = (temaId: number, subtema: Subtema) => {
    setEditingSubtema(subtema);
    setSubtemaForm({
      nombre: subtema.nombre || '',
      descripcion: subtema.descripcion || ''
    });
    setActiveTemaId(temaId);
    setShowSubtemaModal(true);
  };

  const handleSaveSubtema = async () => {
    if (!activeTemaId || !subtemaForm.nombre.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        nombre: subtemaForm.nombre.trim(),
        descripcion: subtemaForm.descripcion.trim(),
        tema_id: activeTemaId
      };

      const response = await fetch(
        `${API_BASE_URL}/subtemas${editingSubtema ? `/${editingSubtema.id}` : ''}`,
        {
          method: editingSubtema ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo guardar el subtema');
      }

      setShowSubtemaModal(false);
      setEditingSubtema(null);
      await loadSubtemas(activeTemaId);
      setSuccess(editingSubtema ? 'Subtema actualizado' : 'Subtema creado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar subtema');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubtema = async (temaId: number, subtema: Subtema) => {
    if (!window.confirm(`Deseas eliminar el subtema ${subtema.nombre}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/subtemas/${subtema.id}`, {
        method: 'DELETE',
        headers
      });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo eliminar el subtema');
      }
      await loadSubtemas(temaId);
      setSuccess('Subtema eliminado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar subtema');
    }
  };

  const temaFormValid = temaForm.nombre.trim().length > 0;
  const subtemaFormValid = subtemaForm.nombre.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#14B8A6] to-[#2DD4BF] rounded-xl flex items-center justify-center p-2 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestion de area</h1>
                <p className="text-gray-500 text-sm">Administra temas y subtemas de tu area</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al panel</span>
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-[#3A4A5B]">Area asignada</h2>
            <p className="text-gray-500 text-sm">{areaNombre || `Area ${areaId}`}</p>
          </div>
          <button
            onClick={handleOpenTemaCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: '#14B8A6' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo tema</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {loadingTemas ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando temas...</p>
          </div>
        ) : temas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No hay temas creados para esta area.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {temas.map((tema) => {
              const isExpanded = expandedTemas[tema.id];
              const temaSubtemas = subtemas[tema.id] || [];
              const subtemaLoading = loadingSubtemas[tema.id];

              return (
                <div key={tema.id} className="bg-white rounded-2xl shadow-md">
                  <div className="flex items-center justify-between p-6">
                    <div>
                      <h3 className="text-lg font-semibold text-[#3A4A5B]">{tema.nombre}</h3>
                      <p className="text-gray-500 text-sm">{tema.descripcion || 'Sin descripcion'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenTemaEdit(tema)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTema(tema)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                      <button
                        onClick={() => handleToggleTema(tema.id)}
                        className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>{isExpanded ? 'Ocultar' : 'Subtemas'}</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Subtemas</h4>
                        <button
                          onClick={() => handleOpenSubtemaCreate(tema.id)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar subtema</span>
                        </button>
                      </div>

                      {subtemaLoading ? (
                        <p className="text-sm text-gray-500">Cargando subtemas...</p>
                      ) : temaSubtemas.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay subtemas en este tema.</p>
                      ) : (
                        <div className="space-y-3">
                          {temaSubtemas.map((subtema) => (
                            <div key={subtema.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-[#3A4A5B]">{subtema.nombre}</p>
                                <p className="text-xs text-gray-500">{subtema.descripcion || 'Sin descripcion'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleOpenSubtemaEdit(tema.id, subtema)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubtema(tema.id, subtema)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showTemaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">
                {editingTema ? 'Editar tema' : 'Crear tema'}
              </h3>
              <button
                onClick={() => setShowTemaModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={temaForm.nombre}
                  onChange={(event) => setTemaForm({ ...temaForm, nombre: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripcion</label>
                <textarea
                  rows={3}
                  value={temaForm.descripcion}
                  onChange={(event) => setTemaForm({ ...temaForm, descripcion: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado</p>
                  <p className="text-xs text-gray-500">Visible para estudiantes</p>
                </div>
                <button
                  onClick={() => setTemaForm({ ...temaForm, estado: !temaForm.estado })}
                  className="text-sm text-emerald-600"
                >
                  {temaForm.estado ? 'Habilitado' : 'Deshabilitado'}
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setShowTemaModal(false)}
                disabled={submitting}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTema}
                disabled={submitting || !temaFormValid}
                className="px-5 py-2 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#14B8A6' }}
              >
                {submitting ? 'Guardando...' : editingTema ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubtemaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">
                {editingSubtema ? 'Editar subtema' : 'Crear subtema'}
              </h3>
              <button
                onClick={() => setShowSubtemaModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={subtemaForm.nombre}
                  onChange={(event) => setSubtemaForm({ ...subtemaForm, nombre: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripcion</label>
                <textarea
                  rows={3}
                  value={subtemaForm.descripcion}
                  onChange={(event) => setSubtemaForm({ ...subtemaForm, descripcion: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setShowSubtemaModal(false)}
                disabled={submitting}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSubtema}
                disabled={submitting || !subtemaFormValid}
                className="px-5 py-2 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#14B8A6' }}
              >
                {submitting ? 'Guardando...' : editingSubtema ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
