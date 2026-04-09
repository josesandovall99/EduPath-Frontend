import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

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
  descripcion?: string;
  tema_id: number;
}

interface Sequence {
  id: number;
  subtema_origen_id: number;
  subtema_destino_id: number;
  descripcion?: string;
  estado: boolean;
  origen?: Subtema;
  destino?: Subtema;
}

interface SubtemaSequenceManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  onSelectSubtema?: (subtemaId: number, temaId: number, subtemaNombre: string) => void;
  areaId?: number;
  areaName?: string;
  temaId?: number;
  temaName?: string;
}

export function SubtemaSequenceManagementScreen({ 
  onBack, 
  onHome,
  onSelectSubtema,
  areaId,
  areaName,
  temaId,
  temaName
}: SubtemaSequenceManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
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

  // Modal-specific filtros
  const [modalSelectedArea, setModalSelectedArea] = useState('');
  const [modalSelectedTema, setModalSelectedTema] = useState('');
  const [modalTemas, setModalTemas] = useState<Tema[]>([]);
  const [modalSubtemas, setModalSubtemas] = useState<Subtema[]>([]);

  const [formData, setFormData] = useState({
    subtema_origen_id: '',
    subtema_destino_id: '',
    descripcion: '',
    estado: true
  });

  // Drag and drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [insertAfterSequenceId, setInsertAfterSequenceId] = useState<number | null>(null);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  // Set area when areaId is provided
  useEffect(() => {
    if (areaId !== undefined) {
      setSelectedArea(areaId.toString());
    }
  }, [areaId]);

  // Set tema when temaId is provided
  useEffect(() => {
    if (temaId !== undefined) {
      setSelectedTema(temaId.toString());
    }
  }, [temaId]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [areasRes, temasRes, subtemasRes, sequencesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/areas`),
        fetch(`${API_BASE_URL}/temas`),
        fetch(`${API_BASE_URL}/subtemas`),
        fetch(`${API_BASE_URL}/secuencias-subtema`)
      ]);

      if (!areasRes.ok || !temasRes.ok || !subtemasRes.ok || !sequencesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const areasData = await areasRes.json();
      const temasData = await temasRes.json();
      const subtemasData = await subtemasRes.json();
      const sequencesData = await sequencesRes.json();

      setAreas(areasData);
      setTemas(temasData);
      setSubtemas(subtemasData);
      setSequences(sequencesData);
    } catch (err) {
      console.error('Error en loadData:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Obtener temas filtrados por área
  const getFilteredTemas = () => {
    if (!selectedArea) return temas;
    return temas.filter(t => Number(t.area_id) === Number(selectedArea));
  };

  // Obtener subtemas filtrados por tema
  const getFilteredSubtemas = () => {
    let filtered = subtemas;
    
    // Filter by area if areaId is provided
    if (areaId !== undefined) {
      const allowedTemaIds = temas
        .filter(t => Number(t.area_id) === Number(areaId))
        .map(t => Number(t.id));
      filtered = filtered.filter(s => allowedTemaIds.includes(Number(s.tema_id)));
    }
    
    // Filter by tema if selected
    if (selectedTema) {
      filtered = filtered.filter(s => Number(s.tema_id) === Number(selectedTema));
    }
    
    return filtered;
  };

  // Obtener subtemas usados en secuencias
  const getUsedSubtemas = () => {
    const used = {
      origin: new Set<number>(),
      destination: new Set<number>(),
      both: new Set<number>()
    };

    sequences.forEach(seq => {
      used.origin.add(seq.subtema_origen_id);
      used.destination.add(seq.subtema_destino_id);
    });

    used.origin.forEach(id => {
      if (used.destination.has(id)) {
        used.both.add(id);
      }
    });

    return used;
  };

  const getModalTemaId = () => {
    if (modalSelectedTema) return Number(modalSelectedTema);
    if (temaId !== undefined) return Number(temaId);
    if (selectedTema) return Number(selectedTema);
    return null;
  };

  const getModalChainContext = () => {
    const temaScopeId = getModalTemaId();
    if (!temaScopeId) {
      return {
        lockedOriginId: null,
        connectedSubtemaIds: new Set<number>()
      };
    }

    const subtemaIdsTema = new Set(
      subtemas
        .filter((subtema) => Number(subtema.tema_id) === Number(temaScopeId))
        .map((subtema) => Number(subtema.id))
    );

    const secuenciasTema = sequences.filter((sequence) =>
      subtemaIdsTema.has(Number(sequence.subtema_origen_id)) &&
      subtemaIdsTema.has(Number(sequence.subtema_destino_id))
    );

    if (secuenciasTema.length === 0 || isEditMode) {
      return {
        lockedOriginId: null,
        connectedSubtemaIds: new Set<number>()
      };
    }

    const origenes = new Set(secuenciasTema.map((sequence) => Number(sequence.subtema_origen_id)));
    const destinos = new Set(secuenciasTema.map((sequence) => Number(sequence.subtema_destino_id)));
    const conectados = new Set<number>([...origenes, ...destinos]);
    const cola = [...destinos].find((destinoId) => !origenes.has(destinoId)) ?? null;

    return {
      lockedOriginId: cola,
      connectedSubtemaIds: conectados
    };
  };

  const hasExistingRelationBetween = (firstSubtemaId: number, secondSubtemaId: number, ignoreSequenceId?: number) => {
    return sequences.some((sequence) => {
      if (ignoreSequenceId && sequence.id === ignoreSequenceId) {
        return false;
      }

      const isDirectRelation =
        Number(sequence.subtema_origen_id) === Number(firstSubtemaId) &&
        Number(sequence.subtema_destino_id) === Number(secondSubtemaId);

      const isInverseRelation =
        Number(sequence.subtema_origen_id) === Number(secondSubtemaId) &&
        Number(sequence.subtema_destino_id) === Number(firstSubtemaId);

      return isDirectRelation || isInverseRelation;
    });
  };

  // Modal helpers
  const getFilteredModalSubtemas = () => {
    // Si tenemos subtemas en el modal, usar esos
    if (modalSubtemas.length > 0) {
      return modalSubtemas.filter(s => {
        // Si hay filtro de tema, solo mostrar subtemas de ese tema
        if (modalSelectedTema && Number(s.tema_id) !== Number(modalSelectedTema)) return false;
        return true;
      });
    }
    
    // Si no, filtrar por tema seleccionado
    if (modalSelectedTema) {
      return subtemas.filter(s => Number(s.tema_id) === Number(modalSelectedTema));
    }
    
    // Si hay filtro de area, mostrar subtemas de temas del area
    if (modalSelectedArea) {
      const allowedTemaIds = temas
        .filter(t => Number(t.area_id) === Number(modalSelectedArea))
        .map(t => Number(t.id));
      return subtemas.filter(s => allowedTemaIds.includes(Number(s.tema_id)));
    }
    
    return subtemas;
  };

  const getAvailableOriginModalSubtemas = () => {
    const filtered = getFilteredModalSubtemas();
    const used = getUsedSubtemas();
    const { lockedOriginId } = getModalChainContext();

    if (lockedOriginId && !isEditMode) {
      return filtered.filter((subtema) => Number(subtema.id) === Number(lockedOriginId));
    }

    const currentDestinoId = formData.subtema_destino_id ? parseInt(formData.subtema_destino_id) : null;
    const currentOrigenId = isEditMode && selectedSequence ? selectedSequence.subtema_origen_id : null;
    const currentSequenceId = isEditMode && selectedSequence ? selectedSequence.id : undefined;

    return filtered.filter(s => {
      if (used.both.has(s.id) && s.id !== currentOrigenId) return false;
      if (used.origin.has(s.id) && s.id !== currentOrigenId) return false;
      if (currentDestinoId && s.id === currentDestinoId) return false;
      if (currentDestinoId && hasExistingRelationBetween(s.id, currentDestinoId, currentSequenceId)) return false;
      return true;
    });
  };

  const getAvailableDestinationModalSubtemas = () => {
    const filtered = getFilteredModalSubtemas();
    const used = getUsedSubtemas();
    const { lockedOriginId, connectedSubtemaIds } = getModalChainContext();
    const currentOrigenId = formData.subtema_origen_id ? parseInt(formData.subtema_origen_id) : null;
    const effectiveOrigenId = currentOrigenId || lockedOriginId;
    const currentDestinoId = isEditMode && selectedSequence ? selectedSequence.subtema_destino_id : null;
    const currentSequenceId = isEditMode && selectedSequence ? selectedSequence.id : undefined;

    if (
      isEditMode &&
      selectedSequence &&
      currentOrigenId &&
      Number(currentOrigenId) !== Number(selectedSequence.subtema_origen_id)
    ) {
      return filtered.filter((subtema) => Number(subtema.id) === Number(selectedSequence.subtema_destino_id));
    }

    return filtered.filter(s => {
      if (used.both.has(s.id) && s.id !== currentDestinoId) return false;
      if (used.destination.has(s.id) && s.id !== currentDestinoId) return false;
      if (effectiveOrigenId && s.id === effectiveOrigenId) return false;
      if (!isEditMode && lockedOriginId && connectedSubtemaIds.has(Number(s.id))) return false;
      if (effectiveOrigenId && hasExistingRelationBetween(effectiveOrigenId, s.id, currentSequenceId)) return false;
      return true;
    });
  };

  useEffect(() => {
    if (!showCreateModal || isEditMode) {
      return;
    }

    const { lockedOriginId } = getModalChainContext();
    if (!lockedOriginId) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      subtema_origen_id: String(lockedOriginId),
      subtema_destino_id: prev.subtema_destino_id === String(lockedOriginId) ? '' : prev.subtema_destino_id
    }));
  }, [showCreateModal, isEditMode, modalSelectedTema, selectedTema, temaId, sequences, subtemas]);

  const handleModalFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'area') {
      setModalSelectedArea(value);
      setModalSelectedTema('');
      setModalSubtemas([]);

      if (value) {
        try {
          const res = await fetch(`${API_BASE_URL}/temas/por-area/${value}`);
          if (!res.ok) throw new Error('Error cargando temas');
          const data = await res.json();
          setModalTemas(data);

          const temaIds = data.map((t: Tema) => Number(t.id));
          const filtered = subtemas.filter(s => temaIds.includes(Number(s.tema_id)));
          setModalSubtemas(filtered);
        } catch (err) {
          console.error('Error cargando temas para modal:', err);
          setModalTemas([]);
          setModalSubtemas([]);
        }
      } else {
        setModalSubtemas(subtemas);
      }
    } else if (filterType === 'tema') {
      setModalSelectedTema(value);

      if (value) {
        // Filtrar subtemas por tema seleccionado
        const filtered = subtemas.filter(s => Number(s.tema_id) === Number(value));
        setModalSubtemas(filtered);
      } else {
        // Si se limpia el tema, mostrar subtemas del área (si hay) o todos
        if (modalSelectedArea) {
          const temaIds = modalTemas.map((t: Tema) => Number(t.id));
          setModalSubtemas(subtemas.filter(s => temaIds.includes(Number(s.tema_id))));
        } else {
          setModalSubtemas(subtemas);
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'estado') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (name === 'subtema_origen_id') {
      setFormData(prev => {
        const newValue = value;
        if (prev.subtema_destino_id === newValue && newValue) {
          return { ...prev, [name]: newValue, subtema_destino_id: '' };
        }
        return { ...prev, [name]: newValue };
      });
    } else if (name === 'subtema_destino_id') {
      setFormData(prev => {
        const newValue = value;
        if (prev.subtema_origen_id === newValue && newValue) {
          return { ...prev, [name]: newValue, subtema_origen_id: '' };
        }
        return { ...prev, [name]: newValue };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'area') {
      setSelectedArea(value);
      setSelectedTema('');

      if (value) {
        try {
          const res = await fetch(`${API_BASE_URL}/temas/por-area/${value}`);
          if (!res.ok) throw new Error('Error cargando temas');
          const data = await res.json();
          setTemas(data);
        } catch (err) {
          console.error('Error cargando temas:', err);
          setTemas([]);
        }
      }
    } else if (filterType === 'tema') {
      setSelectedTema(value);
    }
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const origenId = parseInt(formData.subtema_origen_id);
      const destinoId = parseInt(formData.subtema_destino_id);

      if (origenId === destinoId) {
        setError('El subtema origen no puede ser el mismo que el destino');
        setIsLoading(false);
        return;
      }

      if (hasExistingRelationBetween(origenId, destinoId)) {
        setError('Estos subtemas ya están relacionados en una secuencia.');
        setIsLoading(false);
        return;
      }

      if (insertAfterSequenceId) {
        const afterSequence = sequences.find(s => s.id === insertAfterSequenceId);
        if (afterSequence) {
          const destinoOriginal = afterSequence.subtema_destino_id;

          await fetch(`${API_BASE_URL}/secuencias-subtema/${insertAfterSequenceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subtema_origen_id: afterSequence.subtema_origen_id,
              subtema_destino_id: origenId,
              descripcion: afterSequence.descripcion,
              estado: afterSequence.estado
            })
          });

          await fetch(`${API_BASE_URL}/secuencias-subtema`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subtema_origen_id: origenId,
              subtema_destino_id: destinoOriginal,
              descripcion: formData.descripcion || null,
              estado: formData.estado
            })
          });
        }
      } else {
        const payload = {
          subtema_origen_id: origenId,
          subtema_destino_id: destinoId,
          descripcion: formData.descripcion || null,
          estado: formData.estado
        };

        const response = await fetch(`${API_BASE_URL}/secuencias-subtema`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear la secuencia');
        }
      }

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`);
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
      }

      setSuccess('Secuencia creada exitosamente');
      resetForm();
      setInsertAfterSequenceId(null);
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
      subtema_origen_id: sequence.subtema_origen_id.toString(),
      subtema_destino_id: sequence.subtema_destino_id.toString(),
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
      const origenId = parseInt(formData.subtema_origen_id);
      const destinoId = parseInt(formData.subtema_destino_id);

      if (origenId === destinoId) {
        setError('El subtema origen no puede ser el mismo que el destino');
        setIsLoading(false);
        return;
      }

      if (hasExistingRelationBetween(origenId, destinoId, selectedSequence.id)) {
        setError('Estos subtemas ya están relacionados en una secuencia.');
        setIsLoading(false);
        return;
      }

      const payload = {
        subtema_origen_id: origenId,
        subtema_destino_id: destinoId,
        descripcion: formData.descripcion || null,
        estado: formData.estado
      };

      const response = await fetch(`${API_BASE_URL}/secuencias-subtema/${selectedSequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Error al actualizar la secuencia');
      }

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`);
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
      }

      setSuccess('Secuencia actualizada exitosamente');
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
      const response = await fetch(`${API_BASE_URL}/secuencias-subtema/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Error al cambiar estado');
      }

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`);
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
      }

      setSuccess(`Secuencia ${currentEstado ? 'inhabilitada' : 'habilitada'}`);
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
      const seqToDelete = sequences.find(s => s.id === id);
      if (!seqToDelete) {
        setIsLoading(false);
        return;
      }

      const prevSeq = sequences.find(s =>
        s.id !== id &&
        s.subtema_destino_id === seqToDelete.subtema_origen_id &&
        s.estado
      );

      const nextSeq = sequences.find(s =>
        s.id !== id &&
        s.subtema_origen_id === seqToDelete.subtema_destino_id &&
        s.estado
      );

      const deletePayload: any = {};
      if (prevSeq && nextSeq) {
        deletePayload.prevSequenceId = prevSeq.id;
        deletePayload.nextSequenceId = nextSeq.id;
      }

      const response = await fetch(`${API_BASE_URL}/secuencias-subtema/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletePayload)
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la secuencia');
      }

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`);
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
      }

      setSuccess(prevSeq && nextSeq
        ? 'Secuencia eliminada y cadena reorganizada automáticamente'
        : 'Secuencia eliminada exitosamente'
      );
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subtema_origen_id: '',
      subtema_destino_id: '',
      descripcion: '',
      estado: true
    });
    setIsEditMode(false);
    setSelectedSequence(null);
  };

  const filteredSequences = sequences.filter(seq => {
    const origen = subtemas.find(s => s.id === seq.subtema_origen_id);
    const destino = subtemas.find(s => s.id === seq.subtema_destino_id);
    
    if (!origen || !destino) return false;
    
    // Filter by tema if temaId is provided (prioridad: solo mostrar secuencias de este tema)
    if (temaId !== undefined) {
      const matchesTema = Number(origen.tema_id) === Number(temaId) && Number(destino.tema_id) === Number(temaId);
      if (!matchesTema) return false;
    }
    
    // Filter by area if areaId is provided
    if (areaId !== undefined) {
      const allowedTemaIds = temas
        .filter(t => Number(t.area_id) === Number(areaId))
        .map(t => Number(t.id));
      if (!allowedTemaIds.includes(Number(origen.tema_id)) || !allowedTemaIds.includes(Number(destino.tema_id))) {
        return false;
      }
    }
    
    const origenName = origen?.nombre || '';
    const destinoName = destino?.nombre || '';
    const term = searchTerm.toLowerCase();
    return origenName.toLowerCase().includes(term) || destinoName.toLowerCase().includes(term) || seq.descripcion?.toLowerCase().includes(term);
  });

  // Construir secuencia ordenada
  const buildOrderedSequence = () => {
    if (sequences.length === 0) return [];

    const sequenceMap = new Map<number, number>();
    const destinos = new Set<number>();
    
    // Filter sequences by tema if temaId is provided (prioridad)
    let secuenciasActivas = sequences.filter(s => s.estado);
    if (temaId !== undefined) {
      secuenciasActivas = secuenciasActivas.filter(seq => {
        const origen = subtemas.find(s => s.id === seq.subtema_origen_id);
        const destino = subtemas.find(s => s.id === seq.subtema_destino_id);
        return origen && destino && 
               Number(origen.tema_id) === Number(temaId) && 
               Number(destino.tema_id) === Number(temaId);
      });
    } else if (areaId !== undefined) {
      // Filter sequences by area if areaId is provided
      const allowedTemaIds = temas
        .filter(t => Number(t.area_id) === Number(areaId))
        .map(t => Number(t.id));
      secuenciasActivas = secuenciasActivas.filter(seq => {
        const origen = subtemas.find(s => s.id === seq.subtema_origen_id);
        const destino = subtemas.find(s => s.id === seq.subtema_destino_id);
        return origen && destino && 
               allowedTemaIds.includes(Number(origen.tema_id)) && 
               allowedTemaIds.includes(Number(destino.tema_id));
      });
    }

    secuenciasActivas.forEach(seq => {
      sequenceMap.set(seq.subtema_origen_id, seq.subtema_destino_id);
      destinos.add(seq.subtema_destino_id);
    });

    const subtemasIniciales = new Set<number>();
    secuenciasActivas.forEach(seq => {
      if (!destinos.has(seq.subtema_origen_id)) {
        subtemasIniciales.add(seq.subtema_origen_id);
      }
    });

    if (subtemasIniciales.size === 0 && secuenciasActivas.length > 0) {
      subtemasIniciales.add(secuenciasActivas[0].subtema_origen_id);
    }

    const ordered: Array<{ subtema_id: number; sequence_id?: number; isStart: boolean }> = [];
    const visited = new Set<number>();

    const addToChain = (subtemaId: number, isStart: boolean = false) => {
      if (visited.has(subtemaId)) return;

      const subtema = subtemas.find(s => s.id === subtemaId);
      if (!subtema) return;

      const seq = secuenciasActivas.find(s => s.subtema_origen_id === subtemaId);

      ordered.push({
        subtema_id: subtemaId,
        sequence_id: seq?.id,
        isStart
      });
      visited.add(subtemaId);

      const destinoId = sequenceMap.get(subtemaId);
      if (destinoId) {
        addToChain(destinoId, false);
      }
    };

    subtemasIniciales.forEach(initId => {
      addToChain(initId, true);
    });

    secuenciasActivas.forEach(seq => {
      if (!visited.has(seq.subtema_origen_id)) {
        const subtema = subtemas.find(s => s.id === seq.subtema_origen_id);
        if (subtema) {
          ordered.push({
            subtema_id: seq.subtema_origen_id,
            sequence_id: seq.id,
            isStart: false
          });
        }
      }
      if (!visited.has(seq.subtema_destino_id)) {
        const subtema = subtemas.find(s => s.id === seq.subtema_destino_id);
        if (subtema) {
          ordered.push({
            subtema_id: seq.subtema_destino_id,
            sequence_id: seq.id,
            isStart: false
          });
        }
      }
    });

    return ordered;
  };

  const orderedSequence = buildOrderedSequence();

  const handleSaveOrder = async (newOrder: Array<{ subtema_id: number; sequence_id?: number }>) => {
    setIsLoading(true);
    try {
      const subtemasOrdenados = newOrder.map(item => item.subtema_id);

      const response = await fetch(`${API_BASE_URL}/secuencias-subtema/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtemas: subtemasOrdenados
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el orden');
      }

      const result = await response.json();

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`);
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
        setSuccess(`Orden actualizado: ${result.secuenciasCreadas} creadas, ${result.secuenciasEliminadas} eliminadas`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el orden');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onHome}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Secuencias de Subtemas</h1>
                {areaName && temaName && (
                  <p className="text-gray-500 text-sm">Área: {areaName} → Tema: {temaName}</p>
                )}
                {areaName && !temaName && (
                  <p className="text-gray-500 text-sm">Área: {areaName}</p>
                )}
                {!areaName && !temaName && (
                  <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setInsertAfterSequenceId(null);
                
                // Pre-fill filters if area and tema are provided
                if (areaId !== undefined && temaId !== undefined) {
                  setModalSelectedArea(areaId.toString());
                  setModalSelectedTema(temaId.toString());
                  
                  // Cargar subtemas del tema seleccionado
                  const subtemaFilter = subtemas.filter(s => Number(s.tema_id) === Number(temaId));
                  setModalSubtemas(subtemaFilter);
                  
                  const temaFilter = temas.find(t => t.id === temaId);
                  if (temaFilter) {
                    setModalTemas([temaFilter]);
                  }
                } else if (areaId !== undefined) {
                  setModalSelectedArea(areaId.toString());
                  setModalSelectedTema('');
                  
                  // Cargar temas del área
                  const temasArea = temas.filter(t => Number(t.area_id) === Number(areaId));
                  setModalTemas(temasArea);
                  
                  // Cargar subtemas de temas del área
                  const subtemasArea = subtemas.filter(s => 
                    temasArea.some(t => Number(t.id) === Number(s.tema_id))
                  );
                  setModalSubtemas(subtemasArea);
                } else {
                  setModalSelectedArea('');
                  setModalSelectedTema('');
                  setModalTemas([]);
                  setModalSubtemas(subtemas);
                }
                
                setShowCreateModal(true);
              }}
              className="app-btn app-btn-success px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Secuencia</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{temaId ? 'Volver a Temas' : 'Volver al Panel'}</span>
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
                {filteredSequences.filter(s => !s.estado).length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Inactivas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#3A4A5B] mb-4">Filtrar por:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Área
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                disabled={areaId !== undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                disabled={!selectedArea || temaId !== undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todos los temas</option>
                {getFilteredTemas().map(tema => (
                  <option key={tema.id} value={tema.id}>
                    {tema.nombre}
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
            {/* Vista de Secuencias Ordenadas */}
            {orderedSequence.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#3A4A5B]">Secuencia Ordenada</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg overflow-x-auto">
                  {orderedSequence.map((item, index) => {
                    const subtema = subtemas.find(s => s.id === item.subtema_id);
                    const isLast = index === orderedSequence.length - 1;
                    const isDragging = draggedItem === index;
                    const isDraggedOver = draggedOverIndex === index;

                    return (
                      <div
                        key={`${item.subtema_id}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => {
                            if (subtema && onSelectSubtema) {
                              onSelectSubtema(subtema.id, subtema.tema_id, subtema.nombre);
                            }
                          }}
                          className="relative"
                          draggable
                          onDragStart={(e) => {
                            setDraggedItem(index);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            if (draggedItem !== null && draggedOverIndex !== null && draggedItem !== draggedOverIndex) {
                              const newOrder = [...orderedSequence];
                              const sourceItem = newOrder[draggedItem];
                              const targetItem = newOrder[draggedOverIndex];
                              newOrder[draggedItem] = targetItem;
                              newOrder[draggedOverIndex] = sourceItem;
                              handleSaveOrder(newOrder);
                            }
                            setDraggedItem(null);
                            setDraggedOverIndex(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDraggedOverIndex(index);
                          }}
                          style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}
                        >
                          <div
                            className={`px-4 py-2 rounded-lg text-white font-semibold min-w-[150px] text-center cursor-move hover:opacity-90 transition-opacity bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] ${
                              isDragging ? 'opacity-50 scale-95' : ''
                            } ${
                              isDraggedOver ? 'ring-2 ring-[#4A90E2] ring-offset-2' : ''
                            }`}
                            title={`Click para gestionar contenidos de ${subtema?.nombre}`}
                          >
                            {subtema?.nombre || 'N/A'}
                          </div>
                        </button>
                        {!isLast && (
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Lista Completa de Secuencias */}
            <div className="space-y-4">
              {filteredSequences.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <p className="text-gray-600">No hay secuencias. Crea una nueva para empezar.</p>
                </div>
              ) : (
                filteredSequences.map((sequence) => {
                  const origen = subtemas.find(s => s.id === sequence.subtema_origen_id);
                  const destino = subtemas.find(s => s.id === sequence.subtema_destino_id);

                  return (
                    <div key={sequence.id} className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => {
                            if (origen && onSelectSubtema) {
                              onSelectSubtema(origen.id, origen.tema_id, origen.nombre);
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                          title={`Click para gestionar contenidos de ${origen?.nombre}`}
                        >
                          {origen?.nombre || 'N/A'}
                        </button>

                        <ArrowRight className="w-5 h-5 text-gray-400" />

                        <button
                          onClick={() => {
                            if (destino && onSelectSubtema) {
                              onSelectSubtema(destino.id, destino.tema_id, destino.nombre);
                            }
                          }}
                          className="px-4 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
                          title={`Click para gestionar contenidos de ${destino?.nombre}`}
                        >
                          {destino?.nombre || 'N/A'}
                        </button>

                        {sequence.descripcion && (
                          <div className="ml-4 text-sm text-gray-600 italic">
                            ({sequence.descripcion})
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
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
                  setInsertAfterSequenceId(null);
                  setModalSelectedArea('');
                  setModalSelectedTema('');
                  setModalTemas([]);
                  setModalSubtemas([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence} className="space-y-4">
              {/* Filtros en Modal */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-[#3A4A5B] mb-3">Filtrar subtemas:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Área
                    </label>
                    <select
                      value={modalSelectedArea}
                      onChange={(e) => handleModalFilterChange('area', e.target.value)}
                      disabled={areaId !== undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                      disabled={!modalSelectedArea || temaId !== undefined}
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
                </div>
              </div>

              {/* Subtema Origen */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Subtema Origen *
                </label>
                {(() => {
                  const { lockedOriginId } = getModalChainContext();
                  const isOriginLocked = Boolean(lockedOriginId && !isEditMode);
                  return (
                <select
                  name="subtema_origen_id"
                  value={formData.subtema_origen_id}
                  onChange={handleInputChange}
                  disabled={isOriginLocked}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Seleccionar subtema origen</option>
                  {getAvailableOriginModalSubtemas().map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                  );
                })()}
                {!isEditMode && getModalChainContext().lockedOriginId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Origen fijado al último destino de la cadena.
                  </p>
                )}
              </div>

              {/* Subtema Destino */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Subtema Destino *
                </label>
                <select
                  name="subtema_destino_id"
                  value={formData.subtema_destino_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar subtema destino</option>
                  {getAvailableDestinationModalSubtemas().map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {isEditMode && selectedSequence && formData.subtema_origen_id && Number(formData.subtema_origen_id) !== Number(selectedSequence.subtema_origen_id) && (
                  <p className="mt-2 text-xs text-gray-500">
                    Destino fijado para mantener la cadena ordenada.
                  </p>
                )}
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
                  placeholder="Describe la relación entre estos subtemas"
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
                    setModalTemas([]);
                    setModalSubtemas([]);
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
