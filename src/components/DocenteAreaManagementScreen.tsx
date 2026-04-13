import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Plus, Pencil, Search, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface DocenteAreaManagementScreenProps {
  onBack: () => void;
  docenteId: number;
  areaId: number;
  areaNombre?: string;
}

interface AreaOption {
  id: number;
  nombre: string;
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
  estado?: boolean;
}

interface Contenido {
  id: string;
  titulo: string;
  tipo: 'video' | 'document' | 'activity';
  descripcion?: string;
  url?: string;
  tema_id?: number;
  subtema_id?: number;
  estado?: boolean;
}

interface ContenidoForm {
  titulo: string;
  tipo: 'video' | 'document' | 'activity';
  descripcion: string;
  url: string;
}

export function DocenteAreaManagementScreen({ onBack, docenteId, areaId, areaNombre }: DocenteAreaManagementScreenProps) {
  const [availableAreas, setAvailableAreas] = useState<AreaOption[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Record<number, Subtema[]>>({});
  const [expandedTemas, setExpandedTemas] = useState<Record<number, boolean>>({});
  const [loadingTemas, setLoadingTemas] = useState(true);
  const [searchTemaTerm, setSearchTemaTerm] = useState('');
  const [temaStateFilter, setTemaStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
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

  // Contenido management
  const [contenidos, setContenidos] = useState<Record<number, Contenido[]>>({});
  const [loadingContenidos, setLoadingContenidos] = useState<Record<number, boolean>>({});
  const [showContenidoModal, setShowContenidoModal] = useState(false);
  const [editingContenido, setEditingContenido] = useState<Contenido | null>(null);
  const [activeSubtemaId, setActiveSubtemaId] = useState<number | null>(null);
  const [expandedSubtemas, setExpandedSubtemas] = useState<Record<number, boolean>>({});
  const [contenidoForm, setContenidoForm] = useState<ContenidoForm>({
    titulo: '',
    tipo: 'video',
    descripcion: '',
    url: ''
  });

  // Rich text editor refs
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  const headers = useMemo(() => {
    const personaId = localStorage.getItem('personaId') || localStorage.getItem('userId') || '';

    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-docente-id': String(docenteId),
      ...(selectedAreaId ? { 'x-area-id': String(selectedAreaId) } : {}),
      ...(personaId ? { 'x-persona-id': String(personaId) } : {})
    };
  }, [docenteId, selectedAreaId]);

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

  const loadAvailableAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/areas/mis-areas`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'Error al cargar áreas');
      }

      const areasResponse = Array.isArray(parsed.body) ? parsed.body : [];
      const normalizedAreas = areasResponse
        .map((area: any) => ({
          id: Number(area?.id),
          nombre: String(area?.nombre ?? '')
        }))
        .filter((area: AreaOption) => Number.isFinite(area.id) && area.nombre.trim().length > 0);

      if (normalizedAreas.length > 0) {
        setAvailableAreas(normalizedAreas);
        setSelectedAreaId((currentSelected) => {
          const exists = normalizedAreas.some((area) => area.id === currentSelected);
          return exists ? currentSelected : null;
        });
        return;
      }
    } catch {
      // fallback handled below
    }

    setAvailableAreas([{ id: areaId, nombre: areaNombre || `Área ${areaId}` }]);
    setSelectedAreaId(null);
  };

  const loadTemas = async () => {
    if (!selectedAreaId) {
      setTemas([]);
      setLoadingTemas(false);
      return;
    }

    setLoadingTemas(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/temas`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'Error al cargar temas');
      }
      const temasData = Array.isArray(parsed.body) ? parsed.body : [];
      setTemas(temasData.filter((tema: Tema) => Number(tema.area_id) === Number(selectedAreaId)));
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
      const response = await fetch(`${API_BASE_URL}/subtemas`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'Error al cargar subtemas');
      }
      const subtemasData = Array.isArray(parsed.body) ? parsed.body : [];
      setSubtemas((prev) => ({
        ...prev,
        [temaId]: subtemasData.filter((subtema: Subtema) => Number(subtema.tema_id) === Number(temaId))
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar subtemas');
    } finally {
      setLoadingSubtemas((prev) => ({ ...prev, [temaId]: false }));
    }
  };

  useEffect(() => {
    loadAvailableAreas();
  }, [docenteId]);

  useEffect(() => {
    setExpandedTemas({});
    setExpandedSubtemas({});
    setSubtemas({});
    setContenidos({});
    setSearchTemaTerm('');
    loadTemas();
  }, [selectedAreaId]);

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
        area_id: selectedAreaId
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

  const handleToggleTemaEstado = async (tema: Tema) => {
    const currentlyActive = tema.estado !== false;
    if (!window.confirm(`Deseas ${currentlyActive ? 'inhabilitar' : 'habilitar'} el tema ${tema.nombre}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/temas/${tema.id}/toggle-estado`, {
        method: 'PUT',
        headers
      });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo cambiar el estado del tema');
      }
      await loadTemas();
      setSuccess(`Tema ${currentlyActive ? 'inhabilitado' : 'habilitado'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del tema');
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

  const handleToggleSubtemaEstado = async (temaId: number, subtema: Subtema) => {
    const currentlyActive = subtema.estado !== false;
    if (!window.confirm(`Deseas ${currentlyActive ? 'inhabilitar' : 'habilitar'} el subtema ${subtema.nombre}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/subtemas/${subtema.id}/toggle-estado`, {
        method: 'PUT',
        headers
      });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || 'No se pudo cambiar el estado del subtema');
      }
      await loadSubtemas(temaId);
      setSuccess(`Subtema ${currentlyActive ? 'inhabilitado' : 'habilitado'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del subtema');
    }
  };

  // Contenido functions
  const loadContenidos = async (subtemaId: number) => {
    setLoadingContenidos((prev) => ({ ...prev, [subtemaId]: true }));
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/contenidos/subtema/${subtemaId}`, { headers });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || parsed.body?.message || 'Error al cargar contenidos');
      }
      setContenidos((prev) => ({ ...prev, [subtemaId]: Array.isArray(parsed.body) ? parsed.body : [] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contenidos');
    } finally {
      setLoadingContenidos((prev) => ({ ...prev, [subtemaId]: false }));
    }
  };

  const handleToggleSubtema = (subtemaId: number) => {
    setExpandedSubtemas((prev) => {
      const next = { ...prev, [subtemaId]: !prev[subtemaId] };
      return next;
    });
    if (!contenidos[subtemaId]) {
      loadContenidos(subtemaId);
    }
  };

  const handleOpenContenidoCreate = (subtemaId: number) => {
    setEditingContenido(null);
    setContenidoForm({ titulo: '', tipo: 'video', descripcion: '', url: '' });
    setActiveSubtemaId(subtemaId);
    setShowContenidoModal(true);
  };

  const handleOpenContenidoEdit = (contenido: Contenido) => {
    setEditingContenido(contenido);
    setContenidoForm({
      titulo: contenido.titulo || '',
      tipo: contenido.tipo,
      descripcion: contenido.descripcion || '',
      url: contenido.url || ''
    });
    setActiveSubtemaId(contenido.subtema_id || null);
    setShowContenidoModal(true);
  };

  const resolveTemaIdBySubtema = (subtemaId: number): number | null => {
    for (const [temaId, subtemasTema] of Object.entries(subtemas)) {
      if (subtemasTema.some((subtema) => subtema.id === subtemaId)) {
        return Number(temaId);
      }
    }
    return null;
  };

  const handleSaveContenido = async () => {
    if (!activeSubtemaId || !contenidoForm.titulo.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const descripcionHtml = quillRef.current ? quillRef.current.root.innerHTML : contenidoForm.descripcion;
      const temaId = editingContenido?.tema_id || resolveTemaIdBySubtema(activeSubtemaId);

      if (!temaId) {
        throw new Error('No se pudo identificar el tema asociado al subtema seleccionado');
      }

      const payload = {
        titulo: contenidoForm.titulo.trim(),
        tipo: contenidoForm.tipo,
        descripcion: descripcionHtml,
        url: contenidoForm.url.trim(),
        tema_id: temaId,
        subtema_id: activeSubtemaId
      };

      const response = await fetch(
        `${API_BASE_URL}/contenidos${editingContenido ? `/${editingContenido.id}` : ''}`,
        {
          method: editingContenido ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || parsed.body?.message || 'No se pudo guardar el contenido');
      }

      const contenidoGuardado: Contenido = {
        id: String(
          parsed.body?.id ??
          parsed.body?.contenido?.id ??
          editingContenido?.id ??
          Date.now()
        ),
        titulo:
          parsed.body?.titulo ??
          parsed.body?.contenido?.titulo ??
          contenidoForm.titulo.trim(),
        tipo:
          parsed.body?.tipo ??
          parsed.body?.contenido?.tipo ??
          contenidoForm.tipo,
        descripcion:
          parsed.body?.descripcion ??
          parsed.body?.contenido?.descripcion ??
          descripcionHtml,
        url:
          parsed.body?.url ??
          parsed.body?.contenido?.url ??
          contenidoForm.url.trim(),
        tema_id: temaId,
        subtema_id: activeSubtemaId
      };

      setContenidos((prev) => {
        const listaActual = prev[activeSubtemaId] || [];
        const listaNueva = editingContenido
          ? listaActual.map((item) =>
              String(item.id) === String(contenidoGuardado.id) ? contenidoGuardado : item
            )
          : [contenidoGuardado, ...listaActual];

        return {
          ...prev,
          [activeSubtemaId]: listaNueva
        };
      });

      setExpandedSubtemas((prev) => ({ ...prev, [activeSubtemaId]: true }));

      setShowContenidoModal(false);
      setEditingContenido(null);
      setContenidoForm({ titulo: '', tipo: 'video', descripcion: '', url: '' });
      if (quillRef.current) {
        quillRef.current.root.innerHTML = '';
      }
      await loadContenidos(activeSubtemaId);
      setSuccess(editingContenido ? 'Contenido actualizado' : 'Contenido creado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar contenido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleContenidoEstado = async (contenido: Contenido) => {
    const currentlyActive = contenido.estado !== false;
    if (!window.confirm(`Deseas ${currentlyActive ? 'inhabilitar' : 'habilitar'} el contenido "${contenido.titulo}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/contenidos/${contenido.id}/toggle-estado`, {
        method: 'PUT',
        headers
      });
      const parsed = await parseResponse(response);
      if (!parsed.ok) {
        throw new Error(parsed.body?.mensaje || parsed.body?.message || 'No se pudo cambiar el estado del contenido');
      }

      const subtemaId = contenido.subtema_id || activeSubtemaId;
      if (subtemaId) {
        await loadContenidos(subtemaId);
      }

      setSuccess(`Contenido ${currentlyActive ? 'inhabilitado' : 'habilitado'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el estado del contenido');
    }
  };

  const getTypeIcon = (tipo: Contenido['tipo']) => {
    switch (tipo) {
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      case 'activity':
        return '🧠';
      default:
        return '📦';
    }
  };

  useEffect(() => {
    if (showContenidoModal && editorRef.current && !quillRef.current && (window as any).Quill) {
      const Quill = (window as any).Quill;

      try {
        const FontStyle = Quill.import('attributors/style/font');
        FontStyle.whitelist = ['Arial', 'Monospace', 'Algerian'];
        Quill.register(FontStyle, true);
      } catch (err) {
        console.warn('Quill format registration failed', err);
      }

      editorRef.current.innerHTML = '';
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Ingrese la descripción del contenido',
        modules: {
          toolbar: [
            [{ font: ['Arial', 'Monospace', 'Algerian'] }],
            [{ size: ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['link', 'image', 'video'],
            ['clean']
          ]
        }
      });

      quillRef.current.format('size', '14px');

      const initialHtml = editingContenido ? (editingContenido.descripcion || '') : (contenidoForm.descripcion || '');
      quillRef.current.root.innerHTML = initialHtml;
      setContenidoForm((prev) => ({ ...prev, descripcion: initialHtml }));

      quillRef.current.on('text-change', () => {
        setContenidoForm((prev) => ({ ...prev, descripcion: quillRef.current.root.innerHTML }));
      });
    }

    return () => {
      if (!showContenidoModal && quillRef.current) {
        if (editorRef.current) editorRef.current.innerHTML = '';
        quillRef.current = null;
      }
    };
  }, [showContenidoModal, editingContenido]);

  const temaFormValid = temaForm.nombre.trim().length > 0;
  const subtemaFormValid = subtemaForm.nombre.trim().length > 0;
  const filteredTemas = temas.filter((tema) => {
    const matchesName = tema.nombre.toLowerCase().includes(searchTemaTerm.toLowerCase().trim());
    const matchesState =
      temaStateFilter === 'all' ||
      (temaStateFilter === 'active' ? tema.estado !== false : tema.estado === false);

    return matchesName && matchesState;
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Áreas - Subtemas - Contenidos</h1>
                <p className="text-gray-500 text-sm">Panel de Docente - EduPath</p>
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

        <div className="app-info-banner mb-8 p-6">
          <h2 className="text-lg font-bold mb-2">Gestión de Contenido Educativo</h2>
          <p className="text-sm opacity-95">
            Selecciona un tema para gestionar sus subtemas y contenidos. Desde aquí podrás organizar la estructura completa
            de aprendizaje, definir el orden de los subtemas y asignar materiales educativos a cada tema.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#3A4A5B] text-xl">Temas académicos</h2>
            <p className="text-gray-500 text-sm">Selecciona un área para ver y gestionar sus temas.</p>
          </div>
          <button
            onClick={handleOpenTemaCreate}
            className="app-btn app-primary-btn px-5 py-2.5"
            disabled={!selectedAreaId}
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

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
            Seleccionar área
          </label>
          <select
            value={selectedAreaId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedAreaId(value ? Number(value) : null);
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
          >
            <option value="">Selecciona un área</option>
            {availableAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.nombre}
              </option>
            ))}
          </select>
        </div>

        {selectedAreaId && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
              Filtrar temas por nombre
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTemaTerm}
                onChange={(event) => setSearchTemaTerm(event.target.value)}
                placeholder="Escribe el nombre del tema..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              />
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setTemaStateFilter('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  temaStateFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'app-btn-secondary text-gray-700'
                }`}
              >
                Todos ({temas.length})
              </button>
              <button
                onClick={() => setTemaStateFilter('active')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  temaStateFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'app-btn-secondary text-gray-700'
                }`}
              >
                Activos ({temas.filter((tema) => tema.estado !== false).length})
              </button>
              <button
                onClick={() => setTemaStateFilter('inactive')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  temaStateFilter === 'inactive'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'app-btn-secondary text-gray-700'
                }`}
              >
                Inactivos ({temas.filter((tema) => tema.estado === false).length})
              </button>
            </div>
          </div>
        )}

        {!selectedAreaId ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">Selecciona un área para ver los temas y habilitar el filtro por nombre.</p>
          </div>
        ) : loadingTemas ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando temas...</p>
          </div>
        ) : temas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No hay temas creados para esta area.</p>
          </div>
        ) : filteredTemas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No se encontraron temas con el filtro aplicado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemas.map((tema) => {
              const isExpanded = expandedTemas[tema.id];
              const temaSubtemas = subtemas[tema.id] || [];
              const subtemaLoading = loadingSubtemas[tema.id];

              return (
                <div key={tema.id} className={`bg-white rounded-2xl shadow-md overflow-hidden ${tema.estado === false ? 'opacity-75 saturate-50' : ''}`}>
                  <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold text-white">{tema.nombre}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tema.estado !== false ? 'bg-white/20 text-white' : 'bg-black/20 text-white'
                        }`}>
                          {tema.estado !== false ? 'Activo' : 'Inhabilitado'}
                        </span>
                      </div>
                      <p className="text-white/90 text-sm">{tema.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenTemaEdit(tema)}
                        className="app-btn mt-1 bg-white/20 px-3 py-1.5 text-white hover:bg-white/30"
                      >
                        <Pencil className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleTemaEstado(tema)}
                        className="app-btn mt-1 bg-white/20 px-3 py-1.5 text-white hover:bg-white/30"
                      >
                        {tema.estado !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{tema.estado !== false ? 'Inhabilitar' : 'Habilitar'}</span>
                      </button>
                      <button
                        onClick={() => handleToggleTema(tema.id)}
                        className="app-btn mt-1 bg-white/20 px-3 py-1.5 text-white hover:bg-white/30"
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
                          className="flex items-center gap-2 text-[#4A90E2] hover:text-[#357ABD] text-sm"
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
                            <div key={subtema.id} className={`rounded-lg border border-gray-200 overflow-hidden ${subtema.estado === false ? 'opacity-70 saturate-50' : ''}`}>
                              <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-[#3A4A5B]">{subtema.nombre}</p>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                      subtema.estado !== false
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {subtema.estado !== false ? 'Activo' : 'Inhabilitado'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">{subtema.descripcion || 'Sin descripcion'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleSubtema(subtema.id)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    {expandedSubtemas[subtema.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    <span>{expandedSubtemas[subtema.id] ? 'Ocultar' : 'Contenido'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenSubtemaEdit(tema.id, subtema)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleSubtemaEstado(tema.id, subtema)}
                                    className={`flex items-center gap-1 text-xs ${
                                      subtema.estado !== false ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'
                                    }`}
                                  >
                                    {subtema.estado !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    <span>{subtema.estado !== false ? 'Inhabilitar' : 'Habilitar'}</span>
                                  </button>
                                </div>
                              </div>

                              {expandedSubtemas[subtema.id] && (
                                <div className="border-t border-gray-200 px-4 py-4 bg-white space-y-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-xs font-semibold text-gray-700">Contenidos</h5>
                                    <button
                                      onClick={() => handleOpenContenidoCreate(subtema.id)}
                                      className="flex items-center gap-1 text-[#4A90E2] hover:text-[#357ABD] text-xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Agregar contenido</span>
                                    </button>
                                  </div>

                                  {loadingContenidos[subtema.id] ? (
                                    <p className="text-xs text-gray-500">Cargando contenidos...</p>
                                  ) : (contenidos[subtema.id] || []).length === 0 ? (
                                    <p className="text-xs text-gray-500">No hay contenidos en este subtema.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {(contenidos[subtema.id] || []).map((contenido) => (
                                        <div key={contenido.id} className={`flex items-start justify-between border rounded-lg px-4 py-3 ${contenido.estado !== false ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-lg">{getTypeIcon(contenido.tipo)}</span>
                                              <p className="text-xs font-medium text-[#3A4A5B] truncate">{contenido.titulo}</p>
                                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                contenido.estado !== false
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : 'bg-amber-100 text-amber-700'
                                              }`}>
                                                {contenido.estado !== false ? 'Activo' : 'Inhabilitado'}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-600 line-clamp-2">{contenido.descripcion?.replace(/<[^>]*>/g, '') || 'Sin descripcion'}</p>
                                            {contenido.url && (
                                              <p className="text-xs text-blue-600 truncate mt-1">🔗 {contenido.url}</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                            <button
                                              onClick={() => handleOpenContenidoEdit(contenido)}
                                              className="text-blue-600 hover:text-blue-700"
                                              title="Editar contenido"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => handleToggleContenidoEstado(contenido)}
                                              className={contenido.estado !== false ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'}
                                              title={contenido.estado !== false ? 'Inhabilitar contenido' : 'Habilitar contenido'}
                                            >
                                              {contenido.estado !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
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
                  className="text-sm text-[#4A90E2]"
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
                className="app-btn app-primary-btn px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="app-btn app-primary-btn px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : editingSubtema ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContenidoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-[1640px] max-w-[80%] max-h-[90vh] overflow-auto relative" style={{ borderLeft: '6px solid rgba(74,144,226,0.08)', width: 1640, maxWidth: '95%', maxHeight: '90vh' }}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: 'linear-gradient(90deg, rgba(74,144,226,0.12), rgba(74,144,226,0.06))' }} />
            <div className="flex items-center justify-between mb-6 pt-2">
              <h2 className="text-2xl font-bold text-[#3A4A5B]">
                {editingContenido ? 'Editar Contenido' : 'Crear Nuevo Contenido'}
              </h2>
              <button
                onClick={() => {
                  setShowContenidoModal(false);
                  setEditingContenido(null);
                  setContenidoForm({ titulo: '', tipo: 'video', descripcion: '', url: '' });
                  if (quillRef.current) {
                    quillRef.current.root.innerHTML = '';
                  }
                }}
                className="text-gray-400 hover:text-[#4A90E2] text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={contenidoForm.titulo}
                  onChange={(event) => setContenidoForm({ ...contenidoForm, titulo: event.target.value })}
                  placeholder="Ingrese el título del contenido"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
              </div>

              {/* Descripción (editor enriquecido) */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Descripción *
                </label>
                <div className="quill-editor-container">
                  <div
                    ref={editorRef}
                    className="w-full"
                    data-placeholder="Ingrese la descripción del contenido"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={contenidoForm.url}
                  onChange={(event) => setContenidoForm({ ...contenidoForm, url: event.target.value })}
                  placeholder="https://ejemplo.com/contenido"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
              </div>

              {/* Tipo de Contenido */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Tipo de Contenido *
                </label>
                <select
                  value={contenidoForm.tipo}
                  onChange={(event) => setContenidoForm({ ...contenidoForm, tipo: event.target.value as 'video' | 'document' | 'activity' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                >
                  <option value="video">Videos</option>
                  <option value="document">Documento</option>
                  <option value="activity">Explicación</option>
                </select>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowContenidoModal(false);
                    setEditingContenido(null);
                    setContenidoForm({ titulo: '', tipo: 'video', descripcion: '', url: '' });
                    if (quillRef.current) {
                      quillRef.current.root.innerHTML = '';
                    }
                  }}
                  disabled={submitting}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveContenido}
                  disabled={submitting || !contenidoForm.titulo.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span>{editingContenido ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingContenido ? 'Actualizar Contenido' : 'Crear Contenido'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
