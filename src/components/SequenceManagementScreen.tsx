import { useState, useEffect } from 'react';

import { ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff, Search, Loader, ArrowRight, ChevronUp, ChevronDown, ArrowDownUp } from 'lucide-react';

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

  tema_id: number;

  estado?: boolean;

}



interface ContentItem {

  id: number;

  titulo: string;

  tipo: 'video' | 'document' | 'activity' | 'explicacion';

  descripcion?: string;

  asignatura_id?: number;

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
  /** Navega directamente al nivel indicado (0=panel, 1=asignatura, 2=tema, 3=subtema). */
  onNavigateToBreadcrumb?: (index: number) => void;

  onBack: () => void;

  onHome?: () => void;

  onGoToContentManagement?: () => void;

  subtemaId?: number;

  temaId?: number;

  asignaturaId?: number;

  asignaturaName?: string;

  temaName?: string;

  subtemaNombre?: string;

  mode?: 'admin' | 'docente';

}



export function SequenceManagementScreen({ onBack, onHome, onGoToContentManagement, onNavigateToBreadcrumb, subtemaId, temaId, asignaturaId, asignaturaName, temaName, subtemaNombre, mode = 'admin' }: SequenceManagementScreenProps) {

  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);

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

  const [selectedAsignatura, setSelectedAsignatura] = useState('');

  const [selectedTema, setSelectedTema] = useState('');

  const [selectedSubtema, setSelectedSubtema] = useState('');

  const incomingAsignaturaValue = asignaturaId !== undefined ? asignaturaId.toString() : '';

  const incomingTemaValue = temaId !== undefined ? temaId.toString() : '';

  const incomingSubtemaValue = subtemaId !== undefined ? subtemaId.toString() : '';

  const effectiveSelectedAsignatura = selectedAsignatura || incomingAsignaturaValue;

  const effectiveSelectedTema = selectedTema || incomingTemaValue;

  const effectiveSelectedSubtema = selectedSubtema || incomingSubtemaValue;



  // Modal-specific filtros (no afectan los filtros de la pantalla)

  const [modalSelectedAsignatura, setModalSelectedAsignatura] = useState('');

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



  const mapContentsWithAsignatura = (rawContents: ContentItem[], temasCatalog: Tema[]) => {

    const temasById = new Map(temasCatalog.map((tema) => [Number(tema.id), tema]));



    return rawContents.map((content) => ({

      ...content,

      asignatura_id: content.asignatura_id ?? temasById.get(Number(content.tema_id))?.asignatura_id

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

    const normalizedContents = mapContentsWithAsignatura(context.contents || [], temas);



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

    if (asignaturaId !== undefined && temaId && subtemaId) {

      setSelectedAsignatura(asignaturaId.toString());

      setSelectedTema(temaId.toString());

      setSelectedSubtema(subtemaId.toString());

      

      // Pre-llenar los filtros del modal también

      setModalSelectedAsignatura(asignaturaId.toString());

      setModalSelectedTema(temaId.toString());

      setModalSelectedSubtema(subtemaId.toString());

      

      // Cargar temas del asignatura en el modal

      const temasAsignatura = temas.filter((t) => Number(t.asignatura_id) === Number(asignaturaId) && isTemaActive(t));

      setModalTemas(temasAsignatura);

      

      // Cargar subtemas del tema en el modal

      const filtered = subtemas.filter((s) => s.tema_id === temaId && isSubtemaActive(s));

      setModalSubtemas(filtered);

      

      // Cargar contenidos del subtema en el modal

      const contenidosFiltered = contents.filter((c) => c.subtema_id === subtemaId && isContentActive(c));

      setModalContents(contenidosFiltered);

    }

  }, [asignaturaId, temaId, subtemaId, temas, subtemas, contents]);



  // Cuando se abre el modal, asegurar que los filtros estén pre-llenados

  useEffect(() => {

    if (showCreateModal && asignaturaId !== undefined && temaId && subtemaId) {

      setModalSelectedAsignatura(asignaturaId.toString());

      setModalSelectedTema(temaId.toString());

      setModalSelectedSubtema(subtemaId.toString());

      

      // Cargar los datos del modal

      const temasAsignatura = temas.filter((t) => Number(t.asignatura_id) === Number(asignaturaId) && isTemaActive(t));

      setModalTemas(temasAsignatura);

      

      const filtered = subtemas.filter((s) => s.tema_id === temaId && isSubtemaActive(s));

      setModalSubtemas(filtered);

      

      // Cargar contenidos del subtema

      const contenidosFiltered = contents.filter((c) => c.subtema_id === subtemaId && isContentActive(c));

      setModalContents(contenidosFiltered);

    }

  }, [showCreateModal, asignaturaId, temaId, subtemaId, temas, subtemas, contents]);



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



      const [asignaturasRes, temasRes, subtemasRes, contentsRes, sequencesRes] = await Promise.all([

        apiFetch('/asignaturas'),

        apiFetch('/temas'),

        apiFetch('/subtemas'),

        apiFetch(contenidosPath),

        apiFetch(secuenciasPath)

      ]);



      if (!asignaturasRes.ok || !temasRes.ok || !subtemasRes.ok || !contentsRes.ok || !sequencesRes.ok) {

        throw new Error('Error al cargar datos');

      }



      const asignaturasData = await asignaturasRes.json();

      const temasData = await temasRes.json();

      const subtemasData = await subtemasRes.json();

      const rawContentsData = await contentsRes.json();

      const sequencesData = await sequencesRes.json();

      const contentsData = mapContentsWithAsignatura(rawContentsData, temasData);



      setAsignaturas(asignaturasData);

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



  // Obtener temas filtrados por asignatura

  // Ya están filtrados del backend, así que usarlos directamente

  const filteredTemas = temas.filter(isTemaActive);



  // Obtener subtemas filtrados por tema

  // Ya están filtrados del backend, así que usarlos directamente

  const filteredSubtemas = subtemas.filter(isSubtemaActive);



  // Obtener contenidos filtrados por asignatura, tema y subtema

  const getFilteredContents = () => {

    return contents.filter(c => {

      if (!isContentActive(c)) return false;

      if (selectedAsignatura && Number(c.asignatura_id) !== Number(selectedAsignatura)) return false;

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

      if (modalSelectedAsignatura) {

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

    if (filterType === 'Asignatura') {

      setSequenceCreationContext(null);

      setFormData((prev) => ({

        ...prev,

        contenido_origen_id: '',

        contenido_destino_id: ''

      }));

      setModalSelectedAsignatura(value);

      setModalSelectedTema('');

      setModalSelectedSubtema('');

      setModalTemas([]);

      setModalSubtemas([]);

      // Al seleccionar un asignatura, obtener los temas del backend y luego filtrar contenidos

      if (value) {

        try {

          const res = await apiFetch(`/temas/por-asignatura/${value}`);

          if (!res.ok) throw new Error('Error cargando temas');

          const data = await res.json();

          setModalTemas(data);



          // Filtrar contenidos por tema perteneciente a la asignatura seleccionada

          const temaIds = data.map((t: Tema) => Number(t.id));

          const filtered = contents.filter(c => temaIds.includes(Number(c.tema_id)));


          setModalContents(filtered);

        } catch (err) {

          console.error('Error cargando temas para modal:', err);

          setModalTemas([]);

          setModalContents([]);

        }

      } else {

        // Si deselecciona asignatura, restaurar todos los contenidos

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



      // Filtrar contenidos por el tema seleccionado (y por asignatura si aplica)

      if (value) {

        const filtered = contents.filter(c => Number(c.tema_id) === Number(value) && (!modalSelectedAsignatura || modalTemas.some(t => Number(t.id) === Number(c.tema_id))));


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

        // Si se deselecciona tema, restaurar según asignatura

        if (modalSelectedAsignatura) {

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


          const res = await apiFetch(url);

          if (!res.ok) {

            const errorData = await res.text();

            console.error('Error response (modal contenidos by subtema):', errorData);

            throw new Error(`Error ${res.status}: ${res.statusText}`);

          }

          const data = await res.json();


          setModalContents(mapContentsWithAsignatura(data, temas));

          await loadCreationContext(value);

        } catch (err) {

          console.error('Error cargando contenidos por subtema (modal):', err);

          setModalContents([]);

        }

      } else {

        // Si se deselecciona el subtema, recargar según asignatura/tema seleccionados

        setModalContents(contents.filter(c =>

          (!modalSelectedAsignatura || Number(c.asignatura_id) === Number(modalSelectedAsignatura)) &&

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

    if (filterType === 'Asignatura') {

      setSelectedAsignatura(value);

      setSelectedTema('');

      setSelectedSubtema('');

      

      // Cargar temas del asignatura seleccionada

      if (value) {

        try {

          const url = `/temas/por-asignatura/${value}`;


          const res = await apiFetch(url);


          if (!res.ok) {

            const errorData = await res.text();

            console.error('Error response:', errorData);

            throw new Error(`Error ${res.status}: ${res.statusText}`);

          }

          const data = await res.json();


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


          const res = await apiFetch(url);


          if (!res.ok) {

            const errorData = await res.text();

            console.error('Error response:', errorData);

            throw new Error(`Error ${res.status}: ${res.statusText}`);

          }

          const data = await res.json();


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


        throw new Error(errorMessage);

      }





      await refreshSequences();





      // Éxito - la respuesta puede venir en data.secuencia o directamente en data

      const updatedSequence = data.secuencia || data;

      setSequences(sequences.map(s => s.id === selectedSequence.id ? updatedSequence : s));



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



    if (effectiveSelectedAsignatura) {

      const matchesAsignatura =

        Number(origenContent.asignatura_id) === Number(effectiveSelectedAsignatura) &&

        Number(destinoContent.asignatura_id) === Number(effectiveSelectedAsignatura);

      if (!matchesAsignatura) return false;

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



  const getTypeColor = (_type: string) => '#1a56db';



  const getTypeLabel = (type: string) => {

    switch (type) {

      case 'video': return 'Video';

      case 'document': return 'Documento';

      case 'explicacion': return 'Explicación';

      case 'activity': return 'Actividad';

      default: return type;

    }

  };



  const openCreateSequenceModal = () => {

    resetForm();

    setInsertAfterSequenceId(null);

    setSequenceCreationContext(null);



    if (asignaturaId !== undefined && temaId && subtemaId) {

      setModalSelectedAsignatura(asignaturaId.toString());

      setModalSelectedTema(temaId.toString());

      setModalSelectedSubtema(subtemaId.toString());



      const temasAsignatura = temas.filter(t => Number(t.asignatura_id) === Number(asignaturaId));

      setModalTemas(temasAsignatura);



      const filtered = subtemas.filter(s => s.tema_id === temaId);

      setModalSubtemas(filtered);



      const contenidosFiltered = contents.filter(c => c.subtema_id === subtemaId);

      setModalContents(contenidosFiltered);



      loadCreationContext(subtemaId.toString()).catch((err) => {

        console.error('Error cargando contexto inicial de secuencia:', err);

      });

    } else {

      setModalSelectedAsignatura('');

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
                  Secuencia de contenidos
                </p>
                <h1 className="leading-tight">{subtemaNombre || temaName || 'Secuencias'}</h1>
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
          {subtemaNombre && (<><span style={{ color: '#bfd3f5' }}>→</span>
            <button type="button" onClick={onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(3) : onBack}
              className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>{subtemaNombre}</button></>)}
          <span style={{ color: '#bfd3f5' }}>→</span>
          <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
            Secuencias
          </span>
        </nav>

        {/* Toolbar compacta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {subtemaId === undefined && (<>
            <select value={effectiveSelectedAsignatura} onChange={e => handleFilterChange('Asignatura', e.target.value)}
              className="rounded-xl px-3 text-sm font-medium outline-none"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px', minWidth: '180px' }}>
              <option value="">Todas las asignaturas</option>
              {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            <select value={effectiveSelectedTema} onChange={e => handleFilterChange('tema', e.target.value)}
              disabled={!effectiveSelectedAsignatura}
              className="rounded-xl px-3 text-sm font-medium outline-none disabled:opacity-50"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px', minWidth: '180px' }}>
              <option value="">Todos los temas</option>
              {filteredTemas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <select value={effectiveSelectedSubtema} onChange={e => handleFilterChange('subtema', e.target.value)}
              disabled={!effectiveSelectedTema}
              className="rounded-xl px-3 text-sm font-medium outline-none disabled:opacity-50"
              style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px', minWidth: '180px' }}>
              <option value="">Todos los subtemas</option>
              {filteredSubtemas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </>)}
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
            <button onClick={openCreateSequenceModal}
              className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: '40px', whiteSpace: 'nowrap' }}>
              <Plus className="w-4 h-4" />
              Crear secuencia
            </button>
          )}
        </div>



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

              <Loader className="w-8 h-8 animate-spin text-[#1a56db]" />

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

                  <div className="flex items-center gap-3">
                    <div className="app-sequence-reorder-note">
                      <ArrowDownUp className="w-4 h-4" />
                      <span>Arrastra para reordenar</span>
                    </div>
                    {onGoToContentManagement && (
                      <button type="button" onClick={onGoToContentManagement}
                        className="flex items-center gap-1.5 text-sm font-semibold px-4 rounded-xl transition-all hover:opacity-80"
                        style={{ background: '#dbeafe', color: '#1a56db', height: '36px', whiteSpace: 'nowrap' }}>
                        Gestionar contenidos
                        <ArrowRight className="w-3.5 h-3.5" />
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

                                isDraggedOver ? 'ring-2 ring-[#1a56db] ring-offset-2' : ''

                              }`}

                              style={{ borderColor: `${getTypeColor(contenido?.tipo || '')}33` }}

                              title={`${contenido?.titulo || 'N/A'} - Reordenar`}

                            >

                              <span

                                className="app-sequence-node__type"

                                style={{ backgroundColor: getTypeColor(contenido?.tipo || '') }}

                              >

                                {contenido?.tipo === 'video' ? 'Video' : contenido?.tipo === 'document' ? 'Documento' : contenido?.tipo === 'explicacion' ? 'Explicación' : contenido?.tipo === 'activity' ? 'Actividad' : 'Contenido'}

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
          onClick={() => { setShowCreateModal(false); resetForm(); setInsertAfterSequenceId(null); setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalSelectedSubtema(''); setModalTemas([]); setModalSubtemas([]); setModalContents([]); setSequenceCreationContext(null); }}>
          <div className="rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ width: '560px', maxHeight: '90vh', background: '#fff' }}
            onClick={e => e.stopPropagation()}>

            {/* Cabecera azul */}
            <div style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Secuencias de contenidos</p>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                  {isEditMode ? 'Editar secuencia' : insertAfterSequenceId ? 'Insertar en secuencia' : 'Crear secuencia'}
                </h3>
                {insertAfterSequenceId && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>El contenido se insertará dentro de la secuencia seleccionada.</p>}
              </div>
              <button type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); setInsertAfterSequenceId(null); setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalSelectedSubtema(''); setModalTemas([]); setModalSubtemas([]); setModalContents([]); setSequenceCreationContext(null); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', lineHeight: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>✕</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '20px 22px' }}>

            <div className="app-form-note mb-6">

              <p className="text-sm text-blue-800">

                Selecciona un contenido de origen y el contenido que debe continuar en la secuencia.

              </p>

            </div>



            <form onSubmit={isEditMode ? handleUpdateSequence : handleCreateSequence} className="space-y-4">

              {/* Filtros en Modal */}

              <div className="bg-gray-50 p-4 rounded-lg mb-6">

                <h4 className="text-sm font-medium text-[#3A4A5B] mb-3">Filtrar contenidos</h4>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                  <div>

                    <label className="block text-xs font-medium text-gray-600 mb-1">

                      Asignatura

                    </label>

                    <select

                      value={modalSelectedAsignatura}

                      onChange={(e) => !subtemaId && handleModalFilterChange('Asignatura', e.target.value)}

                      disabled={subtemaId !== undefined}

                      className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"

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

                      value={modalSelectedTema}

                      onChange={(e) => !subtemaId && handleModalFilterChange('tema', e.target.value)}

                      disabled={!modalSelectedAsignatura || subtemaId !== undefined}

                      className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"

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

                      className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"

                  required

                >

                  <option value="">Seleccionar contenido de origen</option>

                  {getAvailableOriginModalContents().map(c => (

                    <option key={c.id} value={c.id}>

                      {c.titulo} ({getTypeLabel(c.tipo)})

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent"

                  required

                >

                  <option value="">Seleccionar contenido de destino</option>

                  {getAvailableDestinationModalContents().map(c => (

                    <option key={c.id} value={c.id}>

                      {c.titulo} ({getTypeLabel(c.tipo)})

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent"

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a56db] focus:border-transparent"

                >

                  <option value="true">Activo</option>

                  <option value="false">Inactivo</option>

                </select>

              </div>



              {/* Botones */}

            </form>
            </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 22px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff', flexShrink: 0 }}>
              <button type="button"
                onClick={() => { setShowCreateModal(false); resetForm(); setModalSelectedAsignatura(''); setModalSelectedTema(''); setModalSelectedSubtema(''); setModalTemas([]); setModalSubtemas([]); setModalContents([]); setSequenceCreationContext(null); }}
                disabled={isLoading}
                style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={(e) => { const form = (e.currentTarget as HTMLElement).closest('.fixed')?.querySelector('form'); if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }}
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

