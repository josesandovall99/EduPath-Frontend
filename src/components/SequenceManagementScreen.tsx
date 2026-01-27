import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ChevronUp, ChevronDown, ArrowDownUp } from 'lucide-react';
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
  subtemaId?: number;
  temaId?: number;
  areaId?: number;
  areaName?: string;
  temaName?: string;
  subtemaNombre?: string;
}

export function SequenceManagementScreen({ onBack, subtemaId, temaId, areaId, areaName, temaName, subtemaNombre }: SequenceManagementScreenProps) {
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

  // Si viene un subtemaId, establecer los filtros automáticamente
  useEffect(() => {
    if (areaId !== undefined && temaId && subtemaId) {
      setSelectedArea(areaId.toString());
      setSelectedTema(temaId.toString());
      setSelectedSubtema(subtemaId.toString());
      
      // Pre-llenar los filtros del modal también
      setModalSelectedArea(areaId.toString());
      setModalSelectedTema(temaId.toString());
      setModalSelectedSubtema(subtemaId.toString());
      
      // Cargar temas del área en el modal
      const temasArea = temas.filter(t => Number(t.area_id) === Number(areaId));
      setModalTemas(temasArea);
      
      // Cargar subtemas del tema en el modal
      const filtered = subtemas.filter(s => s.tema_id === temaId);
      setModalSubtemas(filtered);
      
      // Cargar contenidos del subtema en el modal
      const contenidosFiltered = contents.filter(c => c.subtema_id === subtemaId);
      setModalContents(contenidosFiltered);
    }
  }, [areaId, temaId, subtemaId, temas, subtemas, contents]);

  // Cuando se abre el modal, asegurar que los filtros estén pre-llenados
  useEffect(() => {
    if (showCreateModal && areaId !== undefined && temaId && subtemaId) {
      setModalSelectedArea(areaId.toString());
      setModalSelectedTema(temaId.toString());
      setModalSelectedSubtema(subtemaId.toString());
      
      // Cargar los datos del modal
      const temasArea = temas.filter(t => Number(t.area_id) === Number(areaId));
      setModalTemas(temasArea);
      
      const filtered = subtemas.filter(s => s.tema_id === temaId);
      setModalSubtemas(filtered);
      
      // Cargar contenidos del subtema
      const contenidosFiltered = contents.filter(c => c.subtema_id === subtemaId);
      setModalContents(contenidosFiltered);
    }
  }, [showCreateModal, areaId, temaId, subtemaId, temas, subtemas, contents]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [areasRes, temasRes, subtemasRes, contentsRes, sequencesRes] = await Promise.all([
        fetch('http://localhost:4000/areas'),
        fetch('http://localhost:4000/temas'),
        fetch('http://localhost:4000/subtemas'),
        fetch('http://localhost:4000/contenidos'),
        fetch('http://localhost:4000/secuencias-contenido')
      ]);

      if (!areasRes.ok || !temasRes.ok || !subtemasRes.ok || !contentsRes.ok || !sequencesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const areasData = await areasRes.json();
      const temasData = await temasRes.json();
      const subtemasData = await subtemasRes.json();
      let contentsData = await contentsRes.json();
      const sequencesData = await sequencesRes.json();

      // Si se proporciona un subtemaId, filtrar contenidos solo de ese subtema
      if (subtemaId) {
        contentsData = contentsData.filter((c: ContentItem) => c.subtema_id === subtemaId);
      }

      setAreas(areasData);
      setTemas(temasData);
      setSubtemas(subtemasData);
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

    // Recorrer todas las secuencias para identificar contenidos usados
    sequences.forEach(seq => {
      used.origin.add(seq.contenido_origen_id);
      used.destination.add(seq.contenido_destino_id);
    });

    // Identificar contenidos que son tanto origen como destino
    used.origin.forEach(id => {
      if (used.destination.has(id)) {
        used.both.add(id);
      }
    });

    return used;
  };

  // --- Modal-specific helpers to filtrar contenidos dentro del modal Crear Secuencia ---
  const getFilteredModalContents = () => {
    // Si viene de un subtema específico, solo mostrar contenidos de ese subtema
    if (subtemaId) {
      return modalContents.filter(c => c.subtema_id === subtemaId);
    }
    
    return modalContents.filter(c => {
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
    const currentDestinoId = formData.contenido_destino_id ? parseInt(formData.contenido_destino_id) : null;
    
    // En modo edición, permitir mantener el origen actual aunque esté usado en otra secuencia
    const currentOrigenId = isEditMode && selectedSequence 
      ? selectedSequence.contenido_origen_id 
      : null;
    
    const available = filtered.filter(c => {
      // Excluir contenidos que son tanto origen como destino (excepto el actual en edición)
      // Estos contenidos ya están completamente usados
      if (used.both.has(c.id) && c.id !== currentOrigenId) {
        return false;
      }
      
      // Excluir contenidos que ya son origen en otras secuencias (excepto el actual en edición)
      // Esto evita que un contenido aparezca como opción de origen si ya es origen en otra secuencia
      if (used.origin.has(c.id) && c.id !== currentOrigenId) {
        return false;
      }
      
      // Excluir el contenido seleccionado actualmente como destino
      // Para evitar seleccionar el mismo contenido como origen y destino
      if (currentDestinoId && c.id === currentDestinoId) {
        return false;
      }
      
      return true;
    });
    
    return available;
  };

  const getAvailableDestinationModalContents = () => {
    const filtered = getFilteredModalContents();
    const used = getUsedContents();
    const currentOrigenId = formData.contenido_origen_id ? parseInt(formData.contenido_origen_id) : null;
    
    // En modo edición, permitir mantener el destino actual aunque esté usado en otra secuencia
    const currentDestinoId = isEditMode && selectedSequence 
      ? selectedSequence.contenido_destino_id 
      : null;
    
    const available = filtered.filter(c => {
      // Excluir contenidos que son tanto origen como destino (excepto el actual en edición)
      // Estos contenidos ya están completamente usados
      if (used.both.has(c.id) && c.id !== currentDestinoId) {
        return false;
      }
      
      // Excluir contenidos que ya son destino en otras secuencias (excepto el actual en edición)
      // Esto evita que un contenido aparezca como opción de destino si ya es destino en otra secuencia
      if (used.destination.has(c.id) && c.id !== currentDestinoId) {
        return false;
      }
      
      // Excluir el contenido seleccionado actualmente como origen
      // Para evitar seleccionar el mismo contenido como origen y destino
      if (currentOrigenId && c.id === currentOrigenId) {
        return false;
      }
      
      return true;
    });
    
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
    } else if (name === 'contenido_origen_id') {
      // Si se cambia el origen, limpiar el destino si es el mismo contenido
      setFormData(prev => {
        const newValue = value;
        if (prev.contenido_destino_id === newValue && newValue) {
          return { ...prev, [name]: newValue, contenido_destino_id: '' };
        }
        return { ...prev, [name]: newValue };
      });
    } else if (name === 'contenido_destino_id') {
      // Si se cambia el destino, limpiar el origen si es el mismo contenido
      setFormData(prev => {
        const newValue = value;
        if (prev.contenido_origen_id === newValue && newValue) {
          return { ...prev, [name]: newValue, contenido_origen_id: '' };
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
      const origenId = parseInt(formData.contenido_origen_id);
      const destinoId = parseInt(formData.contenido_destino_id);


      // Validar que origen y destino no sean el mismo
      if (origenId === destinoId) {
        setError('El contenido origen no puede ser el mismo que el destino');
        setIsLoading(false);
        return;
      }

      // Si estamos insertando en el medio de una secuencia existente
      // Ejemplo: B->C, insertamos X entre B y C
      // Resultado: B->X (origen siempre es el anterior) y X->C (destino del intermedio es el destino original)
      if (insertAfterSequenceId) {
        const afterSequence = sequences.find(s => s.id === insertAfterSequenceId);
        if (afterSequence) {
          // Guardar el destino original de la secuencia existente (C)
          const destinoOriginal = afterSequence.contenido_destino_id;
          
          // El origen SIEMPRE debe ser el que ya está (B)
          // El destino es el nuevo contenido intermedio (X)
          // Paso 1: Actualizar la secuencia existente B->C para que sea B->X
          await fetch(`http://localhost:4000/secuencias-contenido/${insertAfterSequenceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contenido_origen_id: afterSequence.contenido_origen_id, // B (siempre el anterior)
              contenido_destino_id: origenId, // X (el nuevo contenido intermedio)
              descripcion: afterSequence.descripcion,
              estado: afterSequence.estado
            })
          });

          // Paso 2: Crear nueva secuencia X->C (desde el contenido intermedio al destino original)
          await fetch('http://localhost:4000/secuencias-contenido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contenido_origen_id: origenId, // X es origen (el intermedio)
              contenido_destino_id: destinoOriginal, // C es destino (el destino original)
              descripcion: formData.descripcion || null,
              estado: formData.estado
            })
          });
        }
      } else {
        // Creación normal de secuencia
        const payload = {
          contenido_origen_id: origenId,
          contenido_destino_id: destinoId,
          descripcion: formData.descripcion || null,
          estado: formData.estado
        };

        const response = await fetch('http://localhost:4000/secuencias-contenido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear la secuencia');
        }
      }

      // Recargar todas las secuencias del backend para tener el estado actualizado
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
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
      const origenId = parseInt(formData.contenido_origen_id);
      const destinoId = parseInt(formData.contenido_destino_id);

      // Validar que origen y destino no sean el mismo
      if (origenId === destinoId) {
        setError('El contenido origen no puede ser el mismo que el destino');
        setIsLoading(false);
        return;
      }

      const payload = {
        contenido_origen_id: origenId,
        contenido_destino_id: destinoId,
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


      // Recargar todas las secuencias del backend para tener el estado actualizado
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
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

      // Recargar todas las secuencias del backend para tener el estado actualizado
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
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

      // Encontrar la secuencia anterior (que apunta al origen de la que se va a eliminar)
      const prevSeq = sequences.find(s => 
        s.id !== id && 
        s.contenido_destino_id === seqToDelete.contenido_origen_id &&
        s.estado // Solo secuencias activas
      );

      // Encontrar la secuencia siguiente (que tiene como origen el destino de la que se va a eliminar)
      const nextSeq = sequences.find(s => 
        s.id !== id && 
        s.contenido_origen_id === seqToDelete.contenido_destino_id &&
        s.estado // Solo secuencias activas
      );

      // Preparar payload para el backend con las secuencias adyacentes
      // El backend se encargará de reconectar automáticamente
      const deletePayload: any = {};
      if (prevSeq && nextSeq) {
        deletePayload.prevSequenceId = prevSeq.id;
        deletePayload.nextSequenceId = nextSeq.id;
      }

      const response = await fetch(`http://localhost:4000/secuencias-contenido/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletePayload)
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la secuencia');
      }

      // Recargar todas las secuencias del backend para tener el estado actualizado
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
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
      contenido_origen_id: '',
      contenido_destino_id: '',
      descripcion: '',
      estado: true
    });
    setIsEditMode(false);
    setSelectedSequence(null);
  };

  const filteredSequences = sequences.filter(seq => {
    const origenContent = contents.find(c => c.id === seq.contenido_origen_id);
    const destinoContent = contents.find(c => c.id === seq.contenido_destino_id);
    
    // Si se proporciona subtemaId, solo mostrar secuencias de contenidos de ese subtema
    if (subtemaId !== undefined) {
      if (!origenContent || !destinoContent) return false;
      if (origenContent.subtema_id !== subtemaId || destinoContent.subtema_id !== subtemaId) {
        return false;
      }
    }
    
    // Filtrar por término de búsqueda
    const origen = origenContent?.titulo || '';
    const destino = destinoContent?.titulo || '';
    const term = searchTerm.toLowerCase();
    return origen.toLowerCase().includes(term) || destino.toLowerCase().includes(term) || seq.descripcion?.toLowerCase().includes(term);
  });

  // Construir secuencia ordenada visualmente (cadena de contenidos)
  const buildOrderedSequence = () => {
    if (sequences.length === 0) return [];

    const sequenceMap = new Map<number, number>(); // origen_id -> destino_id
    const destinos = new Set<number>();
    const secuenciasActivas = sequences.filter(s => s.estado);

    // Construir mapa de secuencias
    secuenciasActivas.forEach(seq => {
      sequenceMap.set(seq.contenido_origen_id, seq.contenido_destino_id);
      destinos.add(seq.contenido_destino_id);
    });

    // Encontrar contenidos iniciales (que no son destino)
    const contenidosIniciales = new Set<number>();
    secuenciasActivas.forEach(seq => {
      if (!destinos.has(seq.contenido_origen_id)) {
        contenidosIniciales.add(seq.contenido_origen_id);
      }
    });

    // Si no hay iniciales, usar el primer origen disponible
    if (contenidosIniciales.size === 0 && secuenciasActivas.length > 0) {
      contenidosIniciales.add(secuenciasActivas[0].contenido_origen_id);
    }

    const ordered: Array<{ contenido_id: number; sequence_id?: number; isStart: boolean }> = [];
    const visited = new Set<number>();

    // Función recursiva para construir la cadena
    const addToChain = (contenidoId: number, isStart: boolean = false) => {
      if (visited.has(contenidoId)) return;
      
      const contenido = contents.find(c => c.id === contenidoId);
      if (!contenido) return;

      // Encontrar la secuencia que tiene este contenido como origen
      const seq = secuenciasActivas.find(s => s.contenido_origen_id === contenidoId);
      
      ordered.push({
        contenido_id: contenidoId,
        sequence_id: seq?.id,
        isStart
      });
      visited.add(contenidoId);

      // Continuar con el destino
      const destinoId = sequenceMap.get(contenidoId);
      if (destinoId) {
        addToChain(destinoId, false);
      }
    };

    // Construir todas las cadenas desde los iniciales
    contenidosIniciales.forEach(initId => {
      addToChain(initId, true);
    });

    // Agregar contenidos que están en secuencias pero no fueron visitados (ramas)
    secuenciasActivas.forEach(seq => {
      if (!visited.has(seq.contenido_origen_id)) {
        const contenido = contents.find(c => c.id === seq.contenido_origen_id);
        if (contenido) {
          ordered.push({
            contenido_id: seq.contenido_origen_id,
            sequence_id: seq.id,
            isStart: false
          });
        }
      }
      if (!visited.has(seq.contenido_destino_id)) {
        const contenido = contents.find(c => c.id === seq.contenido_destino_id);
        if (contenido) {
          ordered.push({
            contenido_id: seq.contenido_destino_id,
            sequence_id: seq.id,
            isStart: false
          });
        }
      }
    });

    return ordered;
  };

  const orderedSequence = buildOrderedSequence();

  // Función para guardar el nuevo orden después de drag and drop
  const handleSaveOrder = async (newOrder: Array<{ contenido_id: number; sequence_id?: number }>) => {
    setIsLoading(true);
    try {
      // Extraer solo los IDs de contenido en el nuevo orden
      const contenidosOrdenados = newOrder.map(item => item.contenido_id);

      // Usar el nuevo endpoint de reordenamiento
      const response = await fetch('http://localhost:4000/secuencias-contenido/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenidos: contenidosOrdenados
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el orden');
      }

      const result = await response.json();

      // Recargar secuencias para reflejar los cambios
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
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

  // Función para mover secuencia arriba (intercambiar destinos con la anterior)
  // Ejemplo: A->B, B->C -> A->C, C->B (intercambia B y C)
  const handleMoveUp = async (sequenceId: number) => {
    const seq = sequences.find(s => s.id === sequenceId);
    if (!seq) return;

    setIsLoading(true);
    try {
      // Encontrar la secuencia que apunta al origen de la actual (secuencia anterior)
      const prevSeq = sequences.find(s => 
        s.id !== sequenceId &&
        s.contenido_destino_id === seq.contenido_origen_id &&
        s.estado
      );

      if (!prevSeq) {
        setIsLoading(false);
        return; // No hay secuencia anterior, ya está al inicio
      }

      // Intercambiar los destinos: prev.destino <-> seq.destino
      const tempDestino = prevSeq.contenido_destino_id;
      
      await Promise.all([
        // Actualizar secuencia anterior: origen -> destino de la actual
        fetch(`http://localhost:4000/secuencias-contenido/${prevSeq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido_origen_id: prevSeq.contenido_origen_id,
            contenido_destino_id: seq.contenido_destino_id,
            descripcion: prevSeq.descripcion,
            estado: prevSeq.estado
          })
        }),
        // Actualizar secuencia actual: origen -> destino anterior
        fetch(`http://localhost:4000/secuencias-contenido/${sequenceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido_origen_id: seq.contenido_origen_id,
            contenido_destino_id: tempDestino,
            descripcion: seq.descripcion,
            estado: seq.estado
          })
        })
      ]);

      // Recargar secuencias
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
        setSuccess('Secuencia reorganizada exitosamente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reorganizar');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para mover secuencia abajo (intercambiar destinos con la siguiente)
  // Ejemplo: A->B, B->C -> A->C, C->B (intercambia B y C)
  const handleMoveDown = async (sequenceId: number) => {
    const seq = sequences.find(s => s.id === sequenceId);
    if (!seq) return;

    setIsLoading(true);
    try {
      // Encontrar la secuencia que sale del destino de la actual (secuencia siguiente)
      const nextSeq = sequences.find(s => 
        s.id !== sequenceId &&
        s.contenido_origen_id === seq.contenido_destino_id &&
        s.estado
      );

      if (!nextSeq) {
        setIsLoading(false);
        return; // No hay secuencia siguiente, ya está al final
      }

      // Intercambiar los destinos: seq.destino <-> next.destino
      const tempDestino = seq.contenido_destino_id;
      
      await Promise.all([
        // Actualizar secuencia actual: origen -> destino de la siguiente
        fetch(`http://localhost:4000/secuencias-contenido/${sequenceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido_origen_id: seq.contenido_origen_id,
            contenido_destino_id: nextSeq.contenido_destino_id,
            descripcion: seq.descripcion,
            estado: seq.estado
          })
        }),
        // Actualizar secuencia siguiente: origen -> destino anterior de la actual
        fetch(`http://localhost:4000/secuencias-contenido/${nextSeq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenido_origen_id: tempDestino, // Ahora el origen es el destino anterior
            contenido_destino_id: nextSeq.contenido_destino_id,
            descripcion: nextSeq.descripcion,
            estado: nextSeq.estado
          })
        })
      ]);

      // Recargar secuencias
      const sequencesRes = await fetch('http://localhost:4000/secuencias-contenido');
      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json();
        setSequences(sequencesData);
        setSuccess('Secuencia reorganizada exitosamente');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reorganizar');
    } finally {
      setIsLoading(false);
    }
  };

  // Estado para insertar en medio
  const [insertAfterSequenceId, setInsertAfterSequenceId] = useState<number | null>(null);
  
  // Estado para drag and drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

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
                <h1 className="text-[#3A4A5B]">
                  {subtemaId ? 'Gestión de Secuencias de Contenidos' : 'Gestión de Secuencias'}
                </h1>
                {subtemaId && areaName && temaName && subtemaNombre && (
                  <p className="text-gray-500 text-sm">
                    Área: {areaName} → Tema: {temaName} → Subtema: {subtemaNombre}
                  </p>
                )}
                {subtemaId && !areaName && (
                  <p className="text-gray-500 text-sm">
                    Subtema: {subtemas.find(s => s.id === subtemaId)?.nombre}
                  </p>
                )}
                {!subtemaId && (
                  <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setInsertAfterSequenceId(null);
                // Pre-fill filters if all context is provided
                if (areaId !== undefined && temaId && subtemaId) {
                  setModalSelectedArea(areaId.toString());
                  setModalSelectedTema(temaId.toString());
                  setModalSelectedSubtema(subtemaId.toString());
                  
                  const temasArea = temas.filter(t => Number(t.area_id) === Number(areaId));
                  setModalTemas(temasArea);
                  
                  const filtered = subtemas.filter(s => s.tema_id === temaId);
                  setModalSubtemas(filtered);
                  
                  const contenidosFiltered = contents.filter(c => c.subtema_id === subtemaId);
                  setModalContents(contenidosFiltered);
                } else {
                  setModalSelectedArea('');
                  setModalSelectedTema('');
                  setModalSelectedSubtema('');
                  setModalTemas([]);
                  setModalSubtemas([]);
                  setModalContents(contents);
                }
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
          <span>{subtemaId ? 'Volver a Secuencias de Subtemas' : 'Volver al Panel'}</span>
        </button>

        {/* Informational Message */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#4A90E2] to-[#357abd] text-white rounded-xl shadow-lg">
          <h2 className="text-lg font-bold mb-2">Gestión de Secuencias de Contenidos</h2>
          <p className="text-sm opacity-95">
            Define el orden en que los estudiantes deben completar cada contenido dentro de un subtema.
            Establece dependencias entre contenidos para crear una ruta de aprendizaje progresiva y estructurada.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowRight className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{filteredSequences.length}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Secuencias</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-[#7ED6A7]" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">
                {filteredSequences.filter(s => s.estado).length}
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

        {/* Stats Helper Message */}
        <div className="mb-6 p-4 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] rounded-xl text-white">
          <p className="text-sm">
            📊 <span className="font-semibold">Estado de tus secuencias:</span> Supervisa el total de secuencias de contenidos, 
            cuántas están activas guiando el flujo de aprendizaje, y cuántas están inactivas.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              📋 <span className="font-medium">Utiliza los filtros</span> para buscar secuencias específicas por área, tema o contenido.
            </p>
          </div>
          <h3 className="text-lg font-semibold text-[#3A4A5B] mb-4">Filtrar por:</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Área
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                disabled={subtemaId !== undefined}
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
                disabled={!selectedArea || subtemaId !== undefined}
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
                disabled={!selectedTema || subtemaId !== undefined}
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
            {/* Vista de Secuencias Ordenadas */}
            {orderedSequence.length > 0 ? (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#3A4A5B]">Secuencia Ordenada</h3>
                  <button
                    onClick={() => setInsertAfterSequenceId(null)}
                    className="text-sm text-gray-600 hover:text-[#4A90E2]"
                  >
                    {insertAfterSequenceId ? 'Cancelar inserción' : 'Vista completa'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg overflow-x-auto">
                  {orderedSequence.map((item, index) => {
                    const contenido = contents.find(c => c.id === item.contenido_id);
                    const sequence = item.sequence_id ? sequences.find(s => s.id === item.sequence_id) : null;
                    const isLast = index === orderedSequence.length - 1;
                    const isDragging = draggedItem === index;
                    const isDraggedOver = draggedOverIndex === index;

                    return (
                      <div 
                        key={`${item.contenido_id}-${index}`} 
                        className="flex items-center gap-2"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div 
                            className="relative"
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem(index);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            onDragEnd={() => {
                              if (draggedItem !== null && draggedOverIndex !== null && draggedItem !== draggedOverIndex) {
                                // Reorganizar el array
                                const newOrder = [...orderedSequence];
                                const [removed] = newOrder.splice(draggedItem, 1);
                                newOrder.splice(draggedOverIndex, 0, removed);
                                
                                // Guardar el nuevo orden
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
                            onDragLeave={() => {
                              if (draggedOverIndex === index) {
                                setDraggedOverIndex(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              // El drop se maneja en onDragEnd
                            }}
                          >
                            <div
                              className={`px-4 py-2 rounded-lg text-white font-semibold min-w-[150px] text-center cursor-move hover:opacity-90 transition-opacity ${
                                isDragging ? 'opacity-50 scale-95' : ''
                              } ${
                                isDraggedOver ? 'ring-2 ring-[#4A90E2] ring-offset-2' : ''
                              }`}
                              style={{ backgroundColor: getTypeColor(contenido?.tipo || '') }}
                              title={`${contenido?.titulo || 'N/A'} - Arrastra para reorganizar`}
                            >
                              {contenido?.titulo || 'N/A'}
                            </div>
                          </div>
                          {insertAfterSequenceId === item.sequence_id && (
                            <div className="text-xs text-gray-500 mt-1">
                              ↓ Insertar aquí
                            </div>
                          )}
                        </div>
                        {!isLast && (
                          <div className="flex flex-col items-center">
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                            {item.sequence_id && (
                              <button
                                onClick={() => {
                                  if (insertAfterSequenceId === item.sequence_id) {
                                    setInsertAfterSequenceId(null);
                                    setShowCreateModal(true);
                                  } else {
                                    setInsertAfterSequenceId(item.sequence_id || null);
                                  }
                                }}
                                className="mt-1 text-xs text-[#4A90E2] hover:underline"
                                title="Insertar contenido aquí"
                              >
                                + Insertar
                              </button>
                            )}
                          </div>
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
                  <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#4A90E2] to-[#357abd] rounded-full flex items-center justify-center opacity-10"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay secuencias disponibles</h3>
                  <p className="text-gray-600 mb-4">
                    Crea tu primera secuencia para establecer el orden de aprendizaje de los contenidos.
                  </p>
                  <p className="text-sm text-gray-500">
                    💡 Una secuencia define qué contenido debe completarse después de otro, creando un flujo educativo cohesivo.
                  </p>
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
              <div>
                <h2 className="text-2xl font-bold text-[#3A4A5B]">
                  {isEditMode ? 'Editar Secuencia' : insertAfterSequenceId ? 'Insertar Contenido en Secuencia' : 'Crear Nueva Secuencia'}
                </h2>
                {insertAfterSequenceId && (
                  <p className="text-sm text-gray-600 mt-1">
                    Se insertará en el medio de la secuencia seleccionada
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                  setInsertAfterSequenceId(null);
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

            {/* Helper Message */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">💡 Consejo:</span> Selecciona un contenido origen y el destino que debe completarse después. 
                Esto crea un flujo educativo que los estudiantes deben seguir.
              </p>
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
                      onChange={(e) => !subtemaId && handleModalFilterChange('area', e.target.value)}
                      disabled={subtemaId !== undefined}
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
                      onChange={(e) => !subtemaId && handleModalFilterChange('tema', e.target.value)}
                      disabled={!modalSelectedArea || subtemaId !== undefined}
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
                      onChange={(e) => !subtemaId && handleModalFilterChange('subtema', e.target.value)}
                      disabled={!modalSelectedTema || subtemaId !== undefined}
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
