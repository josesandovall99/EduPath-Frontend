import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, Eye, EyeOff, Plus, RefreshCw, Save, Search } from 'lucide-react';
import { JavaEditor } from './JavaEditor';
import { CONSOLA_IO_SOURCE } from '../utils/consolaIOSource';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { createQuillModules, loadQuill } from '../utils/quill';
import { ConfigurableEmbeddedExerciseEditor } from './ConfigurableEmbeddedExerciseEditor';
import { CreateConfigurableMiniproyectoWorkspace, CreateConfigurableFormData } from './CreateConfigurableMiniproyectoWorkspace';
import {
  CompilerCase,
  EmbeddedExercise,
  createDefaultCompilerConfig,
  emptyCompilerCase,
  parseConfigurableMiniproyecto,
  parseMethodTemplate,
  formatJavaLikeTemplate,
} from './configurableEmbeddedExercises';

// CONSOLA_IO_SOURCE is imported from consolaIOSource.ts — única fuente de verdad

interface MiniproyectoManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
  mode?: 'admin' | 'docente';
  docenteId?: number;
  docentePersonaId?: number;
  docenteAreaId?: number;
}

interface AreaInfo {
  id: number;
  nombre: string;
  miniproyecto_publicado_id?: number | null;
}

interface TipoActividadInfo {
  id: number;
  nombre?: string;
}

interface ActividadInfo {
  id?: number;
  titulo?: string;
  descripcion?: string;
  nivel_dificultad?: string;
  fecha_creacion?: string;
  estado?: boolean;
  tipo?: TipoActividadInfo;
}

interface ChatbotInfo {
  id: number;
  nombre: string;
  tipo: 'GENERAL' | 'MINIPROYECTO';
  estado?: boolean;
  area_id?: number | null;
  miniproyecto_id?: number | null;
}

interface MiniproyectoItem {
  id: number;
  actividad_id?: number;
  entregable?: string;
  respuesta_miniproyecto?: string;
  seleccionadoParaEstudiantes?: boolean;
  Area?: AreaInfo;
  Actividad?: ActividadInfo;
  chatbots?: ChatbotInfo[];
}

interface EditFormData {
  titulo: string;
  descripcion: string;
  nivel_dificultad: string;
  entregable: string;
  respuesta_miniproyecto: string;
}

type ScheduleRow = { milestone: string; start: string; end: string };
type CostRow = { deliverable: string; unitMeasure: string; quantity: string; unitPrice: string };

const UNIT_MEASURE_OPTIONS = ['Unidad', 'Hora', 'Día', 'Semana', 'Mes', 'Licencia', 'Documento', 'Paquete'];

type ExpectedSnapshot =
  | {
      mode: 'analysis';
      stakeholders: string[];
      requisitosFuncionales: string[];
      requisitosNoFuncionales: string[];
    }
  | {
      mode: 'management';
      objetivoPrincipal: string[];
      objetivosEspecificos: string[];
      entregables: string[];
      cronograma: string[];
      costos: string[];
      supuestos: string[];
    };

const normalizeAreaName = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const JAVA_LANGUAGE_ID = 62;

const createEmptyConfigurableForm = (): CreateConfigurableFormData => ({
  titulo: '',
  descripcion: '',
  nivel_dificultad: 'media',
  entregable: '',
  areaId: '',
  exercises: [],
  useChatbot: false,
  chatbotId: '',
});

function normalizeCompilerCases(rawCases: unknown, fallbackOutput = ''): CompilerCase[] {
  if (Array.isArray(rawCases) && rawCases.length === 3) {
    return rawCases.map((caseItem: any) => ({
      inputs: (caseItem?.inputs || caseItem?.input || caseItem?.entrada || '').toString(),
      output: (caseItem?.output || caseItem?.esperado || caseItem?.salida || '').toString(),
    }));
  }

  return [
    { inputs: '', output: fallbackOutput },
    emptyCompilerCase(),
    emptyCompilerCase(),
  ];
}

