import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ChevronUp, ChevronDown, ArrowDownUp } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface Area {
  id: number;
  nombre: string;
}

interface Tema {
  id: number;
  nombre: string;
  area_id: number;
  estado?: boolean;
}

interface Subtema {
  id: number;
  nombre: string;
  tema_id: number;
  estado?: boolean;
}

interface ContentItem {
  id: number;
  titulo: string;
  tipo: 'video' | 'document' | 'activity';
  descripcion?: string;
  area_id?: number;
  tema_id?: number;
  subtema_id?: number;
  estado?: boolean;
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

interface SequenceCreationContext {
  subtemaId: number;
  hasExistingChain: boolean;
  lockedOriginId: number | null;
  effectiveOriginId: number | null;
  availableOriginIds: number[];
  availableDestinationIds: number[];
  connectedContentIds: number[];
  totalActiveContents: number;
  contents: ContentItem[];
}

interface SequenceManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  onGoToContentManagement?: () => void;
  subtemaId?: number;
  temaId?: number;
  areaId?: number;
  areaName?: string;
  temaName?: string;
  subtemaNombre?: string;
  mode?: 'admin' | 'docente';
}

export function SequenceManagementScreen({ onBack, onHome, onGoToContentManagement, subtemaId, temaId, areaId, areaName, temaName, subtemaNombre, mode = 'admin' }: SequenceManagementScreenProps) {
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
  const [insertAfterSequenceId, setInsertAfterSequenceId] = useState<number | null>(null);

  // Filtros
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedTema, setSelectedTema] = useState('');
  const [selectedSubtema, setSelectedSubtema] = useState('');
  const incomingAreaValue = areaId !== undefined ? areaId.toString() : '';
  const incomingTemaValue = temaId !== undefined ? temaId.toString() : '';
  const incomingSubtemaValue = subtemaId !== undefined ? subtemaId.toString() : '';
  const effectiveSelectedArea = selectedArea || incomingAreaValue;
  const effectiveSelectedTema = selectedTema || incomingTemaValue;
  const effectiveSelectedSubtema = selectedSubtema || incomingSubtemaValue;

  // Modal-specific filtros (no afectan los filtros de la pantalla)
  const [modalSelectedArea, setModalSelectedArea] = useState('');
  const [modalSelectedTema, setModalSelectedTema] = useState('');
  const [modalSelectedSubtema, setModalSelectedSubtema] = useState('');
  const [modalTemas, setModalTemas] = useState<Tema[]>([]);
  const [modalSubtemas, setModalSubtemas] = useState<Subtema[]>([]);
  const [modalContents, setModalContents] = useState<ContentItem[]>([]);
  const [sequenceCreationContext, setSequenceCreationContext] = useState<SequenceCreationContext | null>(null);

  const [formData, setFormData] = useState({
    contenido_origen_id: '',
    contenido_destino_id: '',
    descripcion: '',
    estado: true
  });

  const isTemaActive = (tema: Tema) => tema.estado !== false;
  const isSubtemaActive = (subtema: Subtema) => subtema.estado !== false;
  const isContentActive = (content: ContentItem) => content.estado !== false;
  const scopedSubtemaQuery = incomingSubtemaValue ? `?subtemaId=${incomingSubtemaValue}` : '';
  const isDocenteMode = mode === 'docente';

  const apiFetch = (path: string, init: RequestInit = {}) => {
    const headers = buildAuthHeaders(init.headers || {});

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include'
    });
  };

  const mapContentsWithArea = (rawContents: ContentItem[], temasCatalog: Tema[]) => {
    const temasById = new Map(temasCatalog.map((tema) => [Number(tema.id), tema]));

    return rawContents.map((content) => ({
      ...content,
      area_id: content.area_id ?? temasById.get(Number(content.tema_id))?.area_id
    }));
  };

  const refreshSequences = async () => {
    const sequencesRes = await apiFetch(`/secuencias-contenido${scopedSubtemaQuery}`);
    if (!sequencesRes.ok) {
      throw new Error('Error al recargar secuencias');
    }

    const sequencesData = await sequencesRes.json();
    setSequences(sequencesData);
  };

  const loadCreationContext = async (subtemaValue: string, originValue?: string) => {
    if (!subtemaValue || isEditMode || insertAfterSequenceId) {
      setSequenceCreationContext(null);
      return;
    }

    const query = new URLSearchParams();
    if (originValue) {
      query.set('origenId', originValue);
    }

    const response = await apiFetch(
      `/secuencias-contenido/subtema/${subtemaValue}/contexto-creacion${query.toString() ? `?${query.toString()}` : ''}`
    );

    if (!response.ok) {
      throw new Error('No se pudo cargar el contexto de creación de la secuencia');
    }

    const context = await response.json() as SequenceCreationContext;
    const normalizedContents = mapContentsWithArea(context.contents || [], temas);

    setSequenceCreationContext({
      ...context,
      contents: normalizedContents
    });
    setModalContents(normalizedContents);

    if (context.lockedOriginId) {
      setFormData((prev) => ({
        ...prev,
        contenido_origen_id: String(context.lockedOriginId),
        contenido_destino_id: prev.contenido_destino_id === String(context.lockedOriginId) ? '' : prev.contenido_destino_id
      }));
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, [incomingSubtemaValue]);

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
      const temasArea = temas.filter((t) => Number(t.area_id) === Number(areaId) && isTemaActive(t));
      setModalTemas(temasArea);
      
      // Cargar subtemas del tema en el modal
      const filtered = subtemas.filter((s) => s.tema_id === temaId && isSubtemaActive(s));
      setModalSubtemas(filtered);
      
      // Cargar contenidos del subtema en el modal
      const contenidosFiltered = contents.filter((c) => c.subtema_id === subtemaId && isContentActive(c));
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
      const temasArea = temas.filter((t) => Number(t.area_id) === Number(areaId) && isTemaActive(t));
      setModalTemas(temasArea);
      
      const filtered = subtemas.filter((s) => s.tema_id === temaId && isSubtemaActive(s));
      setModalSubtemas(filtered);
      
      // Cargar contenidos del subtema
      const contenidosFiltered = contents.filter((c) => c.subtema_id === subtemaId && isContentActive(c));
      setModalContents(contenidosFiltered);
    }
  }, [showCreateModal, areaId, temaId, subtemaId, temas, subtemas, contents]);

  useEffect(() => {
    if (!showCreateModal || isEditMode || insertAfterSequenceId) {
      return;
    }

    const subtemaScope = modalSelectedSubtema || incomingSubtemaValue;
    if (!subtemaScope) {
      setSequenceCreationContext(null);
      return;
    }

    loadCreationContext(subtemaScope, formData.contenido_origen_id).catch((err) => {
      console.error('Error cargando contexto de secuencia:', err);
      setSequenceCreationContext(null);
    });
  }, [showCreateModal, isEditMode, insertAfterSequenceId, modalSelectedSubtema, incomingSubtemaValue, formData.contenido_origen_id, temas]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const contenidosPath = incomingSubtemaValue ? `/contenidos?subtemaId=${incomingSubtemaValue}` : '/contenidos';
      const secuenciasPath = `/secuencias-contenido${scopedSubtemaQuery}`;

      const [areasRes, temasRes, subtemasRes, contentsRes, sequencesRes] = await Promise.all([
        apiFetch('/areas'),
        apiFetch('/temas'),
        apiFetch('/subtemas'),
        apiFetch(contenidosPath),
        apiFetch(secuenciasPath)
      ]);

      if (!areasRes.ok || !temasRes.ok || !subtemasRes.ok || !contentsRes.ok || !sequencesRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const areasData = await areasRes.json();
      const temasData = await temasRes.json();
      const subtemasData = await subtemasRes.json();
      const rawContentsData = await contentsRes.json();
      const sequencesData = await sequencesRes.json();
      const contentsData = mapContentsWithArea(rawContentsData, temasData);

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
  const filteredTemas = temas.filter(isTemaActive);

  // Obtener subtemas filtrados por tema
  // Ya están filtrados del backend, así que usarlos directamente
  const filteredSubtemas = subtemas.filter(isSubtemaActive);

  // Obtener contenidos filtrados por área, tema y subtema
  const getFilteredContents = () => {
    return contents.filter(c => {
      if (!isContentActive(c)) return false;
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
    sequences.filter((sequence) => sequence.estado !== false).forEach(seq => {
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

  const getModalSubtemaId = () => {
    if (modalSelectedSubtema) return Number(modalSelectedSubtema);
    if (subtemaId !== undefined) return Number(subtemaId);
    if (selectedSubtema) return Number(selectedSubtema);
    return null;
  };

  const getModalChainContext = () => {
    const subtemaScopeId = getModalSubtemaId();
    if (!subtemaScopeId) {
      return {
        lockedOriginId: null,
        connectedContentIds: new Set<number>()
      };
    }

    const contenidoIdsSubtema = new Set(
      contents
        .filter((contenido) => Number(contenido.subtema_id) === Number(subtemaScopeId) && isContentActive(contenido))
        .map((contenido) => Number(contenido.id))
    );

    const secuenciasSubtema = sequences.filter((sequence) =>
      contenidoIdsSubtema.has(Number(sequence.contenido_origen_id)) &&
      contenidoIdsSubtema.has(Number(sequence.contenido_destino_id))
    );

    if (secuenciasSubtema.length === 0 || isEditMode) {
      return {
        lockedOriginId: null,
        connectedContentIds: new Set<number>()
      };
    }

    const origenes = new Set(secuenciasSubtema.map((sequence) => Number(sequence.contenido_origen_id)));
    const destinos = new Set(secuenciasSubtema.map((sequence) => Number(sequence.contenido_destino_id)));
    const conectados = new Set<number>([...origenes, ...destinos]);
    const cola = [...destinos].find((destinoId) => !origenes.has(destinoId)) ?? null;

    return {
      lockedOriginId: cola,
      connectedContentIds: conectados
    };
  };

  const hasExistingRelationBetween = (firstContentId: number, secondContentId: number, ignoreSequenceId?: number) => {
    return sequences.some((sequence) => {
      if (ignoreSequenceId && sequence.id === ignoreSequenceId) {
        return false;
      }

      const isDirectRelation =
        Number(sequence.contenido_origen_id) === Number(firstContentId) &&
        Number(sequence.contenido_destino_id) === Number(secondContentId);

      const isInverseRelation =
        Number(sequence.contenido_origen_id) === Number(secondContentId) &&
        Number(sequence.contenido_destino_id) === Number(firstContentId);

      return isDirectRelation || isInverseRelation;
    });
  };

  // --- Modal-specific helpers to filtrar contenidos dentro del modal Crear Secuencia ---
  const getFilteredModalContents = () => {
    if (!isEditMode && !insertAfterSequenceId && sequenceCreationContext) {
      return sequenceCreationContext.contents.filter(isContentActive);
    }

    // Si viene de un subtema específico, solo mostrar contenidos de ese subtema
    if (subtemaId) {
      return modalContents.filter((c) => c.subtema_id === subtemaId && isContentActive(c));
    }
    
    return modalContents.filter(c => {
      if (!isContentActive(c)) return false;
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
    if (!isEditMode && !insertAfterSequenceId && sequenceCreationContext) {
      const availableOriginIds = new Set(sequenceCreationContext.availableOriginIds.map((id) => Number(id)));
      return getFilteredModalContents().filter((content) => availableOriginIds.has(Number(content.id)));
    }

    const filtered = getFilteredModalContents();
    const used = getUsedContents();
    const { lockedOriginId } = getModalChainContext();

    if (lockedOriginId && !isEditMode) {
      return filtered.filter((content) => Number(content.id) === Number(lockedOriginId));
    }

    const currentDestinoId = formData.contenido_destino_id ? parseInt(formData.contenido_destino_id) : null;
    
    // En modo edición, permitir mantener el origen actual aunque esté usado en otra secuencia
    const currentOrigenId = isEditMode && selectedSequence 
      ? selectedSequence.contenido_origen_id 
      : null;
    
    const currentSequenceId = isEditMode && selectedSequence ? selectedSequence.id : undefined;

    const available = filtered.filter(c => {
      if (used.both.has(c.id) && c.id !== currentOrigenId) return false;
      if (used.origin.has(c.id) && c.id !== currentOrigenId) return false;
      if (currentDestinoId && c.id === currentDestinoId) return false;
      if (currentDestinoId && hasExistingRelationBetween(c.id, currentDestinoId, currentSequenceId)) return false;
      return true;
    });
    
    return available;
  };

  const getAvailableDestinationModalContents = () => {
    if (!isEditMode && !insertAfterSequenceId && sequenceCreationContext) {
      const availableDestinationIds = new Set(sequenceCreationContext.availableDestinationIds.map((id) => Number(id)));
      return getFilteredModalContents().filter((content) => availableDestinationIds.has(Number(content.id)));
    }

    const filtered = getFilteredModalContents();
    const used = getUsedContents();
    const { lockedOriginId, connectedContentIds } = getModalChainContext();
    const currentOrigenId = formData.contenido_origen_id ? parseInt(formData.contenido_origen_id) : null;
    const effectiveOrigenId = currentOrigenId || lockedOriginId;
    
    // En modo edición, permitir mantener el destino actual aunque esté usado en otra secuencia
    const currentDestinoId = isEditMode && selectedSequence 
      ? selectedSequence.contenido_destino_id 
      : null;

    const currentSequenceId = isEditMode && selectedSequence ? selectedSequence.id : undefined;

    if (
      isEditMode &&
      selectedSequence &&
      currentOrigenId &&
      Number(currentOrigenId) !== Number(selectedSequence.contenido_origen_id)
    ) {
      return filtered.filter((content) => Number(content.id) === Number(selectedSequence.contenido_destino_id));
    }
    
    const available = filtered.filter(c => {
      if (used.both.has(c.id) && c.id !== currentDestinoId) return false;
      if (used.destination.has(c.id) && c.id !== currentDestinoId) return false;
      if (effectiveOrigenId && c.id === effectiveOrigenId) return false;
      if (!isEditMode && lockedOriginId && connectedContentIds.has(Number(c.id))) return false;
      if (effectiveOrigenId && hasExistingRelationBetween(effectiveOrigenId, c.id, currentSequenceId)) return false;
      return true;
    });
    
    return available;
  };

  useEffect(() => {
    if (!showCreateModal || isEditMode || insertAfterSequenceId || sequenceCreationContext) {
      return;
    }

    const { lockedOriginId } = getModalChainContext();
    if (!lockedOriginId) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      contenido_origen_id: String(lockedOriginId),
      contenido_destino_id: prev.contenido_destino_id === String(lockedOriginId) ? '' : prev.contenido_destino_id
    }));
  }, [showCreateModal, isEditMode, insertAfterSequenceId, sequenceCreationContext, modalSelectedSubtema, selectedSubtema, subtemaId, sequences, contents]);

  const handleModalFilterChange = async (filterType: string, value: string) => {
    if (filterType === 'area') {
      setSequenceCreationContext(null);
      setFormData((prev) => ({
        ...prev,
        contenido_origen_id: '',
        contenido_destino_id: ''
      }));
      setModalSelectedArea(value);
      setModalSelectedTema('');
      setModalSelectedSubtema('');
      setModalTemas([]);
      setModalSubtemas([]);
      // Al seleccionar un área, obtener los temas del backend y luego filtrar contenidos
      if (value) {
        try {
          const res = await apiFetch(`/temas/por-area/${value}`);
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
      setSequenceCreationContext(null);
      setFormData((prev) => ({
        ...prev,
        contenido_origen_id: '',
        contenido_destino_id: ''
      }));
      setModalSelectedTema(value);
      setModalSelectedSubtema('');
      setModalSubtemas([]);

      // Filtrar contenidos por el tema seleccionado (y por área si aplica)
      if (value) {
        const filtered = contents.filter(c => Number(c.tema_id) === Number(value) && (!modalSelectedArea || modalTemas.some(t => Number(t.id) === Number(c.tema_id))));
        console.log('DEBUG: Filtrando modalContents por tema -> temaId:', value, 'result:', filtered.map(fc => ({ id: fc.id, titulo: fc.titulo })));
        setModalContents(filtered);

        try {
          const res = await apiFetch(`/subtemas/por-tema/${value}`);
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
      setSequenceCreationContext(null);
      setFormData((prev) => ({
        ...prev,
        contenido_origen_id: '',
        contenido_destino_id: ''
      }));

      if (value) {
        try {
          const url = `/contenidos/subtema/${value}`;
          console.log('Cargando contenidos para modal desde:', url);
          const res = await apiFetch(url);
          if (!res.ok) {
            const errorData = await res.text();
            console.error('Error response (modal contenidos by subtema):', errorData);
            throw new Error(`Error ${res.status}: ${res.statusText}`);
          }
          const data = await res.json();
          console.log('DEBUG: Respuesta /contenidos/subtema/:', res.status, res.statusText, 'items:', Array.isArray(data) ? data.length : 'not-array', data.slice ? data.map((d: any) => ({ id: d.id, titulo: d.titulo, subtema_id: d.subtema_id })) : data);
          setModalContents(mapContentsWithArea(data, temas));
          await loadCreationContext(value);
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
          const url = `/temas/por-area/${value}`;
          console.log('Cargando temas desde:', url);
          const res = await apiFetch(url);
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
          const url = `/subtemas/por-tema/${value}`;
          console.log('Cargando subtemas desde:', url);
          const res = await apiFetch(url);
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

      if (hasExistingRelationBetween(origenId, destinoId)) {
        setError('Estos contenidos ya están relacionados en una secuencia.');
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
          await apiFetch(`/secuencias-contenido/${insertAfterSequenceId}`, {
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
          await apiFetch('/secuencias-contenido', {
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

        const response = await apiFetch('/secuencias-contenido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear la secuencia');
        }
      }

      await refreshSequences();

      setSuccess('Secuencia registrada correctamente.');
      resetForm();
      setSequenceCreationContext(null);
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

      if (hasExistingRelationBetween(origenId, destinoId, selectedSequence.id)) {
        setError('Estos contenidos ya están relacionados en una secuencia.');
        setIsLoading(false);
        return;
      }

      const payload = {
        contenido_origen_id: origenId,
        contenido_destino_id: destinoId,
        descripcion: formData.descripcion || null,
        estado: formData.estado
      };

      const response = await apiFetch(`/secuencias-contenido/${selectedSequence.id}`, {
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


      await refreshSequences();


      // Éxito - la respuesta puede venir en data.secuencia o directamente en data
      const updatedSequence = data.secuencia || data;
      setSequences(sequences.map(s => s.id === selectedSequence.id ? updatedSequence : s));

      setSuccess('Secuencia actualizada correctamente.');
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
      const response = await apiFetch(`/secuencias-contenido/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Error al cambiar estado');
      }

      await refreshSequences();

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

      const response = await apiFetch(`/secuencias-contenido/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletePayload)
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la secuencia');
      }

      await refreshSequences();

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
      contenido_origen_id: '',
      contenido_destino_id: '',
      descripcion: '',
      estado: true
    });
    setIsEditMode(false);
    setSelectedSequence(null);
  };

  const scopedSequences = sequences.filter(seq => {
    const origenContent = contents.find(c => c.id === seq.contenido_origen_id);
    const destinoContent = contents.find(c => c.id === seq.contenido_destino_id);

    if (!origenContent || !destinoContent) return false;

    if (effectiveSelectedArea) {
      const matchesArea =
        Number(origenContent.area_id) === Number(effectiveSelectedArea) &&
        Number(destinoContent.area_id) === Number(effectiveSelectedArea);
      if (!matchesArea) return false;
    }

    if (effectiveSelectedTema) {
      const matchesTema =
        Number(origenContent.tema_id) === Number(effectiveSelectedTema) &&
        Number(destinoContent.tema_id) === Number(effectiveSelectedTema);
      if (!matchesTema) return false;
    }

    if (effectiveSelectedSubtema) {
      const matchesSubtema =
        Number(origenContent.subtema_id) === Number(effectiveSelectedSubtema) &&
        Number(destinoContent.subtema_id) === Number(effectiveSelectedSubtema);
      if (!matchesSubtema) return false;
    }

    return true;
  });

  const filteredSequences = scopedSequences.filter(seq => {
    const origenContent = contents.find(c => c.id === seq.contenido_origen_id);
    const destinoContent = contents.find(c => c.id === seq.contenido_destino_id);

    const origen = origenContent?.titulo || '';
    const destino = destinoContent?.titulo || '';
    const term = searchTerm.toLowerCase();
    return origen.toLowerCase().includes(term) || destino.toLowerCase().includes(term) || seq.descripcion?.toLowerCase().includes(term);
  });

  // Construir secuencia ordenada visualmente (cadena de contenidos)
  const buildOrderedSequence = () => {
    if (scopedSequences.length === 0) return [];

    const sequenceMap = new Map<number, number>(); // origen_id -> destino_id
    const destinos = new Set<number>();
    const secuenciasActivas = scopedSequences.filter(s => s.estado);

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
      const response = await apiFetch('/secuencias-contenido/reorder', {
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
      await refreshSequences();
      setSuccess(`Orden actualizado: ${result.secuenciasCreadas} creadas, ${result.secuenciasEliminadas} eliminadas`);
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
        apiFetch(`/secuencias-contenido/${prevSeq.id}`, {
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
        apiFetch(`/secuencias-contenido/${sequenceId}`, {
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
      await refreshSequences();
      setSuccess('Secuencia reorganizada correctamente.');
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
        apiFetch(`/secuencias-contenido/${sequenceId}`, {
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
        apiFetch(`/secuencias-contenido/${nextSeq.id}`, {
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
      await refreshSequences();
      setSuccess('Secuencia reorganizada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reorganizar');
    } finally {
      setIsLoading(false);
    }
  };

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

  const openCreateSequenceModal = () => {
    resetForm();
    setInsertAfterSequenceId(null);
    setSequenceCreationContext(null);

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

      loadCreationContext(subtemaId.toString()).catch((err) => {
        console.error('Error cargando contexto inicial de secuencia:', err);
      });
    } else {
      setModalSelectedArea('');
      setModalSelectedTema('');
      setModalSelectedSubtema('');
      setModalTemas([]);
      setModalSubtemas([]);
      setModalContents(contents);
    }

    setShowCreateModal(true);
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
                  <p className="text-gray-500 text-sm">{isDocenteMode ? 'Panel docente - EduPath' : 'Panel de Administrador - EduPath'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="mb-6">
          <button 
            onClick={onBack}
            className="app-back-button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{subtemaId ? 'Volver a Secuencias de Subtemas' : (isDocenteMode ? 'Volver a Mis áreas' : 'Volver al Panel')}</span>
          </button>
        </div>

        <AdminFlowGuide
          title="Secuencia de contenidos"
          description="Organización del orden de contenidos dentro del subtema seleccionado."
          breadcrumbs={[
            { label: isDocenteMode ? 'Panel docente' : 'Panel admin' },
            { label: areaName || 'Áreas' },
            { label: temaName || 'Temas' },
            { label: subtemaNombre || 'Subtema' },
            { label: 'Secuencia de contenidos', current: true }
          ]}
          steps={[
            { label: 'Áreas', helper: 'Área registrada en el contexto actual.', status: areaName ? 'complete' : 'upcoming' },
            { label: 'Temas', helper: 'Tema base del subtema seleccionado.', status: temaName ? 'complete' : 'upcoming' },
            { label: 'Subtemas', helper: 'Subtema asociado a la edición actual.', status: subtemaNombre ? 'complete' : 'current' },
            { label: 'Secuencia de contenidos', helper: 'Orden del contenido final.', status: 'current' }
          ]}
          asideTitle="Siguiente paso"
          asideDescription="Si se requiere registrar recursos, use 'Gestionar contenidos'. Si el contenido existe, la secuencia puede crearse o ajustarse desde esta vista."
        />

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Secuencia de contenidos</div>
              <h2 className="app-page-hero__title">Secuencia de contenidos</h2>
              <p className="app-page-hero__description">
                Consulta, ajusta y organiza la secuencia del subtema seleccionado.
              </p>
            </div>
          </div>

          <div className="app-hero-layout app-hero-layout--aside">
            <div className="app-toolbar-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filtros</p>
                  <p className="mt-1 text-sm text-slate-600">Limita la vista por área, tema o subtema antes de revisar el orden de contenidos.</p>
                </div>
                <div className="app-action-row justify-start">
                  <button
                    onClick={openCreateSequenceModal}
                    className="app-btn app-btn-success"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Crear secuencia</span>
                  </button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                Área
              </label>
              <select
                value={effectiveSelectedArea}
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
                value={effectiveSelectedTema}
                onChange={(e) => handleFilterChange('tema', e.target.value)}
                disabled={!effectiveSelectedArea || subtemaId !== undefined}
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
                value={effectiveSelectedSubtema}
                onChange={(e) => handleFilterChange('subtema', e.target.value)}
                disabled={!effectiveSelectedTema || subtemaId !== undefined}
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

            <div className="app-sidebar-stack">
              <div className="app-soft-card app-soft-card--blue">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda</p>
                  <p className="mt-1 text-sm text-slate-600">Busca por título, descripción o relación entre contenidos.</p>
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
                    <p className="app-table-card__description">Resumen del orden actual entre contenidos.</p>
                  </div>
                  <div className="app-action-row justify-start">
                    <div className="app-sequence-reorder-note">
                      <ArrowDownUp className="w-4 h-4" />
                      <span>Arrastra para reordenar</span>
                    </div>
                    {onGoToContentManagement && (
                      <button
                        type="button"
                        onClick={onGoToContentManagement}
                        className="app-btn app-btn-ghost app-btn-sm"
                      >
                        <span>Gestionar contenidos</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {insertAfterSequenceId && (
                      <button
                        onClick={() => setInsertAfterSequenceId(null)}
                        className="app-btn app-btn-ghost app-btn-sm"
                      >
                        Cancelar inserción
                      </button>
                    )}
                  </div>
                </div>
                <div className="app-table-card__body">
                <div className="app-sequence-chain">
                  {orderedSequence.map((item, index) => {
                    const contenido = contents.find(c => c.id === item.contenido_id);
                    const isLast = index === orderedSequence.length - 1;
                    const isDragging = draggedItem === index;
                    const isDraggedOver = draggedOverIndex === index;

                    return (
                      <div 
                        key={`${item.contenido_id}-${index}`} 
                        className="app-sequence-chain__item"
                      >
                        <div className="app-sequence-node-stack">
                          <div 
                            className="app-sequence-node-shell"
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem(index);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', index.toString());
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
                              className={`app-sequence-node ${
                                isDragging ? 'opacity-50 scale-95' : ''
                              } ${
                                isDraggedOver ? 'ring-2 ring-[#4A90E2] ring-offset-2' : ''
                              }`}
                              style={{ borderColor: `${getTypeColor(contenido?.tipo || '')}33` }}
                              title={`${contenido?.titulo || 'N/A'} - Reordenar`}
                            >
                              <span
                                className="app-sequence-node__type"
                                style={{ backgroundColor: getTypeColor(contenido?.tipo || '') }}
                              >
                                {contenido?.tipo === 'video' ? 'Video' : contenido?.tipo === 'document' ? 'Documento' : contenido?.tipo === 'activity' ? 'Actividad' : 'Contenido'}
                              </span>
                              <span className="app-sequence-node__title">{contenido?.titulo || 'N/A'}</span>
                            </div>
                          </div>
                          {insertAfterSequenceId === item.sequence_id && (
                            <div className="app-sequence-node-stack__hint">
                              Punto de inserción
                            </div>
                          )}
                        </div>
                        {!isLast && (
                          <div className="app-sequence-connector">
                            <div className="app-sequence-connector__arrow">
                              <ArrowRight className="w-4 h-4" />
                            </div>
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
                                className="app-sequence-connector__action"
                                title="Insertar contenido aquí"
                              >
                                Insertar
                              </button>
                            )}
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
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  {onGoToContentManagement && (
                    <div className="flex justify-end px-6 pt-5">
                      <button
                        type="button"
                        onClick={onGoToContentManagement}
                        className="app-btn app-btn-primary"
                      >
                        <ArrowRight className="w-5 h-5" />
                        <span>Gestionar contenidos</span>
                      </button>
                    </div>
                  )}
                  <div className="app-empty-panel py-10">
                    <p className="text-base text-slate-600">No hay secuencias disponibles con los filtros aplicados.</p>
                    <p className="mt-2 text-sm text-slate-500">Registra una secuencia para definir el orden entre contenidos.</p>
                  </div>
                </div>
              ) : (
                filteredSequences.map((sequence) => {
                  const origen = contents.find(c => c.id === sequence.contenido_origen_id);
                  const destino = contents.find(c => c.id === sequence.contenido_destino_id);

                  return (
                    <div key={sequence.id} className="app-flow-card app-flow-card--sequence">
                      <div className="app-flow-card__path app-flow-card__path--sequence flex-1">
                        <div className="app-sequence-card" style={{ borderColor: `${getTypeColor(origen?.tipo || '')}33` }}>
                          <span className="app-sequence-card__label" style={{ backgroundColor: getTypeColor(origen?.tipo || '') }}>
                            Origen
                          </span>
                          <div className="app-sequence-card__title">{origen?.titulo || 'N/A'}</div>
                        </div>

                        <div className="app-sequence-card__arrow">
                          <ArrowRight className="w-4 h-4" />
                        </div>

                        <div className="app-sequence-card" style={{ borderColor: `${getTypeColor(destino?.tipo || '')}33` }}>
                          <span className="app-sequence-card__label" style={{ backgroundColor: getTypeColor(destino?.tipo || '') }}>
                            Destino
                          </span>
                          <div className="app-sequence-card__title">{destino?.titulo || 'N/A'}</div>
                        </div>

                        {sequence.descripcion && (
                          <div className="app-sequence-card__meta">{sequence.descripcion}</div>
                        )}
                      </div>

                      <div className="app-action-row">
                        <button
                          onClick={() => handleToggleEstado(sequence.id, sequence.estado)}
                          disabled={isLoading}
                          className={`app-btn app-btn-icon app-btn-sm ${sequence.estado ? 'app-btn-secondary' : 'app-btn-success'}`}
                          title={sequence.estado ? 'Desactivar' : 'Activar'}
                        >
                          {sequence.estado ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

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
                  {isEditMode ? 'Editar secuencia' : insertAfterSequenceId ? 'Insertar contenido en secuencia' : 'Crear secuencia'}
                </h2>
                {insertAfterSequenceId && (
                  <p className="app-modal-description">
                    El nuevo contenido se insertará dentro de la secuencia seleccionada.
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
                  setSequenceCreationContext(null);
                }}
                className="app-modal-close"
              >
                ✕
              </button>
            </div>

            <div className="app-modal-scroll">
            <div className="app-form-layout">
            <div className="app-form-note mb-6">
              <p className="text-sm text-blue-800">
                Selecciona un contenido de origen y el contenido que debe continuar en la secuencia.
              </p>
            </div>

            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence} className="space-y-4">
              {/* Filtros en Modal */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-[#3A4A5B] mb-3">Filtrar contenidos</h4>
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
                {(() => {
                  const lockedOriginId = !isEditMode && !insertAfterSequenceId
                    ? sequenceCreationContext?.lockedOriginId || null
                    : getModalChainContext().lockedOriginId;
                  const isOriginLocked = Boolean(lockedOriginId && !isEditMode);
                  return (
                <select
                  name="contenido_origen_id"
                  value={formData.contenido_origen_id}
                  onChange={handleInputChange}
                  disabled={isOriginLocked}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Seleccionar contenido de origen</option>
                  {getAvailableOriginModalContents().map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.tipo})
                    </option>
                  ))}
                </select>
                  );
                })()}
                {!isEditMode && !insertAfterSequenceId && sequenceCreationContext?.lockedOriginId && (
                  <p className="mt-2 text-xs text-gray-500">
                    El origen se definió con base en la secuencia actual.
                  </p>
                )}
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
                  <option value="">Seleccionar contenido de destino</option>
                  {getAvailableDestinationModalContents().map(c => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.tipo})
                    </option>
                  ))}
                </select>
                {isEditMode && selectedSequence && formData.contenido_origen_id && Number(formData.contenido_origen_id) !== Number(selectedSequence.contenido_origen_id) && (
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
                    setModalSelectedArea('');
                    setModalSelectedTema('');
                    setModalSelectedSubtema('');
                    setModalTemas([]);
                    setModalSubtemas([]);
                    setModalContents([]);
                    setSequenceCreationContext(null);
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
