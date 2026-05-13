import { useState, useEffect } from 'react';

import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ArrowDownUp } from 'lucide-react';

const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

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
  /** Navega directamente al nivel indicado (0=panel, 1=asignatura, 2=tema). */
  onNavigateToBreadcrumb?: (index: number) => void;

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
  onNavigateToBreadcrumb,

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
      if (used.both.has(s.id) && Number(s.id) !== Number(currentOrigenId)) return false;
      if (used.origin.has(s.id) && Number(s.id) !== Number(currentOrigenId)) return false;
      if (currentDestinoId && Number(s.id) === Number(currentDestinoId)) return false;
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
      if (used.both.has(s.id) && Number(s.id) !== Number(currentDestinoId)) return false;
      if (used.destination.has(s.id) && Number(s.id) !== Number(currentDestinoId)) return false;
      // Excluir siempre el subtema seleccionado como origen
      if (effectiveOrigenId && Number(s.id) === Number(effectiveOrigenId)) return false;
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

    // Fijar contexto al tema actual para que los selects solo muestren subtemas del tema
    if (temaId !== undefined) {
      setModalSelectedTema(temaId.toString());
      setModalSubtemas(subtemas.filter(s => Number(s.tema_id) === Number(temaId) && s.estado !== false));
    } else if (asignaturaId !== undefined) {
      setModalSelectedAsignatura(asignaturaId.toString());
      const temasAsig = temas.filter(t => Number(t.asignatura_id) === Number(asignaturaId));
      setModalTemas(temasAsig);
      setModalSubtemas(subtemas.filter(s => temasAsig.some(t => Number(t.id) === Number(s.tema_id)) && s.estado !== false));
    } else {
      setModalSubtemas(subtemas.filter(s => s.estado !== false));
    }

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
                  Secuencia de subtemas
                </p>
                <h1 className="leading-tight">{temaName || asignaturaName || 'Secuencias'}</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Volver */}
        <button onClick={onBack} className="app-back-button mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(0) : onHome}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {isDocenteMode ? 'Panel docente' : 'Panel admin'}
          </button>
          {asignaturaName && (<><span style={{ color: '#bfd3f5' }}>→</span>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(1) : onBack}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>{asignaturaName}</button></>)}
          {temaName && (<><span style={{ color: '#bfd3f5' }}>→</span>
          <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(2) : onBack}
            className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>{temaName}</button></>)}
          <span style={{ color: '#bfd3f5' }}>→</span>
          <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
            Secuencias
          </span>
        </nav>

        {/* Toolbar compacta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Select Asignatura */}
          {asignaturaId === undefined && (
            <select
              value={effectiveSelectedAsignatura}
              onChange={e => handleFilterChange('Asignatura', e.target.value)}
              className="rounded-xl px-3 text-sm font-medium outline-none"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px', minWidth: '200px' }}
            >
              <option value="">Todas las asignaturas</option>
              {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          )}
          {/* Select Tema */}
          {temaId === undefined && (
            <select
              value={effectiveSelectedTema}
              onChange={e => handleFilterChange('tema', e.target.value)}
              disabled={!effectiveSelectedAsignatura}
              className="rounded-xl px-3 text-sm font-medium outline-none disabled:opacity-50"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px', minWidth: '200px' }}
            >
              <option value="">Todos los temas</option>
              {getFilteredTemas().map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          )}
          {/* Búsqueda */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3"
            style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: '40px' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
            <input type="text" placeholder="Buscar secuencias..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
          </div>
          {/* Crear */}
          {!isDocenteMode && (
            <button
              onClick={() => {
                resetForm(); setInsertAfterSequenceId(null);
                if (asignaturaId !== undefined && temaId !== undefined) {
                  setModalSelectedAsignatura(asignaturaId.toString());
                  setModalSelectedTema(temaId.toString());
                  setModalSubtemas(subtemas.filter(s => Number(s.tema_id) === Number(temaId)));
                  const t = temas.find(t => t.id === temaId);
                  if (t) setModalTemas([t]);
                } else if (asignaturaId !== undefined) {
                  setModalSelectedAsignatura(asignaturaId.toString());
                  setModalSelectedTema('');
                  const ta = temas.filter(t => Number(t.asignatura_id) === Number(asignaturaId));
                  setModalTemas(ta);
                  setModalSubtemas(subtemas.filter(s => ta.some(t => Number(t.id) === Number(s.tema_id))));
                } else {
                  setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalTemas([]); setModalSubtemas(subtemas);
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: '40px', whiteSpace: 'nowrap' }}>
              <Plus className="w-4 h-4" />
              Crear secuencia
            </button>
          )}
        </div>



        {error && (
          <div className="app-alert app-alert--error mb-4"><p>{error}</p></div>
        )}

        {isLoadingData ? (
          <div className="app-empty-panel py-12 flex flex-col items-center gap-3">
            <Loader className="w-7 h-7 animate-spin" style={{ color: '#1a56db' }} />
            <p style={{ color: '#4a6fa5' }}>Cargando secuencias...</p>
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

                              isDraggedOver ? 'ring-2 ring-[#1a56db] ring-offset-2' : ''

                            }`}

                            title={`Gestionar contenidos de ${subtema?.nombre}`}

                          >

                            <span className="app-sequence-node__type" style={{ backgroundColor: '#1a56db' }}>

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

                          style={{ borderColor: '#1a56db33' }}

                          title={`Gestionar contenidos de ${origen?.nombre}`}

                        >

                          <span className="app-sequence-card__label" style={{ backgroundColor: '#1a56db' }}>

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

                          style={{ borderColor: '#1a56db33' }}

                          title={`Gestionar contenidos de ${destino?.nombre}`}

                        >

                          <span className="app-sequence-card__label" style={{ backgroundColor: '#1a56db' }}>

                            Destino

                          </span>

                          <div className="app-sequence-card__title">{destino?.nombre || 'N/A'}</div>

                        </button>



                        {sequence.descripcion && (

                          <div className="app-sequence-card__meta">{sequence.descripcion}</div>

                        )}

                      </div>



                      <div className="flex items-center gap-2">
                        {!isDocenteMode && (
                          <button onClick={() => handleToggleEstado(sequence.id, sequence.estado)}
                            disabled={isLoading}
                            className="flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ width:'32px', height:'32px', ...(sequence.estado ? { background:'#fef2f2', color:'#b91c1c' } : { background:'#ecfdf5', color:'#047857' }) }}
                            title={sequence.estado ? 'Desactivar' : 'Activar'}>
                            {sequence.estado ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => handleEditSequence(sequence)}
                          className="flex items-center justify-center rounded-lg transition-all hover:opacity-80"
                          style={{ width:'32px', height:'32px', background:'#dbeafe', color:'#1a56db' }}
                          title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteSequence(sequence.id)}
                          disabled={isLoading}
                          className="flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                          style={{ width:'32px', height:'32px', background:'#fef2f2', color:'#b91c1c' }}
                          title="Eliminar">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ width: '460px', maxHeight: '90vh', background: '#fff' }}
            onClick={e => e.stopPropagation()}>

            {/* Cabecera azul */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Secuencias</p>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                  {isEditMode ? 'Editar secuencia' : 'Crear secuencia'}
                </h3>
              </div>
              <button type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalTemas([]); setModalSubtemas([]); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', lineHeight: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>✕</span>
              </button>
            </div>

            {/* Cuerpo */}
            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence}
              style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Filtros contexto */}
              {(asignaturaId === undefined || temaId === undefined) && (
                <div style={{ background: '#f0f5ff', borderRadius: '12px', padding: '12px 14px', border: '1.5px solid #bfd3f5' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#4a6fa5', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contexto</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {asignaturaId === undefined && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a5f', display: 'block', marginBottom: '4px' }}>Asignatura</label>
                        <select value={effectiveModalSelectedAsignatura}
                          onChange={e => handleModalFilterChange('Asignatura', e.target.value)}
                          disabled={asignaturaId !== undefined}
                          className="app-form-select" style={{ fontSize: '12px', minHeight: 'unset', padding: '6px 10px' }}>
                          <option value="">Todas</option>
                          {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                      </div>
                    )}
                    {temaId === undefined && (
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#1e3a5f', display: 'block', marginBottom: '4px' }}>Tema</label>
                        <select value={effectiveModalSelectedTema}
                          onChange={e => handleModalFilterChange('tema', e.target.value)}
                          disabled={!effectiveModalSelectedAsignatura || temaId !== undefined}
                          className="app-form-select" style={{ fontSize: '12px', minHeight: 'unset', padding: '6px 10px' }}>
                          <option value="">Todos</option>
                          {effectiveModalTemas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Subtema Origen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Subtema Origen *</label>
                {(() => {
                  const { lockedOriginId } = getModalChainContext();
                  const isOriginLocked = Boolean(lockedOriginId && !isEditMode);
                  return (
                    <select name="subtema_origen_id" value={formData.subtema_origen_id}
                      onChange={handleInputChange} disabled={isOriginLocked} required
                      className="app-form-select" style={{ fontSize: '13px' }}>
                      <option value="">Seleccionar origen</option>
                      {getAvailableOriginModalSubtemas().map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  );
                })()}
                {!isEditMode && getModalChainContext().lockedOriginId && (
                  <p style={{ fontSize: '11px', color: '#4a6fa5' }}>El origen se definió con base en la secuencia actual.</p>
                )}
              </div>

              {/* Subtema Destino */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Subtema Destino *</label>
                <select name="subtema_destino_id" value={formData.subtema_destino_id}
                  onChange={handleInputChange} required className="app-form-select" style={{ fontSize: '13px' }}>
                  <option value="">Seleccionar destino</option>
                  {getAvailableDestinationModalSubtemas().map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              {/* Descripción */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Descripción (opcional)</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange}
                  placeholder="Descripción de la relación" rows={3}
                  className="app-form-textarea" style={{ fontSize: '13px', minHeight: '80px' }} />
              </div>

              {/* Estado */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f' }}>Estado</label>
                <select name="estado" value={formData.estado ? 'true' : 'false'}
                  onChange={handleInputChange} className="app-form-select" style={{ fontSize: '13px' }}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </form>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff', flexShrink: 0 }}>
              <button type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalTemas([]); setModalSubtemas([]); }}
                disabled={isLoading}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={isEditMode ? handleUpdateSequence as any : handleCreateSequence as any}
                disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 22px', borderRadius: '10px', background: isLoading ? '#6b8fc8' : 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                {isLoading ? <><Loader className="w-4 h-4 animate-spin" />{isEditMode ? 'Actualizando...' : 'Creando...'}</> : <>{isEditMode ? 'Actualizar' : 'Crear secuencia'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

}