export function MiniproyectoManagementScreen({
  onBack,
  onHome,
  mode = 'admin',
  docenteId,
  docentePersonaId,
  docenteAreaId,
}: MiniproyectoManagementScreenProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const isDocenteMode = mode === 'docente';
  const [miniproyectos, setMiniproyectos] = useState<MiniproyectoItem[]>([]);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [chatbots, setChatbots] = useState<ChatbotInfo[]>([]);
  const [selected, setSelected] = useState<MiniproyectoItem | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    titulo: '',
    descripcion: '',
    nivel_dificultad: '',
    entregable: '',
    respuesta_miniproyecto: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [compilerTemplate, setCompilerTemplate] = useState('');
  const [compilerCases, setCompilerCases] = useState<CompilerCase[]>(createDefaultCompilerConfig().casos_prueba);
  const [sintaxisRequerida, setSintaxisRequerida] = useState<string[]>([]);
  const [mvcNombreModelo, setMvcNombreModelo] = useState('SeguridadBancaria');
  const [mvcTemplateMain, setMvcTemplateMain] = useState('');
  const [mvcTemplateModelo, setMvcTemplateModelo] = useState('');
  const [mvcEsperado, setMvcEsperado] = useState(''); // kept for backward compat
  const [mvcCasosPrueba, setMvcCasosPrueba] = useState<{ inputs: string; output: string }[]>([
    { inputs: '', output: '' }, { inputs: '', output: '' }, { inputs: '', output: '' }
  ]);
  const [mvcActiveTab, setMvcActiveTab] = useState<'main' | 'modelo' | 'consolaIO'>('main');
  const [stakeholdersList, setStakeholdersList] = useState<string[]>([]);
  const [functionalList, setFunctionalList] = useState<string[]>([]);
  const [nonFunctionalList, setNonFunctionalList] = useState<string[]>([]);
  const [stakeholderInput, setStakeholderInput] = useState('');
  const [functionalInput, setFunctionalInput] = useState('');
  const [nonFunctionalInput, setNonFunctionalInput] = useState('');
  const [projectObjective, setProjectObjective] = useState('');
  const [specificObjectivesList, setSpecificObjectivesList] = useState<string[]>([]);
  const [specificObjectiveInput, setSpecificObjectiveInput] = useState('');
  const [scopeList, setScopeList] = useState<string[]>([]);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([
    { milestone: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [contingencyPercentage, setContingencyPercentage] = useState('5');
  const [utilityPercentage, setUtilityPercentage] = useState('10');
  const [assumptionsList, setAssumptionsList] = useState<string[]>([]);
  const [assumptionInput, setAssumptionInput] = useState('');
  const [scopeInput, setScopeInput] = useState('');
  const [showExpectedModal, setShowExpectedModal] = useState(false);
  const [expectedSnapshot, setExpectedSnapshot] = useState<ExpectedSnapshot | null>(null);
  const [selectedEmbeddedExercises, setSelectedEmbeddedExercises] = useState<EmbeddedExercise[]>([]);
  const [selectedUseChatbot, setSelectedUseChatbot] = useState(false);
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateConfigurableFormData>(createEmptyConfigurableForm());
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedAreaFilterId, setSelectedAreaFilterId] = useState<string>(docenteAreaId ? String(docenteAreaId) : '');

  const requestHeaders = useMemo(() => {
    const authToken = localStorage.getItem('authToken');
    const personaId = docentePersonaId || Number(localStorage.getItem('personaId'));
    const headers: Record<string, string> = {};

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (isDocenteMode && Number.isFinite(Number(docenteId))) {
      headers['x-docente-id'] = String(Number(docenteId));
    }

    if (isDocenteMode && Number.isFinite(Number(docenteAreaId))) {
      headers['x-area-id'] = String(Number(docenteAreaId));
    }

    if (Number.isFinite(personaId)) {
      headers['x-persona-id'] = String(personaId);
    }

    return headers;
  }, [docenteAreaId, docenteId, docentePersonaId, isDocenteMode]);

  function apiFetch(path: string, init: RequestInit = {}, areaIdOverride?: number | null) {
    const nextHeaders = new Headers(init.headers || {});

    Object.entries(requestHeaders).forEach(([key, value]) => {
      if (!nextHeaders.has(key)) {
        nextHeaders.set(key, value);
      }
    });

    if (Number.isFinite(Number(areaIdOverride))) {
      nextHeaders.set('x-area-id', String(Number(areaIdOverride)));
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: nextHeaders,
    });
  }

  // El tipo de editor depende del area del miniproyecto, no del id de la actividad.
  const selectedAreaName = normalizeAreaName(selected?.Area?.nombre);
  const isProgrammingMiniproyecto = selectedAreaName.includes('programacion');
  const isManagementMiniproyecto = selectedAreaName.includes('alcance') || selectedAreaName.includes('gestion');
  const selectedConfigurablePayload = parseConfigurableMiniproyecto(selected?.respuesta_miniproyecto);
  const isConfigurableMiniproyecto = Boolean(selectedConfigurablePayload);
  const usesRichDescriptionEditor = isConfigurableMiniproyecto || (isProgrammingMiniproyecto && !isConfigurableMiniproyecto);

  const clearQuillArtifacts = () => {
    if (editorHostRef.current) {
      editorHostRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    if (!usesRichDescriptionEditor) {
      quillRef.current = null;
      clearQuillArtifacts();
      return;
    }

    let cancelled = false;

    const ensureQuill = async () => {
      if (!editorHostRef.current || quillRef.current) return;
      const Quill = await loadQuill();
      if (cancelled || !editorHostRef.current || quillRef.current) return;
      clearQuillArtifacts();
      const mountNode = document.createElement('div');
      editorHostRef.current.appendChild(mountNode);

      const quill = new Quill(mountNode, {
        theme: 'snow',
        placeholder: 'Ingrese la descripcion del miniproyecto',
        modules: createQuillModules()
      });

      const nextHtml = formData.descripcion || '';
      if (quill.root.innerHTML !== nextHtml) {
        quill.root.innerHTML = nextHtml;
      }

      quill.on('text-change', () => {
        const nextDescription = quill.root.innerHTML;
        setFormData((prev) => prev.descripcion === nextDescription ? prev : { ...prev, descripcion: nextDescription });
      });

      quillRef.current = quill;
    };

    ensureQuill();

    return () => {
      cancelled = true;
      quillRef.current = null;
      clearQuillArtifacts();
    };
  }, [selected?.id, usesRichDescriptionEditor]);

  useEffect(() => {
    if (!usesRichDescriptionEditor || !quillRef.current) return;

    const nextHtml = formData.descripcion || '';
    if (quillRef.current.root.innerHTML !== nextHtml) {
      quillRef.current.root.innerHTML = nextHtml;
    }
  }, [formData.descripcion, usesRichDescriptionEditor]);

  const sintaxisDisponibles = ['while', 'for', 'if', 'switch'];

  useEffect(() => {
    loadMiniproyectos();
    loadSupportingData();
  }, []);

  const loadSupportingData = async () => {
    try {
      const areasEndpoint = isDocenteMode ? '/areas/mis-areas' : '/areas';
      const [areasResponse, chatbotsResponse] = await Promise.all([
        apiFetch(areasEndpoint),
        apiFetch('/chatbots'),
      ]);

      if (!areasResponse.ok) {
        throw new Error('No se pudieron cargar las áreas disponibles');
      }

      if (!chatbotsResponse.ok) {
        throw new Error('No se pudieron cargar los chatbots disponibles');
      }

      const [areasData, chatbotsData] = await Promise.all([
        areasResponse.json(),
        chatbotsResponse.json(),
      ]);

      setAreas(Array.isArray(areasData) ? areasData : []);
      setChatbots(Array.isArray(chatbotsData) ? chatbotsData : []);
    } catch (err) {
      console.error('Error cargando datos auxiliares de miniproyectos:', err);
      setError((previousError) => previousError || (err instanceof Error ? err.message : 'Error al cargar áreas y chatbots'));
    }
  };

  const loadChatbots = async () => {
    try {
      const chatbotsResponse = await apiFetch('/chatbots');
      if (!chatbotsResponse.ok) {
        throw new Error('No se pudieron cargar los chatbots disponibles');
      }
      const chatbotsData = await chatbotsResponse.json();
      setChatbots(Array.isArray(chatbotsData) ? chatbotsData : []);
    } catch (err) {
      console.error('Error cargando chatbots:', err);
    }
  };

  const handleChatbotCreated = (chatbot: { id: number; nombre: string }) => {
    // Recargar la lista de chatbots para incluir el recién creado
    loadChatbots();
  };

  const loadMiniproyectos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/miniproyectos', {}, docenteAreaId ?? null);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los miniproyectos');
      }
      const data = await response.json();
      const nextItems = Array.isArray(data) ? data : [];
      setMiniproyectos(nextItems);
      return nextItems;
    } catch (err) {
      console.error('Error en loadMiniproyectos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar miniproyectos');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMiniproyectos = useMemo(() => {
    const term = query.trim().toLowerCase();
    const areaIdFilter = Number(selectedAreaFilterId);

    return miniproyectos.filter((item) => {
      const titulo = item.Actividad?.titulo?.toLowerCase() || '';
      const area = item.Area?.nombre?.toLowerCase() || '';
      const nivel = item.Actividad?.nivel_dificultad?.toLowerCase() || '';
      const itemAreaId = Number(item.Area?.id);
      const matchesArea = !Number.isInteger(areaIdFilter) || areaIdFilter <= 0 || itemAreaId === areaIdFilter;
      const matchesQuery = !term || titulo.includes(term) || area.includes(term) || nivel.includes(term);

      return matchesArea && matchesQuery;
    });
  }, [miniproyectos, query, selectedAreaFilterId]);

  const availableAreas = useMemo(() => {
    return [...areas].sort((left, right) => left.nombre.localeCompare(right.nombre));
  }, [areas]);

  useEffect(() => {
    if (!selected) return;

    const selectedItemAreaId = Number(selected.Area?.id);
    const areaIdFilter = Number(selectedAreaFilterId);

    if (Number.isInteger(areaIdFilter) && areaIdFilter > 0 && selectedItemAreaId !== areaIdFilter) {
      clearSelectedEditor();
    }
  }, [selected, selectedAreaFilterId]);

  const selectedCreateAreaId = Number(createForm.areaId);

  const createEligibleChatbots = useMemo(() => {
    if (!Number.isInteger(selectedCreateAreaId) || selectedCreateAreaId <= 0) return [];

    return chatbots
      .filter((chatbot) => (
        chatbot.estado !== false &&
        (chatbot.miniproyecto_id === null || chatbot.miniproyecto_id === undefined) &&
        Number(chatbot.area_id) === selectedCreateAreaId
      ))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  }, [chatbots, selectedCreateAreaId]);

  const selectedEligibleChatbots = useMemo(() => {
    const selectedAreaId = Number(selected?.Area?.id);
    if (!isConfigurableMiniproyecto || !Number.isInteger(selectedAreaId) || selectedAreaId <= 0) return [];

    return chatbots
      .filter((chatbot) => (
        chatbot.estado !== false &&
        (chatbot.miniproyecto_id === null || chatbot.miniproyecto_id === undefined || Number(chatbot.miniproyecto_id) === Number(selected?.id)) &&
        Number(chatbot.area_id) === selectedAreaId
      ))
      .sort((left, right) => left.nombre.localeCompare(right.nombre));
  }, [chatbots, selected?.Area?.id, selected?.id, isConfigurableMiniproyecto]);

  const miniproyectoActivityTypeId = useMemo(() => {
    const typeId = miniproyectos.find((item) => Number(item.Actividad?.tipo?.id))?.Actividad?.tipo?.id;
    return Number(typeId) || null;
  }, [miniproyectos]);

  const groupedMiniproyectos = useMemo(() => {
    const groups = new Map<number, { area: AreaInfo | null; items: MiniproyectoItem[] }>();

    filteredMiniproyectos.forEach((item) => {
      const areaId = Number(item.Area?.id) || 0;
      const current = groups.get(areaId);
      if (current) {
        current.items.push(item);
        return;
      }

      groups.set(areaId, {
        area: item.Area || null,
        items: [item],
      });
    });

    return Array.from(groups.values()).sort((left, right) => {
      const leftName = left.area?.nombre || 'Sin área';
      const rightName = right.area?.nombre || 'Sin área';
      return leftName.localeCompare(rightName);
    });
  }, [filteredMiniproyectos]);

  const parseNumber = (value: string) => {
    const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const buildScheduleList = (rows: ScheduleRow[]) =>
    rows
      .filter((row) => row.milestone || row.start || row.end)
      .map((row, index) =>
        `Hito ${index + 1}: ${row.milestone || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      );

  const calculateRowTotal = (row: CostRow) =>
    parseNumber(row.quantity) * parseNumber(row.unitPrice);

  const totalCost = costRows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  const contingencyValue = totalCost * (parseNumber(contingencyPercentage) / 100);
  const utilityValue = totalCost * (parseNumber(utilityPercentage) / 100);
  const projectTotal = totalCost + contingencyValue + utilityValue;

  const createDefaultCostRow = (deliverable: string): CostRow => ({
    deliverable,
    unitMeasure: UNIT_MEASURE_OPTIONS[0],
    quantity: '',
    unitPrice: ''
  });

  const parseAssumptionsList = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => item?.toString?.().trim?.() ?? '').filter(Boolean);
    }

    if (typeof value !== 'string') return [];

    const normalized = value
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalized.length > 1) return normalized;

    return value
      .split(/[.;]\s+/)
      .map((item) => item.trim().replace(/[.;]+$/g, ''))
      .filter(Boolean);
  };

  const buildCostList = (rows: CostRow[]) => {
    const lines = rows
      .filter((row) => row.deliverable || row.quantity || row.unitPrice)
      .map((row, index) =>
        `Entregable ${index + 1}: ${row.deliverable || '-'} | Cantidad: ${row.quantity || '-'} | Precio unitario: ${row.unitPrice || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      );
    return [
      ...lines,
      `Total: ${formatCurrency(totalCost)}`,
      `Imprevistos: ${contingencyPercentage || '0'}% | Valor: ${formatCurrency(contingencyValue)}`,
      `Utilidad: ${utilityPercentage || '0'}% | Valor: ${formatCurrency(utilityValue)}`,
      `Total proyecto: ${formatCurrency(projectTotal)}`
    ];
  };

  const handleSelect = (item: MiniproyectoItem) => {
    setSelected(item);
    const configurablePayload = parseConfigurableMiniproyecto(item.respuesta_miniproyecto);
    let parsedStakeholders: string[] = [];
    let parsedFunctional: string[] = [];
    let parsedNonFunctional: string[] = [];
    let parsedObjective = '';
    let parsedSpecificObjectives: string[] = [];
    let parsedScope: string[] = [];
    let parsedAssumptions: string[] = [];
    let parsedSchedule: ScheduleRow[] = [];
    let parsedCosts: CostRow[] = [];
    let parsedTemplate = '';
    let parsedCases = createDefaultCompilerConfig().casos_prueba;
    let parsedSintaxis: string[] = [];
    let parsedMvcNombreModelo = 'SeguridadBancaria';
    let parsedMvcTemplateMain = '';
    let parsedMvcTemplateModelo = '';
    let parsedMvcEsperado = '';
    let parsedMvcCasosPrueba: { inputs: string; output: string }[] = [
      { inputs: '', output: '' }, { inputs: '', output: '' }, { inputs: '', output: '' }
    ];

    if (item.respuesta_miniproyecto) {
      try {
        const parsed = JSON.parse(item.respuesta_miniproyecto);
        parsedStakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders : [];
        parsedFunctional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales : [];
        parsedNonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales : [];
        parsedObjective = Array.isArray(parsed?.objetivoPrincipal)
          ? parsed.objetivoPrincipal[0]?.toString?.().trim?.() ?? ''
          : Array.isArray(parsed?.objetivo)
            ? parsed.objetivo[0]?.toString?.().trim?.() ?? ''
            : typeof parsed?.objetivoPrincipal === 'string'
              ? parsed.objetivoPrincipal.trim()
              : typeof parsed?.objetivo === 'string'
                ? parsed.objetivo.trim()
                : '';
        parsedSpecificObjectives = Array.isArray(parsed?.objetivosEspecificos)
          ? parsed.objetivosEspecificos.map((item: unknown) => item?.toString?.().trim?.() ?? '').filter(Boolean)
          : [];
        parsedScope = Array.isArray(parsed?.entregables)
          ? parsed.entregables
          : Array.isArray(parsed?.alcance)
            ? parsed.alcance
            : [];
        parsedAssumptions = parseAssumptionsList(
          parsed?.supuestos ?? parsed?.justificacionGestion ?? parsed?.justificacion ?? parsed?.notas
        );
        if (parsed?.tipo === 'programacion') {
          parsedTemplate = typeof parsed?.metodo?.plantilla === 'string'
            ? parsed.metodo.plantilla
            : typeof parsed?.plantillaMetodo === 'string'
              ? parsed.plantillaMetodo
              : '';
          parsedCases = normalizeCompilerCases(parsed?.casos_prueba, parsed?.esperado || '');
          parsedSintaxis = Array.isArray(parsed?.sintaxis) ? parsed.sintaxis : [];
        }
        if (parsed?.tipo === 'mvc') {
          parsedMvcNombreModelo = typeof parsed?.nombreModelo === 'string' ? parsed.nombreModelo : 'SeguridadBancaria';
          parsedMvcTemplateMain = typeof parsed?.templateMain === 'string' ? parsed.templateMain : '';
          parsedMvcTemplateModelo = typeof parsed?.templateModelo === 'string' ? parsed.templateModelo : '';
          parsedMvcEsperado = typeof parsed?.esperado === 'string' ? parsed.esperado : '';
          if (Array.isArray(parsed?.casos_prueba) && parsed.casos_prueba.length > 0) {
            parsedMvcCasosPrueba = [0,1,2].map((i) => ({
              inputs: parsed.casos_prueba[i]?.inputs || '',
              output: parsed.casos_prueba[i]?.output || ''
            }));
          }
        }
        const cronogramaRaw = Array.isArray(parsed?.cronograma) ? parsed.cronograma : [];
        parsedSchedule = cronogramaRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              milestone: (entry.milestone ?? entry.hito ?? entry.activity ?? entry.actividad ?? entry.tarea ?? '').toString(),
              start: (entry.start ?? entry.inicio ?? entry.date ?? entry.fecha ?? '').toString(),
              end: (entry.end ?? entry.fin ?? entry.date ?? entry.fecha ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          const activityMatch = text.match(/(?:Hito|Actividad)\s*\d*:?\s*([^|]+)\|/i);
          const startMatch = text.match(/Inicio\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const endMatch = text.match(/Fin\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const dateMatch = text.match(/Fecha\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const normalizeDate = (value?: string) => {
            if (!value) return '';
            if (/\d{4}-\d{2}-\d{2}/.test(value)) return value;
            if (/\d{2}\/\d{2}\/\d{4}/.test(value)) {
              const [day, month, year] = value.split('/');
              return `${year}-${month}-${day}`;
            }
            return value;
          };

          return {
            milestone: activityMatch ? activityMatch[1].trim() : text,
            start: normalizeDate(startMatch?.[1] || dateMatch?.[1]),
            end: normalizeDate(endMatch?.[1] || dateMatch?.[1])
          };
        });

        const costosRaw = Array.isArray(parsed?.costos) ? parsed.costos : [];
        parsedCosts = costosRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              deliverable: (entry.deliverable ?? entry.entregable ?? entry.concept ?? entry.concepto ?? '').toString(),
              unitMeasure: (entry.unitMeasure ?? entry.unidadMedida ?? UNIT_MEASURE_OPTIONS[0]).toString(),
              quantity: (entry.quantity ?? entry.cantidad ?? '').toString(),
              unitPrice: (entry.unitPrice ?? entry.precioUnitario ?? entry.unitCost ?? entry.costoUnitario ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          if (/imprevistos/i.test(text)) {
            const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
            setContingencyPercentage(percentageMatch?.[1]?.replace(',', '.') || '5');
            return null;
          }

          if (/utilidad/i.test(text)) {
            const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
            setUtilityPercentage(percentageMatch?.[1]?.replace(',', '.') || '10');
            return null;
          }

          if (/^total/i.test(text.trim())) return null;

          const conceptMatch = text.match(/(?:Entregable|Costo|Concepto)\s*\d*:?\s*([^|]+)\|/i);
          const unitMeasureMatch = text.match(/Unidad\s+de\s+medida\s*:?\s*([^|]+)/i);
          const qtyMatch = text.match(/Cantidad\s*:?\s*([0-9.,]+)/i);
          const unitMatch = text.match(/(?:Precio|Costo)\s*unitario\s*:?\s*([0-9.,]+)/i);

          return {
            deliverable: conceptMatch ? conceptMatch[1].trim() : text,
            unitMeasure: unitMeasureMatch ? unitMeasureMatch[1].trim() : UNIT_MEASURE_OPTIONS[0],
            quantity: qtyMatch?.[1] ?? '',
            unitPrice: unitMatch?.[1] ?? ''
          };
        }).filter(Boolean);
      } catch (err) {
        parsedStakeholders = [];
        parsedFunctional = [];
        parsedNonFunctional = [];
        parsedObjective = '';
        parsedSpecificObjectives = [];
        parsedScope = [];
        parsedAssumptions = [];
        parsedSchedule = [];
        parsedCosts = [];
      }
    }

    setFormData({
      titulo: item.Actividad?.titulo || '',
      descripcion: item.Actividad?.descripcion || '',
      nivel_dificultad: item.Actividad?.nivel_dificultad || '',
      entregable: item.entregable || '',
      respuesta_miniproyecto: item.respuesta_miniproyecto || ''
    });
    setStakeholdersList(parsedStakeholders);
    setFunctionalList(parsedFunctional);
    setNonFunctionalList(parsedNonFunctional);
    setProjectObjective(parsedObjective);
    setSpecificObjectivesList(parsedSpecificObjectives);
    setAssumptionsList(parsedAssumptions);
    setStakeholderInput('');
    setFunctionalInput('');
    setNonFunctionalInput('');
    setScopeList(parsedScope);
    setScheduleRows(parsedSchedule.length > 0 ? parsedSchedule : [{ milestone: '', start: '', end: '' }]);
    setCostRows(parsedCosts);
    setAssumptionInput('');
    setScopeInput('');
    const normalizedItemAreaName = normalizeAreaName(item.Area?.nombre);
    const isProgrammingItem = normalizedItemAreaName.includes('programacion');
    if (isProgrammingItem) {
      setCompilerTemplate(parsedTemplate);
      setCompilerCases(parsedCases);
      setSintaxisRequerida(parsedSintaxis);
      setMvcNombreModelo(parsedMvcNombreModelo);
      setMvcTemplateMain(parsedMvcTemplateMain);
      setMvcTemplateModelo(parsedMvcTemplateModelo);
      setMvcEsperado(parsedMvcEsperado);
      setMvcCasosPrueba(parsedMvcCasosPrueba);
      setMvcActiveTab('main');
    } else {
      setCompilerTemplate('');
      setCompilerCases(createDefaultCompilerConfig().casos_prueba);
      setSintaxisRequerida([]);
      setMvcNombreModelo('SeguridadBancaria');
      setMvcTemplateMain('');
      setMvcTemplateModelo('');
      setMvcEsperado('');
      setMvcCasosPrueba([{ inputs: '', output: '' }, { inputs: '', output: '' }, { inputs: '', output: '' }]);
    }

    setSelectedEmbeddedExercises(configurablePayload?.exercises || []);
    setSelectedUseChatbot(Boolean(configurablePayload?.chatbot?.enabled));
    setSelectedChatbotId(configurablePayload?.chatbot?.chatbotId ? String(configurablePayload.chatbot.chatbotId) : '');
  };

  const clearSelectedEditor = () => {
    setSelected(null);
    setSelectedEmbeddedExercises([]);
    setSelectedUseChatbot(false);
    setSelectedChatbotId('');
  };

  const handleUpdateStudentPublication = async (item: MiniproyectoItem, visibleParaEstudiantes: boolean) => {
    setIsPublishing(true);
    setError(null);

    try {
      const response = await apiFetch(`/miniproyectos/${item.id}/publicacion-estudiante`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleParaEstudiantes }),
      }, docenteAreaId ?? item.Area?.id ?? null);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'No fue posible actualizar la asignación del miniproyecto del área.');
      }

      const refreshedItems = await loadMiniproyectos();
      const refreshedSelected = refreshedItems.find((current) => Number(current.id) === Number(item.id));
      if (refreshedSelected) {
        handleSelect(refreshedSelected);
      }
      await loadSupportingData();
    } catch (err) {
      console.error('Error actualizando publicación del miniproyecto:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar la asignación del miniproyecto del área');
    } finally {
      setIsPublishing(false);
    }
  };

  const addListItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, reset: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter((prev) => [...prev, trimmed]);
    reset();
  };

  const removeListItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSintaxis = (sintaxis: string) => {
    setSintaxisRequerida((prev) =>
      prev.includes(sintaxis) ? prev.filter((s) => s !== sintaxis) : [...prev, sintaxis]
    );
  };

  const compilerMethod = parseMethodTemplate(compilerTemplate);

  const handleCompilerTemplateChange = (value: string) => {
    setCompilerTemplate(value);
  };

  const handleFormatCompilerTemplate = () => {
    setCompilerTemplate((prev) => formatJavaLikeTemplate(prev || ''));
  };

  const handleCompilerCaseChange = (index: number, field: keyof CompilerCase, value: string) => {
    setCompilerCases((prev) => prev.map((caseItem, caseIndex) => (
      caseIndex === index ? { ...caseItem, [field]: value } : caseItem
    )));
  };

  const openCreateModal = () => {
    setCreateError(null);
    setCreateForm({
      ...createEmptyConfigurableForm(),
      areaId: availableAreas.length === 1 ? String(availableAreas[0].id) : '',
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setShowCreateModal(false);
    setCreateError(null);
  };

  const handleCreateConfigurableMiniproyecto = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!createForm.titulo.trim()) {
      setCreateError('El título es obligatorio.');
      return;
    }

    if (!createForm.areaId) {
      setCreateError('Debes seleccionar un área.');
      return;
    }

    if (createForm.exercises.length === 0) {
      setCreateError('Crea al menos un ejercicio para el nuevo miniproyecto.');
      return;
    }

    if (createForm.useChatbot && !createForm.chatbotId) {
      setCreateError('Selecciona un chatbot si deseas usar simulación de cliente.');
      return;
    }

    if (!miniproyectoActivityTypeId) {
      setCreateError('No se pudo identificar el tipo de actividad para miniproyectos.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const payload = {
        titulo: createForm.titulo.trim(),
        descripcion: createForm.descripcion.trim(),
        nivel_dificultad: createForm.nivel_dificultad.trim() || 'media',
        entregable: createForm.entregable.trim(),
        area_id: Number(createForm.areaId),
        tipo_actividad_id: miniproyectoActivityTypeId,
        respuesta_miniproyecto: {
          tipo: 'configurable',
          modo: 'ejercicios',
          exercises: createForm.exercises,
          chatbot: {
            enabled: createForm.useChatbot,
            chatbotId: createForm.useChatbot && createForm.chatbotId ? Number(createForm.chatbotId) : null,
          },
        },
      };

      const response = await apiFetch('/miniproyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, Number(createForm.areaId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'No fue posible crear el miniproyecto configurable');
      }

      await Promise.all([loadMiniproyectos(), loadSupportingData()]);
      setShowCreateModal(false);
      setCreateForm(createEmptyConfigurableForm());
    } catch (err) {
      console.error('Error creando miniproyecto configurable:', err);
      setCreateError(err instanceof Error ? err.message : 'Error al crear el miniproyecto configurable');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (!isManagementMiniproyecto) return;

    setCostRows((prev) => {
      const deliverables = scopeList.map((item) => item.trim()).filter(Boolean);
      if (deliverables.length === 0) return [];

      return deliverables.map((deliverable, index) => {
        const existing = prev[index] ?? prev.find((row) => normalizeAreaName(row.deliverable) === normalizeAreaName(deliverable));
        return existing ? { ...existing, deliverable } : createDefaultCostRow(deliverable);
      });
    });
  }, [scopeList, isManagementMiniproyecto]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    let programmingPayload: string | null = null;
    let configurablePayload: string | null = null;

    if (isConfigurableMiniproyecto) {
      if (selectedEmbeddedExercises.length === 0) {
        setError('Debes crear al menos un ejercicio para el miniproyecto configurable.');
        return;
      }

      if (selectedUseChatbot && !selectedChatbotId) {
        setError('Selecciona un chatbot para activar la simulación del cliente.');
        return;
      }

      configurablePayload = JSON.stringify({
        tipo: 'configurable',
        modo: 'ejercicios',
        exercises: selectedEmbeddedExercises,
        chatbot: {
          enabled: selectedUseChatbot,
          chatbotId: selectedUseChatbot && selectedChatbotId ? Number(selectedChatbotId) : null,
        },
      });
    } else if (isProgrammingMiniproyecto) {
      const nombreModelo = mvcNombreModelo.trim() || 'SeguridadBancaria';
      const casosNormalizados = mvcCasosPrueba.map((c) => ({
        inputs: c.inputs.trim(),
        output: c.output.trim(),
      }));

      if (casosNormalizados.every((c) => !c.output)) {
        setError('Define la salida esperada en al menos un caso de prueba para que el sistema pueda evaluar al estudiante.');
        return;
      }

      programmingPayload = JSON.stringify({
        tipo: 'mvc',
        nombreModelo,
        templateMain: mvcTemplateMain.trim(),
        templateModelo: mvcTemplateModelo.trim(),
        esperado: casosNormalizados[0]?.output || mvcEsperado.trim(),
        casos_prueba: casosNormalizados,
        lenguajesPermitidos: [JAVA_LANGUAGE_ID],
      });
    }

    setIsSaving(true);
    setError(null);

    try {
      const scheduleList = buildScheduleList(scheduleRows);
      const costsList = buildCostList(costRows);

      const response = await fetch(`${API_BASE_URL}/miniproyectos/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          nivel_dificultad: formData.nivel_dificultad,
          entregable: formData.entregable,
          respuesta_miniproyecto: isConfigurableMiniproyecto
            ? configurablePayload
            : isProgrammingMiniproyecto
            ? programmingPayload
            : isManagementMiniproyecto
              ? JSON.stringify({
                  objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
                  objetivosEspecificos: specificObjectivesList,
                  entregables: scopeList,
                  cronograma: scheduleList,
                  costos: costsList,
                  supuestos: assumptionsList
                })
              : JSON.stringify({
                  stakeholders: stakeholdersList,
                  requisitosFuncionales: functionalList,
                  requisitosNoFuncionales: nonFunctionalList
                })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar el miniproyecto');
      }

      await Promise.all([loadMiniproyectos(), loadSupportingData()]);

      if (!isProgrammingMiniproyecto && !isConfigurableMiniproyecto) {
        if (isManagementMiniproyecto) {
          setExpectedSnapshot({
            mode: 'management',
            objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
            objetivosEspecificos: specificObjectivesList,
            entregables: scopeList,
            cronograma: scheduleList,
            costos: costsList,
            supuestos: assumptionsList
          });
        } else {
          setExpectedSnapshot({
            mode: 'analysis',
            stakeholders: stakeholdersList,
            requisitosFuncionales: functionalList,
            requisitosNoFuncionales: nonFunctionalList
          });
        }
        setShowExpectedModal(true);
      }

      clearSelectedEditor();
    } catch (err) {
      console.error('Error actualizando miniproyecto:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el miniproyecto');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMiniproyectos = miniproyectos.length;
  const resultadosMostrados = filteredMiniproyectos.length;
  const activeMiniproyectos = miniproyectos.filter((item) => item.Actividad?.estado !== false).length;
  const publishedMiniproyectos = miniproyectos.filter((item) => item.seleccionadoParaEstudiantes).length;
  const selectedAreaFilterName = availableAreas.find((area) => String(area.id) === selectedAreaFilterId)?.nombre || 'Todas las áreas';
  const selectedMiniproyectoTitle = selected?.Actividad?.titulo || 'Sin selección';
  const selectedMiniproyectoArea = selected?.Area?.nombre || 'Área no definida';
  const areasRepresented = groupedMiniproyectos.length;
  const selectedEditorMode = isConfigurableMiniproyecto
    ? 'Configurable'
    : isProgrammingMiniproyecto
      ? 'Programación'
      : isManagementMiniproyecto
        ? 'Gestión'
        : selected
          ? 'Análisis'
          : 'Sin editor';
    const managementSnapshot = expectedSnapshot?.mode === 'management' ? expectedSnapshot : null;
    const analysisSnapshot = expectedSnapshot?.mode === 'analysis' ? expectedSnapshot : null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} title="Ir al panel principal">
                <div className="app-brand-icon">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Miniproyectos</h1>
                <p className="text-gray-500 text-sm">Listado, edición y seguimiento dentro del mismo lenguaje visual del panel.</p>
              </div>
            </div>

            <div className="app-action-row">
              <button
                onClick={openCreateModal}
                className="app-btn app-primary-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Crear configurable</span>
              </button>
              <button
                onClick={loadMiniproyectos}
                className="app-btn app-btn-secondary"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <section className="app-page-hero app-miniproyecto-hero mb-5">
          <div className="app-miniproyecto-hero-grid">
            <div className="app-miniproyecto-hero-main">
              <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Edición docente</div>
              <h2 className="app-page-hero__title">Gestión de miniproyectos</h2>
              <p className="app-page-hero__description">Administra el catálogo y trabaja el editor desde una composición compacta y coherente con el panel.</p>
              </div>

              <div className="app-toolbar-card app-miniproyecto-toolbar app-miniproyecto-toolbar--hero">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catálogo visible</p>
                    <p className="mt-1 text-sm text-slate-600">Selecciona un área y filtra por título o nivel.</p>
                  </div>
                  <div className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                    {resultadosMostrados} visibles
                  </div>
                </div>
                <div className="mb-3">
                  <label className="app-form-label">Área</label>
                  <select
                    value={selectedAreaFilterId}
                    onChange={(event) => setSelectedAreaFilterId(event.target.value)}
                    className="app-form-select"
                    disabled={isDocenteMode && Boolean(docenteAreaId)}
                  >
                    {!isDocenteMode ? <option value="">Todas las áreas</option> : null}
                    {availableAreas.map((area) => (
                      <option key={area.id} value={String(area.id)}>{area.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="app-search-field">
                  <Search className="app-search-field__icon" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por título o nivel"
                    className="app-form-input"
                  />
                </div>
              </div>
            </div>

            <aside className="app-miniproyecto-hero-side">
            <div className="app-hero-metrics app-miniproyecto-hero-metrics">
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Catálogo</div>
                <div className="app-hero-metric__value">{isDocenteMode ? totalMiniproyectos : areasRepresented}</div>
                <div className="app-hero-metric__help">{isDocenteMode ? 'Miniproyectos registrados.' : 'Áreas con miniproyectos visibles.'}</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Asignados</div>
                <div className="app-hero-metric__value">{publishedMiniproyectos}</div>
                <div className="app-hero-metric__help">Miniproyecto actual del área.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Activos</div>
                <div className="app-hero-metric__value">{activeMiniproyectos}</div>
                <div className="app-hero-metric__help">Disponibles en el flujo principal.</div>
              </div>
            </div>

            <div className="app-soft-card app-context-card app-miniproyecto-hero-context">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proyecto activo</p>
              <p className="app-context-card__title">{selectedMiniproyectoTitle}</p>
              <p className="app-context-card__text">Área seleccionada: {selectedAreaFilterName}</p>
              <p className="app-context-card__text">Área del registro: {selectedMiniproyectoArea}</p>
              <p className="app-context-card__text">Editor: {selectedEditorMode}</p>
            </div>
            </aside>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] gap-6">
          <section className="app-table-card">
            <div className="app-table-card__header app-table-card__header--blue">
              <div>
                <div className="app-table-card__title">Listado de miniproyectos</div>
                <p className="app-table-card__description">Selecciona un registro para cargarlo en el editor lateral.</p>
              </div>
            </div>
            <div className="app-table-card__body app-miniproyecto-table-body">

            {isLoading ? (
              <div className="app-empty-panel py-10">Cargando miniproyectos...</div>
            ) : error ? (
              <div className="app-alert app-alert--error">{error}</div>
            ) : filteredMiniproyectos.length === 0 ? (
              <div className="app-empty-panel py-10">No hay miniproyectos que coincidan con la búsqueda.</div>
            ) : (
              <div className="app-miniproyecto-group-stack">
                {groupedMiniproyectos.map((group, groupIndex) => (
                  <section key={group.area?.id || `group-${groupIndex}`} className="app-soft-card app-miniproyecto-area-group">
                    {(() => {
                      const hasAssignedMiniproyecto = group.items.some((item) => item.seleccionadoParaEstudiantes);

                      return (
                        <>
                    {!isDocenteMode ? (
                      <div className="app-miniproyecto-area-group__header">
                        <div>
                          <p className="app-miniproyecto-area-group__eyebrow">Área académica</p>
                          <h3 className="app-miniproyecto-area-group__title">{group.area?.nombre || 'Sin área asignada'}</h3>
                        </div>
                        <div className="app-miniproyecto-area-group__meta">{group.items.length} miniproyecto(s)</div>
                      </div>
                    ) : null}

                    {!hasAssignedMiniproyecto ? (
                      <div className="app-miniproyecto-area-group__notice" role="status">
                        <span className="app-miniproyecto-area-group__notice-chip">No hay miniproyectos del área</span>
                        <p className="app-miniproyecto-area-group__notice-text">
                          Esta área todavía no tiene un miniproyecto asignado para estudiantes.
                        </p>
                      </div>
                    ) : null}

                    <div className="app-miniproyecto-catalog-grid">
                      {group.items.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={`app-list-card app-list-card--compact app-miniproyecto-catalog-card w-full border-2 ${selected?.id === item.id ? 'shadow-lg translate-y-[-1px]' : ''}`}
                          style={
                            selected?.id === item.id
                              ? {
                                  borderColor: '#4A90E2',
                                  backgroundColor: '#F8FBFF'
                                }
                              : {
                                  borderColor: index % 3 === 0 ? '#BFDBFE' : index % 3 === 1 ? '#BBF7D0' : '#FDE68A',
                                  backgroundColor: '#FFFFFF'
                                }
                          }
                        >
                          <div className="app-list-card__head app-miniproyecto-catalog-card__head">
                            <div className="min-w-0 flex-1">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className={`app-badge ${item.Actividad?.estado !== false ? 'app-badge--green' : 'app-badge--amber'}`}>
                                  {item.Actividad?.estado !== false ? 'Activo' : 'Inhabilitado'}
                                </span>
                                <span className="app-badge app-badge--blue">{item.Actividad?.nivel_dificultad || 'Nivel no definido'}</span>
                                {item.seleccionadoParaEstudiantes ? (
                                  <span className="app-badge app-badge--green">Miniproyecto del área</span>
                                ) : null}
                              </div>
                              <h3 className="app-list-card__title uppercase">{item.Actividad?.titulo || 'Sin título'}</h3>
                              <p className="app-list-card__description mt-1.5">{item.Area?.nombre || 'Sin área asignada'}</p>
                            </div>
                            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#4A90E2] app-miniproyecto-catalog-card__action">
                              <ClipboardList className="w-4 h-4" />
                              <span>Editar</span>
                            </div>
                          </div>
                          <div className="app-list-card__footer">
                            <span className="app-list-card__meta">{item.chatbots?.length ? `${item.chatbots.length} chatbot(s) vinculados` : 'Sin chatbot vinculado'}</span>
                            <span className="app-list-card__meta">Actividad #{item.actividad_id || item.Actividad?.id || item.id}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                        </>
                      );
                    })()}
                  </section>
                ))}
              </div>
            )}
            </div>
          </section>

          <section className="app-table-card">
            <div className={`app-table-card__header ${selected ? 'app-table-card__header--green' : ''}`}>
              <div>
                <div className="app-table-card__title">Editor de miniproyecto</div>
                <p className="app-table-card__description">Ajusta la ficha del registro seleccionado y conserva el mismo orden visual que en el resto del panel.</p>
              </div>
            </div>
            <div className="app-table-card__body app-miniproyecto-table-body">
            {!selected ? (
              <div className="app-empty-panel py-12">Selecciona un miniproyecto para editar sus datos.</div>
            ) : (
              <form onSubmit={handleSave} className="app-form-stack app-miniproyecto-form-stack">
                <section className="app-form-section app-form-section--muted app-miniproyecto-base-section">
                  <div className="mb-3 space-y-1">
                    <h4 className="app-form-section-title">Información base</h4>
                    <p className="app-form-section-description">Define el título, la descripción general, el nivel y el entregable principal.</p>
                  </div>

                  <div className="app-miniproyecto-base-grid">
                <div className="app-form-field app-miniproyecto-base-grid__field">
                  <label className="app-form-label">Título</label>
                  <input
                    value={formData.titulo}
                    onChange={(event) => handleChange('titulo', event.target.value)}
                    className="app-form-input"
                  />
                </div>

                <div className="app-form-field app-miniproyecto-base-grid__field">
                  <label className="app-form-label">Nivel de dificultad</label>
                  <input
                    value={formData.nivel_dificultad}
                    onChange={(event) => handleChange('nivel_dificultad', event.target.value)}
                    className="app-form-input"
                  />
                </div>

                <div className="app-form-field app-miniproyecto-base-grid__field">
                  <label className="app-form-label">Entregable</label>
                  <input
                    value={formData.entregable}
                    onChange={(event) => handleChange('entregable', event.target.value)}
                    className="app-form-input"
                  />
                </div>

                <div className="app-form-field app-miniproyecto-base-grid__editor">
                  <label className="app-form-label">Descripción</label>
                  {usesRichDescriptionEditor ? (
                    <div className="quill-editor-container app-rich-text-editor app-miniproyecto-rich-editor" key={`rich-description-${selected?.id || 'none'}`}>
                      <div
                        ref={editorHostRef}
                        className="app-miniproyecto-rich-editor__host"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={formData.descripcion}
                      onChange={(event) => handleChange('descripcion', event.target.value)}
                      rows={6}
                      className="app-form-textarea"
                    />
                  )}
                </div>
                  </div>
                </section>
                {isConfigurableMiniproyecto ? (
                  <section className="app-form-section app-miniproyecto-mode-section">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="app-form-section-title">Miniproyecto configurable</h4>
                        <p className="text-xs text-gray-500">Este miniproyecto contiene ejercicios creados dentro del mismo flujo y puede usar un chatbot como cliente simulado.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">
                          Área: {selected?.Area?.nombre || 'Sin área'}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${selectedUseChatbot ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          Chatbot: {selectedUseChatbot ? 'Activado' : 'No usado'}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <ConfigurableEmbeddedExerciseEditor
                        exercises={selectedEmbeddedExercises}
                        onChange={setSelectedEmbeddedExercises}
                      />
                    </div>

                    <section className="app-form-section app-form-section--muted app-miniproyecto-config-panel">
                      <div className="app-miniproyecto-chatbot-band">
                        <div className="app-miniproyecto-chatbot-band__copy">
                          <h5 className="app-form-section-title">Simulación del cliente</h5>
                          <p className="app-form-section-description">Activa el chatbot cuando el proyecto necesite una contraparte simulada durante la actividad.</p>
                        </div>

                        <div className="app-miniproyecto-chatbot-controls">
                          <label className="app-miniproyecto-chatbot-toggle text-sm font-medium text-[#3A4A5B]">
                            <input
                              type="checkbox"
                              checked={selectedUseChatbot}
                              onChange={(event) => {
                                const enabled = event.target.checked;
                                setSelectedUseChatbot(enabled);
                                if (!enabled) {
                                  setSelectedChatbotId('');
                                }
                              }}
                              className="h-4 w-4"
                            />
                            Usar chatbot como simulación del cliente
                          </label>

                          {selectedUseChatbot ? (
                            <div className="app-miniproyecto-chatbot-select">
                              <select
                                value={selectedChatbotId}
                                onChange={(event) => setSelectedChatbotId(event.target.value)}
                                className="app-form-select"
                              >
                                <option value="">Selecciona un chatbot</option>
                                {selectedEligibleChatbots.map((chatbot) => (
                                  <option key={chatbot.id} value={String(chatbot.id)}>
                                    {chatbot.nombre} {chatbot.tipo === 'GENERAL' ? '(general)' : '(miniproyecto)'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="app-form-note app-miniproyecto-chatbot-note">
                              Activa la simulación para seleccionar un chatbot de apoyo al caso.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                  </section>
                ) : isProgrammingMiniproyecto ? (
                  <section className="app-form-section app-miniproyecto-mode-section">
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="app-form-section-title">Configuración MVC del compilador</h4>
                          <p className="mt-1 text-xs text-gray-500">
                            Define el código de plantilla que verá el estudiante en cada archivo y la salida esperada para la evaluación automática.
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">Java · MVC</span>
                      </div>

                      {/* Model name */}
                      <div>
                        <label className="block text-sm font-medium text-[#3A4A5B] mb-1">
                          Nombre de la clase Modelo *
                        </label>
                        <input
                          type="text"
                          value={mvcNombreModelo}
                          onChange={(e) => setMvcNombreModelo(e.target.value.trim() || 'SeguridadBancaria')}
                          placeholder="SeguridadBancaria"
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] font-mono text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">El nombre en Java debe iniciar con mayúscula y no tener espacios.</p>
                      </div>

                      {/* Tab editor for Main + Modelo + ConsolaIO preview */}
                      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        {/* Tab bar */}
                        <div className="flex border-b border-gray-700 bg-[#1E1E1E]">
                          {(
                            [
                              { id: 'main' as const, label: 'Main.java' },
                              { id: 'modelo' as const, label: `${mvcNombreModelo || 'Modelo'}.java` },
                              { id: 'consolaIO' as const, label: 'ConsolaIO.java (fija)' },
                            ]
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setMvcActiveTab(tab.id)}
                              className={`px-4 py-2.5 text-xs font-mono transition-colors border-r border-gray-700 ${
                                mvcActiveTab === tab.id
                                  ? 'bg-[#2D2D2D] text-white border-t-2 border-t-[#4A90E2]'
                                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252525]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Monaco — renderizado condicional para que el editor siempre monte con el valor correcto */}
                        <div style={{ minHeight: '280px' }}>
                          {mvcActiveTab === 'main' && (
                            <JavaEditor key="mini-main" value={mvcTemplateMain} readOnly={false} onChange={(v) => setMvcTemplateMain(v)} height={280} />
                          )}
                          {mvcActiveTab === 'modelo' && (
                            <JavaEditor key="mini-modelo" value={mvcTemplateModelo} readOnly={false} onChange={(v) => setMvcTemplateModelo(v)} height={280} />
                          )}
                          {mvcActiveTab === 'consolaIO' && (
                            <JavaEditor key="mini-consolaIO" value={CONSOLA_IO_SOURCE} readOnly readOnlyLabel="ConsolaIO.java — solo lectura, clase fija del sistema" height={280} />
                          )}
                        </div>
                        <p className="bg-[#1E1E1E] border-t border-gray-700 px-3 py-1.5 text-gray-500 text-[11px] font-mono">
                          {mvcActiveTab === 'consolaIO'
                            ? 'ConsolaIO.java es fija e inamovible — el sistema la incluye automáticamente en cada compilación.'
                            : 'Este contenido es la plantilla de inicio que verá el estudiante. Puede editarlo durante la resolución.'}
                        </p>
                      </div>

                      {/* Casos de prueba */}
                      <div>
                        <label className="block text-sm font-medium text-[#3A4A5B] mb-1">Casos de prueba *</label>
                        <p className="text-xs text-gray-500 mb-3">
                          <strong>Inputs</strong>: valores separados por coma (ej: <code className="font-mono">4,12000,10</code>).<br />
                          <strong>Output</strong>: una línea por cada <code className="font-mono">println</code> del programa.
                        </p>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                          {mvcCasosPrueba.map((caso, idx) => (
                            <div key={idx} className="space-y-2 bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
                              <div className="text-xs font-semibold uppercase tracking-wide text-[#3A4A5B]">Caso {idx + 1}</div>
                              <div>
                                <label className="block text-xs font-medium text-[#3A4A5B] mb-1">Inputs (stdin)</label>
                                <input
                                  type="text"
                                  value={caso.inputs}
                                  onChange={(e) => {
                                    const next = mvcCasosPrueba.map((c, i) => i === idx ? { ...c, inputs: e.target.value } : c);
                                    setMvcCasosPrueba(next);
                                  }}
                                  placeholder="Ej: 4,12000,10"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] text-sm font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[#3A4A5B] mb-1">Output esperado *</label>
                                <textarea
                                  rows={4}
                                  value={caso.output}
                                  onChange={(e) => {
                                    const next = mvcCasosPrueba.map((c, i) => i === idx ? { ...c, output: e.target.value } : c);
                                    setMvcCasosPrueba(next);
                                  }}
                                  placeholder={"Total: 48000.0\nDescuento: 4800.0\nTotal a pagar: 43200.0"}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] text-sm font-mono resize-none"
                                />
                                <p className="mt-0.5 text-[10px] text-gray-400 font-mono">una línea por cada println</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="app-form-section app-miniproyecto-mode-section">
                  <div className="space-y-4">
                    {isManagementMiniproyecto ? (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Objetivo principal</label>
                          <textarea
                            value={projectObjective}
                            onChange={(event) => setProjectObjective(event.target.value)}
                            rows={3}
                            placeholder="Resume el propósito central del proyecto según el charter."
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Objetivos específicos</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={specificObjectiveInput}
                              onChange={(event) => setSpecificObjectiveInput(event.target.value)}
                              placeholder="Agregar objetivo específico"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(specificObjectiveInput, setSpecificObjectivesList, () => setSpecificObjectiveInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {specificObjectivesList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setSpecificObjectivesList)} className="text-cyan-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Entregables clave</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={scopeInput}
                              onChange={(event) => setScopeInput(event.target.value)}
                              placeholder="Agregar entregable"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(scopeInput, setScopeList, () => setScopeInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {scopeList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setScopeList)} className="text-blue-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Hitos del proyecto</label>
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                            <div
                              className="bg-gray-50 text-[11px] text-gray-500"
                              style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr auto' }}
                            >
                              <div className="px-3 py-2">Hito</div>
                              <div className="px-3 py-2">Inicio</div>
                              <div className="px-3 py-2">Fin</div>
                              <div className="px-3 py-2"></div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {scheduleRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2"
                                  style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}
                                >
                                  <input
                                    value={row.milestone}
                                    onChange={(event) => {
                                      const updated = [...scheduleRows];
                                      updated[index] = { ...updated[index], milestone: event.target.value };
                                      setScheduleRows(updated);
                                    }}
                                    placeholder="Hito"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <input
                                    type="date"
                                    value={row.start}
                                    onChange={(event) => {
                                      const updated = [...scheduleRows];
                                      updated[index] = { ...updated[index], start: event.target.value };
                                      setScheduleRows(updated);
                                    }}
                                    placeholder="Inicio"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <input
                                    type="date"
                                    value={row.end}
                                    onChange={(event) => {
                                      const updated = [...scheduleRows];
                                      updated[index] = { ...updated[index], end: event.target.value };
                                      setScheduleRows(updated);
                                    }}
                                    placeholder="Fin"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (scheduleRows.length === 1) {
                                        setScheduleRows([{ milestone: '', start: '', end: '' }]);
                                        return;
                                      }
                                      setScheduleRows(scheduleRows.filter((_, rowIndex) => rowIndex !== index));
                                    }}
                                    className="text-xs text-red-500 hover:text-red-600"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setScheduleRows([...scheduleRows, { milestone: '', start: '', end: '' }])}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              + Agregar fila
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Costos por entregable</label>
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                            <div
                              className="bg-gray-50 text-[11px] text-gray-500"
                              style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.9fr 1.2fr 1fr' }}
                            >
                              <div className="px-3 py-2">Entregable</div>
                              <div className="px-3 py-2">Cantidad</div>
                              <div className="px-3 py-2">Precio unitario</div>
                              <div className="px-3 py-2 text-right">Subtotal</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {costRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2"
                                  style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.9fr 1.2fr 1fr', gap: '8px', alignItems: 'center' }}
                                >
                                  <input
                                    value={row.deliverable}
                                    readOnly
                                    className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs text-gray-600"
                                  />
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step="1"
                                    value={row.quantity}
                                    onChange={(event) => {
                                      const updated = [...costRows];
                                      updated[index] = { ...updated[index], quantity: event.target.value };
                                      setCostRows(updated);
                                    }}
                                    placeholder="Cantidad"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={row.unitPrice}
                                    onChange={(event) => {
                                      const updated = [...costRows];
                                      updated[index] = { ...updated[index], unitPrice: event.target.value };
                                      setCostRows(updated);
                                    }}
                                    placeholder="Precio unitario"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <div className="text-right text-xs font-semibold text-gray-700">
                                    {formatCurrency(calculateRowTotal(row))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="grid gap-3 border-t border-gray-200 px-3 py-3 text-xs text-gray-600 md:grid-cols-[1fr_auto] md:items-center">
                              <div className="grid gap-2 md:grid-cols-2">
                                <label className="flex items-center gap-2">
                                  <span>Imprevistos (%)</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={contingencyPercentage}
                                    onChange={(event) => setContingencyPercentage(event.target.value)}
                                    className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                  />
                                </label>
                                <label className="flex items-center gap-2">
                                  <span>Utilidad (%)</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={utilityPercentage}
                                    onChange={(event) => setUtilityPercentage(event.target.value)}
                                    className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                                  />
                                </label>
                              </div>
                              <div className="space-y-1 text-right">
                                <div>Total: <span className="font-semibold">{formatCurrency(totalCost)}</span></div>
                                <div>Imprevistos: <span className="font-semibold">{formatCurrency(contingencyValue)}</span></div>
                                <div>Utilidad: <span className="font-semibold">{formatCurrency(utilityValue)}</span></div>
                                <div>Total proyecto: <span className="font-semibold">{formatCurrency(projectTotal)}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Supuestos del proyecto</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={assumptionInput}
                              onChange={(event) => setAssumptionInput(event.target.value)}
                              placeholder="Agregar supuesto del proyecto"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(assumptionInput, setAssumptionsList, () => setAssumptionInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assumptionsList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setAssumptionsList)} className="text-slate-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Stakeholders</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={stakeholderInput}
                              onChange={(event) => setStakeholderInput(event.target.value)}
                              placeholder="Agregar stakeholder"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(stakeholderInput, setStakeholdersList, () => setStakeholderInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {stakeholdersList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setStakeholdersList)} className="text-blue-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Requisitos funcionales</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={functionalInput}
                              onChange={(event) => setFunctionalInput(event.target.value)}
                              placeholder="Agregar requisito funcional"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(functionalInput, setFunctionalList, () => setFunctionalInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {functionalList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setFunctionalList)} className="text-green-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Requisitos no funcionales</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={nonFunctionalInput}
                              onChange={(event) => setNonFunctionalInput(event.target.value)}
                              placeholder="Agregar requisito no funcional"
                              className="app-form-input"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(nonFunctionalInput, setNonFunctionalList, () => setNonFunctionalInput(''))}
                              className="app-btn app-primary-btn app-btn-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {nonFunctionalList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setNonFunctionalList)} className="text-orange-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  </section>
                )}

                {error && (
                  <div className="app-alert app-alert--error"><span>{error}</span></div>
                )}

                <section className="app-form-section app-form-section--accent app-miniproyecto-summary-section">
                  <h4 className="app-form-section-title">Resumen del registro</h4>
                  <div className="app-miniproyecto-summary-grid mt-4 text-sm">
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Proyecto</div>
                      <div className="app-form-summary-value">{selectedMiniproyectoTitle}</div>
                      <div className="app-form-summary-help">{selectedMiniproyectoArea}</div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Editor</div>
                      <div className="app-form-summary-value">{selectedEditorMode}</div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Estado</div>
                      <div className="app-form-summary-value">{selected?.Actividad?.estado !== false ? 'Activo' : 'Inhabilitado'}</div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Estudiantes</div>
                      <div className="app-form-summary-value">{selected?.seleccionadoParaEstudiantes ? 'Asignado al área' : 'No asignado'}</div>
                    </div>
                  </div>
                </section>

                <div className="app-action-row justify-start">
                  <button
                    type="button"
                    disabled={isPublishing || selected?.Actividad?.estado === false}
                    onClick={() => selected && handleUpdateStudentPublication(selected, !selected.seleccionadoParaEstudiantes)}
                    className="app-btn app-btn-secondary disabled:opacity-70"
                  >
                    {selected?.seleccionadoParaEstudiantes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {isPublishing
                      ? 'Actualizando asignación...'
                      : selected?.seleccionadoParaEstudiantes
                        ? 'Quitar como miniproyecto del área'
                        : 'Asignar como miniproyecto del área'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-btn app-primary-btn disabled:opacity-70"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}
            </div>
          </section>
        </div>
      </main>

      {showCreateModal ? (
        <CreateConfigurableMiniproyectoWorkspace
          formData={createForm}
          availableAreas={availableAreas}
          eligibleChatbots={createEligibleChatbots}
          error={createError}
          isCreating={isCreating}
          onClose={closeCreateModal}
          onSubmit={handleCreateConfigurableMiniproyecto}
          onUpdate={setCreateForm}
          onChatbotCreated={handleChatbotCreated}
          apiFetch={apiFetch}
        />
      ) : null}

      {showExpectedModal && expectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1F2A37]">Respuesta esperada guardada</h3>
              <button
                onClick={() => setShowExpectedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            {managementSnapshot ? (
              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-cyan-700 mb-2">Objetivo principal</h4>
                  <ul className="text-xs text-cyan-700 space-y-1">
                    {managementSnapshot!.objetivoPrincipal.map((item: string, index: number) => (
                      <li key={`objective-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-sky-700 mb-2">Objetivos específicos</h4>
                  <ul className="text-xs text-sky-700 space-y-1">
                    {managementSnapshot!.objetivosEspecificos.map((item: string, index: number) => (
                      <li key={`specific-objective-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Entregables clave</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {managementSnapshot!.entregables.map((item: string, index: number) => (
                      <li key={`scope-${index}`}>• {item}</li>
                    ))}
                  </ul>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-2">Cronograma</h4>
                    <ul className="text-xs text-green-700 space-y-1">
                      {managementSnapshot!.cronograma.map((item: string, index: number) => (
                        <li key={`schedule-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-orange-700 mb-2">Costos</h4>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {managementSnapshot!.costos.map((item: string, index: number) => (
                        <li key={`cost-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Supuestos</h4>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {managementSnapshot!.supuestos.map((item: string, index: number) => (
                      <li key={`assumption-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Stakeholders</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {analysisSnapshot?.stakeholders.map((item: string, index: number) => (
                      <li key={`stake-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Requisitos funcionales</h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    {analysisSnapshot?.requisitosFuncionales.map((item: string, index: number) => (
                      <li key={`func-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-orange-700 mb-2">Requisitos no funcionales</h4>
                  <ul className="text-xs text-orange-700 space-y-1">
                    {analysisSnapshot?.requisitosNoFuncionales.map((item: string, index: number) => (
                      <li key={`nonfunc-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowExpectedModal(false)}
                className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
