import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ArrowDownUp } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface Asignatura {
  id: number;
  nombre: string;
}

interface Tema {
  id: number;
  nombre: string;
  asignatura_id: number;
  estado?: boolean;
}

interface Subtema {
  id: number;
  nombre: string;
  descripcion?: string;
  tema_id: number;
  estado?: boolean;
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
  asignaturaId?: number;
  asignaturaName?: string;
  temaId?: number;
  temaName?: string;
  mode?: 'admin' | 'docente';
}

export function SubtemaSequenceManagementScreen({ 
  onBack, 
  onHome,
  onSelectSubtema,
  asignaturaId,
  asignaturaName,
  temaId,
  temaName,
  mode = 'admin'
}: SubtemaSequenceManagementScreenProps) {
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
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
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  const [selectedTema, setSelectedTema] = useState('');

  // Modal-specific filtros
  const [modalSelectedAsignatura, setModalSelectedAsignatura] = useState('');
  const [modalSelectedTema, setModalSelectedTema] = useState('');
  const [modalTemas, setModalTemas] = useState<Tema[]>([]);
  const [modalSubtemas, setModalSubtemas] = useState<Subtema[]>([]);

  const [formData, setFormData] = useState({
    subtema_origen_id: '',
    subtema_destino_id: '',
    descripcion: '',
    estado: true
  });

  const isTemaActive = (tema: Tema) => tema.estado !== false;
  const isSubtemaActive = (subtema: Subtema) => subtema.estado !== false;

  // Drag and drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [insertAfterSequenceId, setInsertAfterSequenceId] = useState<number | null>(null);
  const incomingAsignaturaValue = asignaturaId !== undefined ? asignaturaId.toString() : '';
  const incomingTemaValue = temaId !== undefined ? temaId.toString() : '';
  const effectiveSelectedAsignatura = selectedAsignatura || incomingAsignaturaValue;
  const effectiveSelectedTema = selectedTema || incomingTemaValue;
  const effectiveModalSelectedAsignatura = modalSelectedAsignatura || incomingAsignaturaValue || effectiveSelectedAsignatura;
  const effectiveModalSelectedTema = modalSelectedTema || incomingTemaValue || effectiveSelectedTema;
  const currentModalTema = temas.find((tema) => Number(tema.id) === Number(effectiveModalSelectedTema));
  const effectiveModalTemas = modalTemas.length > 0
    ? modalTemas
    : currentModalTema
      ? [currentModalTema]
      : [];
  const isDocenteMode = mode === 'docente';

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  // Set Asignatura when asignaturaId is provided
  useEffect(() => {
    if (asignaturaId !== undefined) {
      setSelectedAsignatura(asignaturaId.toString());
    }
  }, [asignaturaId]);

  // Set tema when temaId is provided
  useEffect(() => {
    if (temaId !== undefined) {
      setSelectedTema(temaId.toString());
    }
  }, [temaId]);

  useEffect(() => {
    if (!temas.length || temaId === undefined) {
      return;
    }

    const currentTema = temas.find((tema) => Number(tema.id) === Number(temaId));
    if (!currentTema) {
      return;
    }

    if (!selectedTema) {
      setSelectedTema(String(currentTema.id));
    }

    if (!selectedAsignatura) {
      setSelectedAsignatura(String(currentTema.asignatura_id));
    }
  }, [temas, temaId, selectedTema, selectedAsignatura]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [asignaturasRes, temasRes, subtemasRes, sequencesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/asignaturas`),
        fetch(`${API_BASE_URL}/temas`),
        fetch(`${API_BASE_URL}/subtemas`),
        fetch(`${API_BASE_URL}/secuencias-subtema`)
      ]);

      if (!asignaturasRes.ok || !temasRes.ok || !subtemasRes.ok || !sequencesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const asignaturasData = await asignaturasRes.json();
      const temasData = await temasRes.json();
      const subtemasData = await subtemasRes.json();
      const sequencesData = await sequencesRes.json();

      setAsignaturas(asignaturasData);
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

  // Obtener temas filtrados por asignatura
  const getFilteredTemas = () => {
    if (!effectiveSelectedAsignatura) return temas.filter(isTemaActive);
    return temas.filter((t) => Number(t.asignatura_id) === Number(effectiveSelectedAsignatura) && isTemaActive(t));
  };

  // Obtener subtemas filtrados por tema
  const getFilteredSubtemas = () => {
    let filtered = subtemas;
    
    // Filter by Asignatura if asignaturaId is provided
    if (effectiveSelectedAsignatura) {
      const allowedTemaIds = temas
        .filter((t) => Number(t.asignatura_id) === Number(effectiveSelectedAsignatura) && isTemaActive(t))
        .map(t => Number(t.id));
      filtered = filtered.filter((s) => allowedTemaIds.includes(Number(s.tema_id)) && isSubtemaActive(s));
    }
    
    // Filter by tema if selected
    if (effectiveSelectedTema) {
      filtered = filtered.filter((s) => Number(s.tema_id) === Number(effectiveSelectedTema) && isSubtemaActive(s));
    }

    return filtered.filter(isSubtemaActive);
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
    if (effectiveSelectedTema) return Number(effectiveSelectedTema);
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
        .filter((subtema) => Number(subtema.tema_id) === Number(temaScopeId) && isSubtemaActive(subtema))
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
        if (!isSubtemaActive(s)) return false;
        // Si hay filtro de tema, solo mostrar subtemas de ese tema
        if (modalSelectedTema && Number(s.tema_id) !== Number(modalSelectedTema)) return false;
        return true;
      });
    }
    
    // Si no, filtrar por tema seleccionado
    if (modalSelectedTema) {
      return subtemas.filter((s) => Number(s.tema_id) === Number(modalSelectedTema) && isSubtemaActive(s));
    }
    
    // Si hay filtro de Asignatura, mostrar subtemas de temas del Asignatura
    if (modalSelectedAsignatura) {
      const allowedTemaIds = temas
        .filter((t) => Number(t.asignatura_id) === Number(modalSelectedAsignatura) && isTemaActive(t))
        .map(t => Number(t.id));
      return subtemas.filter((s) => allowedTemaIds.includes(Number(s.tema_id)) && isSubtemaActive(s));
    }
    
    return subtemas.filter(isSubtemaActive);
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

  useEffect(() => {
    if (!showCreateModal || isEditMode) {
      return;
    }

    if (temaId !== undefined && !modalSelectedTema) {
      setModalSelectedTema(String(temaId));
    }

    if (asignaturaId !== undefined && !modalSelectedAsignatura) {
      setModalSelectedAsignatura(String(asignaturaId));
    }

    if (temaId !== undefined && temas.length > 0 && modalTemas.length === 0) {
      const temaActual = temas.find((tema) => Number(tema.id) === Number(temaId));
      if (temaActual) {
        setModalTemas([temaActual]);
      }
    }
  }, [showCreateModal, isEditMode, temaId, asignaturaId, modalSelectedTema, modalSelectedAsignatura, temas, modalTemas]);

  const handleModalFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'Asignatura') {
      setModalSelectedAsignatura(value);
      setModalSelectedTema('');
      setModalSubtemas([]);

      if (value) {
        try {
          const res = await fetch(`${API_BASE_URL}/temas/por-asignatura/${value}`);
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
        // Si se limpia el tema, mostrar subtemas del asignatura (si hay) o todos
        if (modalSelectedAsignatura) {
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
    if (filterType === 'Asignatura') {
      setSelectedAsignatura(value);
      setSelectedTema('');

      if (value) {
        try {
          const res = await fetch(`${API_BASE_URL}/temas/por-asignatura/${value}`);
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

      setSuccess('Secuencia registrada correctamente.');
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

      setSuccess('Secuencia actualizada correctamente.');
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
        : 'Secuencia eliminada correctamente.'
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

  const scopedSequences = sequences.filter(seq => {
    const origen = subtemas.find(s => s.id === seq.subtema_origen_id);
    const destino = subtemas.find(s => s.id === seq.subtema_destino_id);
    
    if (!origen || !destino) return false;
    
    if (effectiveSelectedTema) {
      const matchesTema = Number(origen.tema_id) === Number(effectiveSelectedTema) && Number(destino.tema_id) === Number(effectiveSelectedTema);
      if (!matchesTema) return false;
    }
    
    if (effectiveSelectedAsignatura) {
      const allowedTemaIds = temas
        .filter(t => Number(t.asignatura_id) === Number(effectiveSelectedAsignatura))
        .map(t => Number(t.id));
      if (!allowedTemaIds.includes(Number(origen.tema_id)) || !allowedTemaIds.includes(Number(destino.tema_id))) {
        return false;
      }
    }

    return true;
  });

  const filteredSequences = scopedSequences.filter(seq => {
    const origen = subtemas.find(s => s.id === seq.subtema_origen_id);
    const destino = subtemas.find(s => s.id === seq.subtema_destino_id);
    
    const origenName = origen?.nombre || '';
    const destinoName = destino?.nombre || '';
    const term = searchTerm.toLowerCase();
    return origenName.toLowerCase().includes(term) || destinoName.toLowerCase().includes(term) || seq.descripcion?.toLowerCase().includes(term);
  });

  // Construir secuencia ordenada
  const buildOrderedSequence = () => {
    if (scopedSequences.length === 0) return [];

    const sequenceMap = new Map<number, number>();
    const destinos = new Set<number>();
    const secuenciasActivas = scopedSequences.filter(s => s.estado);

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
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          subtemas: subtemasOrdenados
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el orden');
      }

      const result = await response.json();

      const sequencesRes = await fetch(`${API_BASE_URL}/secuencias-subtema`, {
        headers: buildAuthHeaders()
      });
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
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button
                type="button"
                onClick={onHome}
                className="app-brand-icon"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Secuencias de Subtemas</h1>
                {asignaturaName && temaName && (
                  <p className="text-gray-500 text-sm">Asignatura: {asignaturaName} → Tema: {temaName}</p>
                )}
                {asignaturaName && !temaName && (
                  <p className="text-gray-500 text-sm">Asignatura: {asignaturaName}</p>
                )}
                {!asignaturaName && !temaName && (
                  <p className="text-gray-500 text-sm">{isDocenteMode ? 'Panel docente - EduPath' : 'Panel de Administrador - EduPath'}</p>
                )}
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
          <span>{temaId ? 'Volver a Temas' : (isDocenteMode ? 'Volver a Mis asignaturas' : 'Volver al Panel')}</span>
        </button>

        <AdminFlowGuide
          title="Secuencia de subtemas"
          description="Organización del orden de subtemas dentro del tema seleccionado."
          breadcrumbs={[
            { label: isDocenteMode ? 'Panel docente' : 'Panel admin' },
            { label: asignaturaName || 'Asignaturas' },
            { label: temaName || 'Temas' },
            { label: 'Secuencia de subtemas', current: true }
          ]}
          steps={[
            { label: 'Asignaturas', helper: 'Asignatura registrada para la operación actual.', status: asignaturaName ? 'complete' : 'upcoming' },
            { label: 'Temas', helper: 'Tema base de la secuencia académica.', status: temaName ? 'complete' : 'current' },
            { label: 'Secuencias', helper: 'Ajuste del orden entre subtemas.', status: 'current' },
            { label: 'Contenidos', helper: 'Acceso al nivel de contenidos por subtema.', status: 'upcoming' }
          ]}
          asideTitle="Siguiente paso"
          asideDescription="La selección de un subtema habilita la secuencia de contenidos asociada."
        />

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Orden académico</div>
              <h2 className="app-page-hero__title">Secuencia de subtemas</h2>
              <p className="app-page-hero__description">
                Consulta, ajusta y organiza la secuencia del tema seleccionado.
              </p>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--balanced">
            <div className="app-toolbar-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtros</p>
                  <p className="mt-1 text-sm text-slate-600">Ajusta el listado por asignatura o tema antes de revisar el orden y las relaciones activas.</p>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setInsertAfterSequenceId(null);

                    if (asignaturaId !== undefined && temaId !== undefined) {
                      setModalSelectedAsignatura(asignaturaId.toString());
                      setModalSelectedTema(temaId.toString());

                      const subtemaFilter = subtemas.filter(s => Number(s.tema_id) === Number(temaId));
                      setModalSubtemas(subtemaFilter);

                      const temaFilter = temas.find(t => t.id === temaId);
                      if (temaFilter) {
                        setModalTemas([temaFilter]);
                      }
                    } else if (asignaturaId !== undefined) {
                      setModalSelectedAsignatura(asignaturaId.toString());
                      setModalSelectedTema('');

                      const temasAsignatura = temas.filter(t => Number(t.asignatura_id) === Number(asignaturaId));
                      setModalTemas(temasAsignatura);

                      const subtemasAsignatura = subtemas.filter(s =>
                        temasAsignatura.some(t => Number(t.id) === Number(s.tema_id))
                      );
                      setModalSubtemas(subtemasAsignatura);
                    } else {
                      setModalSelectedAsignatura('');
                      setModalSelectedTema('');
                      setModalTemas([]);
                      setModalSubtemas(subtemas);
                    }

                    setShowCreateModal(true);
                  }}
                  className="app-btn app-btn-success"
                >
                  <Plus className="w-5 h-5" />
                  <span>Crear secuencia</span>
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Asignatura
              </label>
              <select
                value={effectiveSelectedAsignatura}
                onChange={(e) => handleFilterChange('Asignatura', e.target.value)}
                disabled={asignaturaId !== undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Todas las asignaturas</option>
                {asignaturas.map(Asignatura => (
                  <option key={Asignatura.id} value={Asignatura.id}>
                    {Asignatura.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Tema
              </label>
              <select
                value={effectiveSelectedTema}
                onChange={(e) => handleFilterChange('tema', e.target.value)}
                disabled={!effectiveSelectedAsignatura || temaId !== undefined}
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

            <div className="app-sidebar-stack">
              <div className="app-soft-card app-soft-card--blue">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda</p>
                  <p className="mt-1 text-sm text-slate-600">Busca por origen, destino o descripción.</p>
                </div>
                <div className="app-toolbar-card__search app-search-field">
                  <Search className="app-search-field__icon" />
                  <input
                    type="text"
                    placeholder="Buscar secuencias"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="app-form-input"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {error && (
          <div className="app-alert app-alert--error mb-6">
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="app-alert app-alert--success mb-6">
            <p>{success}</p>
          </div>
        )}

        {isLoadingData ? (
          <div className="app-empty-panel py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando secuencias...</p>
            </div>
          </div>
        ) : (
          <>
            {orderedSequence.length > 0 ? (
              <div className="app-table-card mb-6">
                <div className="app-table-card__header">
                  <div>
                    <div className="app-table-card__title">Secuencia ordenada</div>
                    <p className="app-table-card__description">Resumen del orden actual entre subtemas activos.</p>
                  </div>
                  <div className="app-sequence-reorder-note">
                    <ArrowDownUp className="w-4 h-4" />
                    <span>Arrastra para reordenar</span>
                  </div>
                </div>
                <div className="app-table-card__body">
                <div className="app-sequence-chain">
                  {orderedSequence.map((item, index) => {
                    const subtema = subtemas.find(s => s.id === item.subtema_id);
                    const isLast = index === orderedSequence.length - 1;
                    const isDragging = draggedItem === index;
                    const isDraggedOver = draggedOverIndex === index;

                    return (
                      <div
                        key={`${item.subtema_id}-${index}`}
                        className="app-sequence-chain__item"
                      >
                        <button
                          onClick={() => {
                            if (subtema && onSelectSubtema) {
                              onSelectSubtema(subtema.id, subtema.tema_id, subtema.nombre);
                            }
                          }}
                          className="app-sequence-node-shell"
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
                            className={`app-sequence-node ${
                              isDragging ? 'opacity-50 scale-95' : ''
                            } ${
                              isDraggedOver ? 'ring-2 ring-[#4A90E2] ring-offset-2' : ''
                            }`}
                            title={`Gestionar contenidos de ${subtema?.nombre}`}
                          >
                            <span className="app-sequence-node__type" style={{ backgroundColor: '#7ED6A7' }}>
                              Subtema
                            </span>
                            <span className="app-sequence-node__title">{subtema?.nombre || 'N/A'}</span>
                          </div>
                        </button>
                        {!isLast && (
                          <div className="app-sequence-connector">
                            <div className="app-sequence-connector__arrow">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {filteredSequences.length === 0 ? (
                <div className="app-empty-panel py-12">
                  <p className="text-base text-slate-600">No hay secuencias registradas con los filtros aplicados.</p>
                  <p className="mt-2 text-sm text-slate-500">Crea una secuencia para establecer el orden entre subtemas.</p>
                </div>
              ) : (
                filteredSequences.map((sequence) => {
                  const origen = subtemas.find(s => s.id === sequence.subtema_origen_id);
                  const destino = subtemas.find(s => s.id === sequence.subtema_destino_id);

                  return (
                    <div key={sequence.id} className="app-flow-card app-flow-card--sequence">
                      <div className="app-flow-card__path app-flow-card__path--sequence flex-1">
                        <button
                          onClick={() => {
                            if (origen && onSelectSubtema) {
                              onSelectSubtema(origen.id, origen.tema_id, origen.nombre);
                            }
                          }}
                          className="app-sequence-card"
                          style={{ borderColor: '#7ED6A733' }}
                          title={`Gestionar contenidos de ${origen?.nombre}`}
                        >
                          <span className="app-sequence-card__label" style={{ backgroundColor: '#7ED6A7' }}>
                            Origen
                          </span>
                          <div className="app-sequence-card__title">{origen?.nombre || 'N/A'}</div>
                        </button>

                        <div className="app-sequence-card__arrow">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        <button
                          onClick={() => {
                            if (destino && onSelectSubtema) {
                              onSelectSubtema(destino.id, destino.tema_id, destino.nombre);
                            }
                          }}
                          className="app-sequence-card"
                          style={{ borderColor: '#7ED6A733' }}
                          title={`Gestionar contenidos de ${destino?.nombre}`}
                        >
                          <span className="app-sequence-card__label" style={{ backgroundColor: '#7ED6A7' }}>
                            Destino
                          </span>
                          <div className="app-sequence-card__title">{destino?.nombre || 'N/A'}</div>
                        </button>

                        {sequence.descripcion && (
                          <div className="app-sequence-card__meta">{sequence.descripcion}</div>
                        )}
                      </div>

                      <div className="app-action-row">
                        {!isDocenteMode && (
                          <button
                            onClick={() => handleToggleEstado(sequence.id, sequence.estado)}
                            disabled={isLoading}
                            className={`app-btn app-btn-icon app-btn-sm ${sequence.estado ? 'app-btn-secondary' : 'app-btn-success'}`}
                            title={sequence.estado ? 'Desactivar' : 'Activar'}
                          >
                            {sequence.estado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        )}

                        <button
                          onClick={() => handleEditSequence(sequence)}
                          className="app-btn app-btn-ghost app-btn-icon app-btn-sm"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteSequence(sequence.id)}
                          disabled={isLoading}
                          className="app-btn app-btn-danger app-btn-icon app-btn-sm disabled:opacity-50"
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
        <div className="app-modal-overlay app-modal-overlay--top">
          <div className="app-modal-card app-modal-card--lg">
            <div className="app-modal-header">
              <div>
              <div className="app-modal-kicker">Secuencias</div>
              <h2 className="app-modal-title">
                {isEditMode ? 'Editar secuencia' : 'Crear secuencia'}
              </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                  setInsertAfterSequenceId(null);
                  setModalSelectedAsignatura('');
                  setModalSelectedTema('');
                  setModalTemas([]);
                  setModalSubtemas([]);
                }}
                className="app-modal-close"
              >
                ✕
              </button>
            </div>

            <div className="app-modal-scroll">
            <div className="app-form-layout">
            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence} className="space-y-4">
              {/* Filtros en Modal */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-[#3A4A5B] mb-3">Filtrar subtemas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Asignatura
                    </label>
                    <select
                      value={effectiveModalSelectedAsignatura}
                      onChange={(e) => handleModalFilterChange('Asignatura', e.target.value)}
                      disabled={asignaturaId !== undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Todas las asignaturas</option>
                      {asignaturas.map(Asignatura => (
                        <option key={Asignatura.id} value={Asignatura.id}>
                          {Asignatura.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tema
                    </label>
                    <select
                      value={effectiveModalSelectedTema}
                      onChange={(e) => handleModalFilterChange('tema', e.target.value)}
                      disabled={!effectiveModalSelectedAsignatura || temaId !== undefined}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Todos los temas</option>
                      {effectiveModalTemas.map(tema => (
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
                  <option value="">Seleccionar subtema de origen</option>
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
                    El origen se definió con base en la secuencia actual.
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
                  <option value="">Seleccionar subtema de destino</option>
                  {getAvailableDestinationModalSubtemas().map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
                {isEditMode && selectedSequence && formData.subtema_origen_id && Number(formData.subtema_origen_id) !== Number(selectedSequence.subtema_origen_id) && (
                  <p className="mt-2 text-xs text-gray-500">
                    El destino se mantiene para conservar la continuidad de la cadena.
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
                  placeholder="Descripción de la relación"
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
              <div className="app-form-footer mt-6 border-t-0 px-0 pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                    setModalSelectedAsignatura('');
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
                      <span>{isEditMode ? 'Actualizar secuencia' : 'Crear secuencia'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
