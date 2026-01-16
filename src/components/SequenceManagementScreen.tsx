import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Area {
  id: number;
  nombre: string;
}

interface Tema {
  id: number;
  nombre: string;
  area_id: number;
}

interface Subtema {
  id: number;
  nombre: string;
  tema_id: number;
}

interface ContentItem {
  id: number;
  titulo: string;
  tipo: 'video' | 'document' | 'activity';
  descripcion?: string;
  area_id?: number;
  tema_id?: number;
  subtema_id?: number;
}

interface Sequence {
  id: number;
  contenido_origen_id: number;
  contenido_destino_id: number;
  descripcion?: string;
  estado: boolean;
  origen?: ContentItem;
  destino?: ContentItem;
}

interface SequenceManagementScreenProps {
  onBack: () => void;
}

export function SequenceManagementScreen({ onBack }: SequenceManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtros
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedTema, setSelectedTema] = useState('');
  const [selectedSubtema, setSelectedSubtema] = useState('');

  // Modal-specific filtros (no afectan los filtros de la pantalla)
  const [modalSelectedArea, setModalSelectedArea] = useState('');
  const [modalSelectedTema, setModalSelectedTema] = useState('');
  const [modalSelectedSubtema, setModalSelectedSubtema] = useState('');
  const [modalTemas, setModalTemas] = useState<Tema[]>([]);
  const [modalSubtemas, setModalSubtemas] = useState<Subtema[]>([]);
  const [modalContents, setModalContents] = useState<ContentItem[]>([]);

  const [formData, setFormData] = useState({
    contenido_origen_id: '',
    contenido_destino_id: '',
    descripcion: '',
    estado: true
  });

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [areasRes, contentsRes, sequencesRes] = await Promise.all([
        fetch('http://localhost:4000/areas'),
        fetch('http://localhost:4000/contenidos'),
        fetch('http://localhost:4000/secuencias-contenido')
      ]);

      if (!areasRes.ok || !contentsRes.ok || !sequencesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const areasData = await areasRes.json();
      const contentsData = await contentsRes.json();
      const sequencesData = await sequencesRes.json();

      setAreas(areasData);
      setContents(contentsData);
      setSequences(sequencesData);
    } catch (err) {
      console.error('Error en loadData:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Obtener temas filtrados por área
  // Ya están filtrados del backend, así que usarlos directamente
  const filteredTemas = temas;

  // Obtener subtemas filtrados por tema
  // Ya están filtrados del backend, así que usarlos directamente
  const filteredSubtemas = subtemas;

  // Obtener contenidos filtrados por área, tema y subtema
  const getFilteredContents = () => {
    return contents.filter(c => {
      if (selectedArea && Number(c.area_id) !== Number(selectedArea)) return false;
      if (selectedTema && Number(c.tema_id) !== Number(selectedTema)) return false;
      if (selectedSubtema && Number(c.subtema_id) !== Number(selectedSubtema)) return false;
      return true;
    });
  };

  // Obtener contenidos usados en secuencias
  const getUsedContents = () => {
    const used = {
      origin: new Set<number>(),
      destination: new Set<number>(),
      both: new Set<number>()
    };

    sequences.forEach(seq => {
      const isOrigin = sequences.some(s => s.contenido_origen_id === seq.contenido_origen_id);
      const isDestination = sequences.some(s => s.contenido_destino_id === seq.contenido_destino_id);
      
      if (isOrigin && isDestination && seq.contenido_origen_id === seq.contenido_destino_id) {
        used.both.add(seq.contenido_origen_id);
      } else {
        if (isOrigin) used.origin.add(seq.contenido_origen_id);
        if (isDestination) used.destination.add(seq.contenido_destino_id);
      }
    });

    return used;
  };

  // --- Modal-specific helpers to filtrar contenidos dentro del modal Crear Secuencia ---
  const getFilteredModalContents = () => {
    console.log('DEBUG: getFilteredModalContents filters:', { modalSelectedArea, modalSelectedTema, modalSelectedSubtema }, 'modalTemas:', modalTemas.map(t=>t.id), 'modalContents sample:', modalContents.slice(0,3).map(c=>({ id: c.id, titulo: c.titulo, tema_id: c.tema_id, subtema_id: c.subtema_id })));
    return modalContents.filter(c => {
      // Note: Contenido model doesn't include area_id, so when an area is selected
      // we filter by tema (themes belonging to that area) using modalTemas.
      if (modalSelectedArea) {
        const allowedTemaIds = modalTemas.map(t => Number(t.id));
        if (!allowedTemaIds.includes(Number(c.tema_id))) return false;
      }

      if (modalSelectedTema && Number(c.tema_id) !== Number(modalSelectedTema)) return false;
      if (modalSelectedSubtema && Number(c.subtema_id) !== Number(modalSelectedSubtema)) return false;
      return true;
    });
  };

  const getAvailableOriginModalContents = () => {
    const filtered = getFilteredModalContents();
    const used = getUsedContents();
    const available = filtered.filter(c => !used.both.has(c.id) && !used.origin.has(c.id));
    console.log('DEBUG: getAvailableOriginModalContents -> filteredCount:', filtered.length, 'availableCount:', available.length, 'used:', { origin: Array.from(used.origin), destination: Array.from(used.destination), both: Array.from(used.both) });
    return available;
  };

  const getAvailableDestinationModalContents = () => {
    const filtered = getFilteredModalContents();
    const used = getUsedContents();
    const available = filtered.filter(c => !used.both.has(c.id) && !used.destination.has(c.id));
    console.log('DEBUG: getAvailableDestinationModalContents -> filteredCount:', filtered.length, 'availableCount:', available.length, 'used:', { origin: Array.from(used.origin), destination: Array.from(used.destination), both: Array.from(used.both) });
    return available;
  };

  const handleModalFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'area') {
      setModalSelectedArea(value);
      setModalSelectedTema('');
      setModalSelectedSubtema('');
      setModalTemas([]);
      setModalSubtemas([]);
      // Al seleccionar un área, obtener los temas del backend y luego filtrar contenidos
      if (value) {
        try {
          const res = await fetch(`http://localhost:4000/temas/por-area/${value}`);
          if (!res.ok) throw new Error('Error cargando temas');
          const data = await res.json();
          setModalTemas(data);

          // Filtrar contenidos por tema perteneciente a la área seleccionada
          const temaIds = data.map((t: Tema) => Number(t.id));
          const filtered = contents.filter(c => temaIds.includes(Number(c.tema_id)));
          console.log('DEBUG: Filtrando modalContents por área -> temaIds:', temaIds, 'result:', filtered.map(fc => ({ id: fc.id, titulo: fc.titulo })));
          setModalContents(filtered);
        } catch (err) {
          console.error('Error cargando temas para modal:', err);
          setModalTemas([]);
          setModalContents([]);
        }
      } else {
        // Si deselecciona área, restaurar todos los contenidos
        setModalContents(contents);
      }

    } else if (filterType === 'tema') {
      setModalSelectedTema(value);
      setModalSelectedSubtema('');
      setModalSubtemas([]);

      // Filtrar contenidos por el tema seleccionado (y por área si aplica)
      if (value) {
        const filtered = contents.filter(c => Number(c.tema_id) === Number(value) && (!modalSelectedArea || modalTemas.some(t => Number(t.id) === Number(c.tema_id))));
        console.log('DEBUG: Filtrando modalContents por tema -> temaId:', value, 'result:', filtered.map(fc => ({ id: fc.id, titulo: fc.titulo })));
        setModalContents(filtered);

        try {
          const res = await fetch(`http://localhost:4000/subtemas/por-tema/${value}`);
          if (!res.ok) throw new Error('Error cargando subtemas');
          const data = await res.json();
          setModalSubtemas(data);
        } catch (err) {
          console.error('Error cargando subtemas para modal:', err);
          setModalSubtemas([]);
        }
      } else {
        // Si se deselecciona tema, restaurar según área
        if (modalSelectedArea) {
          const temaIds = modalTemas.map((t: Tema) => Number(t.id));
          setModalContents(contents.filter(c => temaIds.includes(Number(c.tema_id))));
        } else {
          setModalContents(contents);
        }
      }
    } else if (filterType === 'subtema') {
      setModalSelectedSubtema(value);

      if (value) {
        try {
          const url = `http://localhost:4000/contenidos/subtema/${value}`;
          console.log('Cargando contenidos para modal desde:', url);
          const res = await fetch(url);
          if (!res.ok) {
            const errorData = await res.text();
            console.error('Error response (modal contenidos by subtema):', errorData);
            throw new Error(`Error ${res.status}: ${res.statusText}`);
          }
          const data = await res.json();
          console.log('DEBUG: Respuesta /contenidos/subtema/:', res.status, res.statusText, 'items:', Array.isArray(data) ? data.length : 'not-array', data.slice ? data.map((d: any) => ({ id: d.id, titulo: d.titulo, subtema_id: d.subtema_id })) : data);
          setModalContents(data);
        } catch (err) {
          console.error('Error cargando contenidos por subtema (modal):', err);
          setModalContents([]);
        }
      } else {
        // Si se deselecciona el subtema, recargar según área/tema seleccionados
        setModalContents(contents.filter(c =>
          (!modalSelectedArea || Number(c.area_id) === Number(modalSelectedArea)) &&
          (!modalSelectedTema || Number(c.tema_id) === Number(modalSelectedTema))
        ));
      }
    }
  };

  // Filtrar contenidos disponibles para origen
  const getAvailableOriginContents = () => {
    const filtered = getFilteredContents();
    const used = getUsedContents();
    
    return filtered.filter(c => 
      !used.both.has(c.id) && !used.origin.has(c.id)
    );
  };

  // Filtrar contenidos disponibles para destino
  const getAvailableDestinationContents = () => {
    const filtered = getFilteredContents();
    const used = getUsedContents();
    
    return filtered.filter(c => 
      !used.both.has(c.id) && !used.destination.has(c.id)
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'estado') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'area') {
      setSelectedArea(value);
      setSelectedTema('');
      setSelectedSubtema('');
      
      // Cargar temas del área seleccionada
      if (value) {
        try {
          const url = `http://localhost:4000/temas/por-area/${value}`;
          console.log('Cargando temas desde:', url);
          const res = await fetch(url);
          console.log('Respuesta de temas:', res.status, res.statusText);
          if (!res.ok) {
            const errorData = await res.text();
            console.error('Error response:', errorData);
            throw new Error(`Error ${res.status}: ${res.statusText}`);
          }
          const data = await res.json();
          console.log('Temas cargados:', data);
          setTemas(data);
        } catch (err) {
          console.error('Error cargando temas:', err);
          setTemas([]);
        }
      } else {
        setTemas([]);
      }
    } else if (filterType === 'tema') {
      setSelectedTema(value);
      setSelectedSubtema('');
      
      // Cargar subtemas del tema seleccionado
      if (value) {
        try {
          const url = `http://localhost:4000/subtemas/por-tema/${value}`;
          console.log('Cargando subtemas desde:', url);
          const res = await fetch(url);
          console.log('Respuesta de subtemas:', res.status, res.statusText);
          if (!res.ok) {
            const errorData = await res.text();
            console.error('Error response:', errorData);
            throw new Error(`Error ${res.status}: ${res.statusText}`);
          }
          const data = await res.json();
          console.log('Subtemas cargados:', data);
          setSubtemas(data);
        } catch (err) {
          console.error('Error cargando subtemas:', err);
          setSubtemas([]);
        }
      } else {
        setSubtemas([]);
      }
    } else if (filterType === 'subtema') {
      setSelectedSubtema(value);
    }
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        contenido_origen_id: parseInt(formData.contenido_origen_id),
        contenido_destino_id: parseInt(formData.contenido_destino_id),
        descripcion: formData.descripcion || null,
        estado: formData.estado
      };

      const response = await fetch('http://localhost:4000/secuencias-contenido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Capturar el error específico del backend (prioridad: error > message)
        const errorMessage = data.error || data.message || 'Error al crear la secuencia';
        console.log('Validaciones realizadas:', data.validacionesRealizadas);
        throw new Error(errorMessage);
      }

      // Éxito - la respuesta puede venir en data.secuencia o directamente en data
      setSequences([...sequences, data.secuencia || data]);
      setSuccess('Secuencia creada exitosamente');
      console.log('Validaciones completadas:', data.validacionesRealizadas);
      resetForm();
      setTimeout(() => setShowCreateModal(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSequence = (sequence: Sequence) => {
    setIsEditMode(true);
    setSelectedSequence(sequence);
    setFormData({
      contenido_origen_id: sequence.contenido_origen_id.toString(),
      contenido_destino_id: sequence.contenido_destino_id.toString(),
      descripcion: sequence.descripcion || '',
      estado: sequence.estado
    });
    setShowCreateModal(true);
  };

  const handleUpdateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequence) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        contenido_origen_id: parseInt(formData.contenido_origen_id),
        contenido_destino_id: parseInt(formData.contenido_destino_id),
        descripcion: formData.descripcion || null,
        estado: formData.estado
      };

      const response = await fetch(`http://localhost:4000/secuencias-contenido/${selectedSequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Capturar el error específico del backend (prioridad: error > message)
        const errorMessage = data.error || data.message || 'Error al actualizar la secuencia';
        console.log('Validaciones realizadas:', data.validacionesRealizadas);
        throw new Error(errorMessage);
      }

      // Éxito - la respuesta puede venir en data.secuencia o directamente en data
      const updatedSequence = data.secuencia || data;
      setSequences(sequences.map(s => s.id === selectedSequence.id ? updatedSequence : s));
      setSuccess('Secuencia actualizada exitosamente');
      console.log('Validaciones completadas:', data.validacionesRealizadas);
      resetForm();
      setTimeout(() => setShowCreateModal(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEstado = async (id: number, currentEstado: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/secuencias-contenido/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Error al cambiar estado');
      }

      const updated = await response.json();
      setSequences(sequences.map(s => s.id === id ? updated.secuencia : s));
      setSuccess(`Secuencia ${updated.secuencia.estado ? 'habilitada' : 'inhabilitada'}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSequence = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta secuencia?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:4000/secuencias-contenido/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la secuencia');
      }

      setSequences(sequences.filter(s => s.id !== id));
      setSuccess('Secuencia eliminada exitosamente');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contenido_origen_id: '',
      contenido_destino_id: '',
      descripcion: '',
      estado: true
    });
    setIsEditMode(false);
    setSelectedSequence(null);
  };

  const filteredSequences = sequences.filter(seq => {
    const origen = contents.find(c => c.id === seq.contenido_origen_id)?.titulo || '';
    const destino = contents.find(c => c.id === seq.contenido_destino_id)?.titulo || '';
    const term = searchTerm.toLowerCase();
    return origen.toLowerCase().includes(term) || destino.toLowerCase().includes(term) || seq.descripcion?.toLowerCase().includes(term);
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return '#4A90E2';
      case 'document': return '#7ED6A7';
      case 'activity': return '#F5A97F';
      default: return '#999';
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Secuencias</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                // Inicializar filtros del modal sin afectar filtros de página
                setModalSelectedArea('');
                setModalSelectedTema('');
                setModalSelectedSubtema('');
                setModalTemas([]);
                setModalSubtemas([]);
                setModalContents(contents);
                console.log('DEBUG: Abriendo modal crear secuencia. Contenidos totales disponibles:', contents.length, contents.map(c => c.titulo));
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Secuencia</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowRight className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{sequences.length}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Secuencias</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-[#7ED6A7]" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">
                {sequences.filter(s => s.estado).length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Activas</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-gray-500" />
              </div>
              <span className="text-3xl text-gray-500">
                {sequences.filter(s => !s.estado).length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Inactivas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#3A4A5B] mb-4">Filtrar por:</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Área
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              >
                <option value="">Todas las áreas</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Tema
              </label>
              <select
                value={selectedTema}
                onChange={(e) => handleFilterChange('tema', e.target.value)}
                disabled={!selectedArea}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todos los temas</option>
                {filteredTemas.map(tema => (
                  <option key={tema.id} value={tema.id}>
                    {tema.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Subtema
              </label>
              <select
                value={selectedSubtema}
                onChange={(e) => handleFilterChange('subtema', e.target.value)}
                disabled={!selectedTema}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todos los subtemas</option>
                {filteredSubtemas.map(subtema => (
                  <option key={subtema.id} value={subtema.id}>
                    {subtema.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar secuencias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Loading State */}
        {isLoadingData ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando secuencias...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Secuencias List */}
            <div className="space-y-4">
              {filteredSequences.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <p className="text-gray-600">No hay secuencias. Crea una nueva para empezar.</p>
                </div>
              ) : (
                filteredSequences.map((sequence) => {
                  const origen = contents.find(c => c.id === sequence.contenido_origen_id);
                  const destino = contents.find(c => c.id === sequence.contenido_destino_id);

                  return (
                    <div key={sequence.id} className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Bloque Origen */}
                        <div className="flex items-center gap-2">
                          <div
                            className="px-4 py-2 rounded-lg text-white font-semibold"
                            style={{ backgroundColor: getTypeColor(origen?.tipo || '') }}
                          >
                            {origen?.titulo || 'N/A'}
                          </div>
                        </div>

                        {/* Flecha */}
                        <ArrowRight className="w-5 h-5 text-gray-400" />

                        {/* Bloque Destino */}
                        <div className="flex items-center gap-2">
                          <div
                            className="px-4 py-2 rounded-lg text-white font-semibold"
                            style={{ backgroundColor: getTypeColor(destino?.tipo || '') }}
                          >
                            {destino?.titulo || 'N/A'}
                          </div>
                        </div>

                        {/* Descripción */}
                        {sequence.descripcion && (
                          <div className="ml-4 text-sm text-gray-600 italic">
                            ({sequence.descripcion})
                          </div>
                        )}
                      </div>

                      {/* Estado y Acciones */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleEstado(sequence.id, sequence.estado)}
                          disabled={isLoading}
                          className={`p-2 rounded-lg transition-colors ${
                            sequence.estado
                              ? 'text-green-600 bg-green-50 hover:bg-green-100'
                              : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                          }`}
                          title={sequence.estado ? 'Desactivar' : 'Activar'}
                        >
                          {sequence.estado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleEditSequence(sequence)}
                          className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteSequence(sequence.id)}
                          disabled={isLoading}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
        </div>
      </main>

      {/* Modal Crear/Editar Secuencia */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#3A4A5B]">
                {isEditMode ? 'Editar Secuencia' : 'Crear Nueva Secuencia'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                  // Limpiar estado del modal
                  setModalSelectedArea('');
                  setModalSelectedTema('');
                  setModalSelectedSubtema('');
                  setModalTemas([]);
                  setModalSubtemas([]);
                  setModalContents([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence} className="space-y-4">
              {/* Filtros en Modal */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-[#3A4A5B] mb-3">Filtrar contenidos:</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Área
                    </label>
                    <select
                      value={modalSelectedArea}
                      onChange={(e) => handleModalFilterChange('area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    >
                      <option value="">Todas las áreas</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tema
                    </label>
                    <select
                      value={modalSelectedTema}
                      onChange={(e) => handleModalFilterChange('tema', e.target.value)}
                      disabled={!modalSelectedArea}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Todos los temas</option>
                      {modalTemas.map(tema => (
                        <option key={tema.id} value={tema.id}>
                          {tema.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subtema
                    </label>
                    <select
                      value={modalSelectedSubtema}
                      onChange={(e) => handleModalFilterChange('subtema', e.target.value)}
                      disabled={!modalSelectedTema}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Todos los subtemas</option>
                      {modalSubtemas.map(subtema => (
                        <option key={subtema.id} value={subtema.id}>
                          {subtema.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contenido Origen */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Contenido Origen *
                </label>
                <select
                  name="contenido_origen_id"
                  value={formData.contenido_origen_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar contenido origen</option>
                  {getAvailableOriginModalContents().map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Contenido Destino */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Contenido Destino *
                </label>
                <select
                  name="contenido_destino_id"
                  value={formData.contenido_destino_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar contenido destino</option>
                  {getAvailableDestinationModalContents().map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe la relación entre estos contenidos"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Estado
                </label>
                <select
                  name="estado"
                  value={formData.estado ? 'true' : 'false'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>

              {/* Botones */}
              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setModalSelectedArea('');
                    setModalSelectedTema('');
                    setModalSelectedSubtema('');
                    setModalTemas([]);
                    setModalSubtemas([]);
                    setModalContents([]);
                  }}
                  disabled={isLoading}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{isEditMode ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isEditMode ? 'Actualizar Secuencia' : 'Crear Secuencia'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
