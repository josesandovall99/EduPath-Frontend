import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Database,
  Eye,
  FileText,
  Loader,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessForMarkdown } from '../utils/markdown';

const CHATBOT_TIMEOUT_MS = 120000;
const MODEL_OPTIONS = ['qwen2.5:0.5b', 'llama3.2:1b', 'llama3.2'];

interface ChatbotManagementScreenProps {
  onBack: () => void;
  mode?: 'admin' | 'docente';
  docenteId?: number;
  docentePersonaId?: number;
  docenteAsignaturaId?: number;
}

interface AsignaturaItem {
  id: number;
  nombre: string;
}

interface MiniproyectoItem {
  id: number;
  asignatura_id?: number;
  Asignatura?: {
    id?: number;
    nombre?: string;
  };
  Actividad?: {
    titulo?: string;
  };
}

interface ChatbotDocumentItem {
  id: number;
  nombre_original?: string;
  nombre_archivo?: string;
  tamano_bytes?: number;
}

interface ChatbotItem {
  id: number;
  nombre: string;
  descripcion?: string | null;
  tipo: 'GENERAL' | 'GENERAL_ADMINISTRADOR' | 'GENERAL_DOCENTE' | 'MINIPROYECTO';
  provider?: string | null;
  prompt_base?: string | null;
  asignatura_id?: number | null;
  miniproyecto_id?: number | null;
  model_name?: string;
  top_k?: number;
  max_context_chars?: number;
  max_tokens?: number;
  temperature?: number;
  estado?: boolean;
  documentos?: ChatbotDocumentItem[];
}

interface ChatbotStats {
  success?: boolean;
  provider?: string;
  model?: string;
  documentos?: number;
  documentsCount?: number;
  chunksLoaded?: number;
  message?: string;
}

interface ChatMessage {
  text: string;
  isBot: boolean;
}

interface ChatbotFormState {
  id: number | null;
  nombre_chatbot: string;
  descripcion: string;
  tipo: 'GENERAL' | 'GENERAL_ADMINISTRADOR' | 'GENERAL_DOCENTE' | 'MINIPROYECTO';
  prompt_base: string;
  asignatura_id: string;
  miniproyecto_id: string;
  model: string;
  topK: string;
  max_context_chars: string;
  max_tokens: string;
  temperature: string;
  estado: boolean;
}

const emptyForm = (): ChatbotFormState => ({
  id: null,
  nombre_chatbot: '',
  descripcion: '',
  tipo: 'GENERAL',
  prompt_base: '',
  asignatura_id: '',
  miniproyecto_id: '',
  model: 'qwen2.5:0.5b',
  topK: '5',
  max_context_chars: '4000',
  max_tokens: '512',
  temperature: '0.1',
  estado: true,
});

function replaceLastBotMessage(messages: ChatMessage[], text: string) {
  const nextMessages = [...messages];
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index].isBot) {
      nextMessages[index] = { ...nextMessages[index], text };
      return nextMessages;
    }
  }

  nextMessages.push({ text, isBot: true });
  return nextMessages;
}

function formatBytes(value?: number) {
  if (!value) return '0 KB';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getMiniproyectoasignaturaId(item: MiniproyectoItem) {
  if (Number.isFinite(Number(item.asignatura_id))) {
    return Number(item.asignatura_id);
  }

  if (Number.isFinite(Number(item.Asignatura?.id))) {
    return Number(item.Asignatura?.id);
  }

  return null;
}

function getMiniproyectoLabel(item: MiniproyectoItem) {
  const title = item.Actividad?.titulo?.trim();
  if (title) {
    return title;
  }

  return `Miniproyecto ${item.id}`;
}

const TEMPERATURE_OPTIONS = ['0.1', '0.4', '0.7', '1.0'];
const TOPK_OPTIONS = ['3', '5', '10'];
const MAX_TOKENS_OPTIONS = ['256', '512', '1024', '2048'];
const MAX_CONTEXT_CHARS_OPTIONS = ['1000', '4000', '8000'];

function snapToNearest(value: number, options: string[]): string {
  const nums = options.map(Number);
  const closest = nums.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
  return String(closest);
}

function mapChatbotToForm(chatbot: ChatbotItem): ChatbotFormState {
  return {
    id: Number(chatbot.id) || null,
    nombre_chatbot: chatbot.nombre || '',
    descripcion: chatbot.descripcion || '',
    tipo: chatbot.tipo || 'GENERAL',
    prompt_base: chatbot.prompt_base || '',
    asignatura_id: chatbot.asignatura_id ? String(chatbot.asignatura_id) : '',
    miniproyecto_id: chatbot.miniproyecto_id ? String(chatbot.miniproyecto_id) : '',
    model: chatbot.model_name || 'qwen2.5:0.5b',
    topK: snapToNearest(Number(chatbot.top_k || 5), TOPK_OPTIONS),
    max_context_chars: snapToNearest(Number(chatbot.max_context_chars || 4000), MAX_CONTEXT_CHARS_OPTIONS),
    max_tokens: snapToNearest(Number(chatbot.max_tokens || 512), MAX_TOKENS_OPTIONS),
    temperature: '0.1',
    estado: chatbot.estado !== false,
  };
}

function isRoleScopedGeneralType(type: ChatbotFormState['tipo']) {
  return type === 'GENERAL_ADMINISTRADOR' || type === 'GENERAL_DOCENTE';
}

function isGeneralType(type: ChatbotFormState['tipo']) {
  return type === 'GENERAL' || isRoleScopedGeneralType(type);
}

function getChatbotTypeLabel(type: ChatbotFormState['tipo'], mode: 'admin' | 'docente' = 'admin') {
  switch (type) {
    case 'GENERAL_ADMINISTRADOR':
      return 'General administrador';
    case 'GENERAL_DOCENTE':
      return 'General docente';
    case 'MINIPROYECTO':
      return 'Miniproyecto';
    default:
      return mode === 'docente' ? 'General de asignatura' : 'General';
  }
}

function getChatbotTypePillClass(type: ChatbotFormState['tipo']) {
  switch (type) {
    case 'GENERAL_ADMINISTRADOR':
      return 'chatbot-admin-pill--blue';
    case 'GENERAL_DOCENTE':
      return 'chatbot-admin-pill--slate';
    case 'MINIPROYECTO':
      return 'chatbot-admin-pill--amber';
    default:
      return 'chatbot-admin-pill--green';
  }
}

function getChatbotTypeBadgeClass(type: ChatbotFormState['tipo']) {
  switch (type) {
    case 'GENERAL_ADMINISTRADOR':
      return 'chatbot-admin-badge--green';
    case 'GENERAL_DOCENTE':
      return 'chatbot-admin-badge--slate';
    case 'MINIPROYECTO':
      return 'chatbot-admin-badge--amber';
    default:
      return 'chatbot-admin-badge--green';
  }
}

function getChatbotLibraryIconClass(type: ChatbotFormState['tipo']) {
  switch (type) {
    case 'MINIPROYECTO':
      return 'chatbot-admin-library-card__icon--amber';
    default:
      return 'chatbot-admin-library-card__icon--green';
  }
}

function getChatbotVisibilityHint(type: ChatbotFormState['tipo'], mode: 'admin' | 'docente' = 'admin') {
  if (type === 'GENERAL' && mode === 'docente') {
    return 'Visible para el estudiante en materia, tema, subtema y contenido del Asignatura.';
  }

  if (type === 'GENERAL' && mode === 'admin') {
    return 'Visible para el estudiante en el dashboard principal.';
  }

  if (type === 'GENERAL_ADMINISTRADOR') {
    return 'Visible en el dashboard del administrador.';
  }

  if (type === 'GENERAL_DOCENTE') {
    return 'Visible en el dashboard del docente.';
  }

  return 'Visible cuando el estudiante entra al miniproyecto asociado.';
}

function getChatbotUsageContextLabel(type: ChatbotFormState['tipo'], mode: 'admin' | 'docente' = 'admin') {
  if (type === 'GENERAL' && mode === 'docente') {
    return 'En uso en Asignatura';
  }

  if (type === 'GENERAL' && mode === 'admin') {
    return 'En uso en dashboard';
  }

  if (type === 'GENERAL_ADMINISTRADOR') {
    return 'En uso en panel admin';
  }

  if (type === 'GENERAL_DOCENTE') {
    return 'En uso en panel docente';
  }

  return 'En uso en miniproyecto';
}

function enforceDocenteFormMode(formState: ChatbotFormState, docenteAsignaturaId?: number, fallbackasignaturaId?: number) {
  const nextType = formState.tipo === 'GENERAL_ADMINISTRADOR' || formState.tipo === 'GENERAL_DOCENTE'
    ? 'GENERAL'
    : formState.tipo;

  return {
    ...formState,
    tipo: nextType,
    asignatura_id: formState.asignatura_id || String(Number(docenteAsignaturaId) || Number(fallbackasignaturaId) || ''),
  };
}

function buildChatbotPayload(chatbot: ChatbotItem, overrides: { estado?: boolean } = {}) {
  const tipo = chatbot.tipo;
  return {
    nombre_chatbot: chatbot.nombre,
    descripcion: chatbot.descripcion || '',
    tipo,
    prompt_base: chatbot.prompt_base || '',
    estado: overrides.estado !== undefined ? overrides.estado : chatbot.estado !== false,
    configuracion: {
      asignatura_id: isRoleScopedGeneralType(tipo) ? null : (chatbot.asignatura_id ?? null),
      miniproyecto_id: tipo === 'MINIPROYECTO' ? (chatbot.miniproyecto_id ?? null) : null,
    },
    parametros_rendimiento: {
      model: chatbot.model_name || 'qwen2.5:0.5b',
      topK: chatbot.top_k || 5,
      max_context_chars: chatbot.max_context_chars || 4000,
      max_tokens: chatbot.max_tokens || 512,
      temperature: 0.1,
    },
  };
}

function InfoBadge({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="relative inline-flex w-5 h-5 shrink-0 rounded-full border border-slate-200 bg-slate-100 cursor-help align-middle"
    >
      <span className="absolute inset-0 flex items-center justify-center text-[10px] leading-none font-bold text-slate-500">
        i
      </span>
    </span>
  );
}

export function ChatbotManagementScreen({
  onBack,
  mode = 'admin',
  docenteId,
  docentePersonaId,
  docenteAsignaturaId,
}: ChatbotManagementScreenProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const documentSectionRef = useRef<HTMLDivElement | null>(null);
  const isDocenteMode = mode === 'docente';

  const [chatbots, setChatbots] = useState<ChatbotItem[]>([]);
  const [asignaturas, setAsignaturas] = useState<AsignaturaItem[]>([]);
  const [miniproyectos, setMiniproyectos] = useState<MiniproyectoItem[]>([]);
  const [selectedChatbotId, setSelectedChatbotId] = useState<number | null>(null);
  const [form, setForm] = useState<ChatbotFormState>(emptyForm());
  const [documents, setDocuments] = useState<ChatbotDocumentItem[]>([]);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'GENERAL' | 'GENERAL_ADMINISTRADOR' | 'GENERAL_DOCENTE' | 'MINIPROYECTO'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statusMessage, setStatusMessage] = useState('');
  const [pdfSizeError, setPdfSizeError] = useState('');

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

    if (isDocenteMode && Number.isFinite(Number(docenteAsignaturaId))) {
      headers['x-asignatura-id'] = String(Number(docenteAsignaturaId));
    }

    if (Number.isFinite(personaId)) {
      headers['x-persona-id'] = String(personaId);
    }

    return headers;
  }, [docenteAsignaturaId, docenteId, docentePersonaId, isDocenteMode]);

  function apiFetch(path: string, init: RequestInit = {}, asignaturaIdOverride?: number | null) {
    const nextHeaders = new Headers(init.headers || {});

    Object.entries(requestHeaders).forEach(([key, value]) => {
      if (!nextHeaders.has(key)) {
        nextHeaders.set(key, value);
      }
    });

    if (Number.isFinite(Number(asignaturaIdOverride))) {
      nextHeaders.set('x-asignatura-id', String(Number(asignaturaIdOverride)));
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: nextHeaders,
    });
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    // No limpiar campos automáticamente si el usuario está editando un chatbot existente.
    if (form.id !== null) return;
    if (isGeneralType(form.tipo) && form.miniproyecto_id) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
    }
  }, [form.id, form.tipo, form.miniproyecto_id]);

  useEffect(() => {
    // No limpiar campos automáticamente si el usuario está editando un chatbot existente.
    if (form.id !== null) return;
    if (!isRoleScopedGeneralType(form.tipo)) {
      return;
    }

    if (form.asignatura_id || form.miniproyecto_id) {
      setForm((prev) => ({ ...prev, asignatura_id: '', miniproyecto_id: '' }));
    }
  }, [form.id, form.tipo, form.asignatura_id, form.miniproyecto_id]);

  useEffect(() => {
    // No limpiar campos automáticamente si el usuario está editando un chatbot existente.
    if (form.id !== null) return;
    if (form.tipo !== 'MINIPROYECTO') {
      return;
    }

    if (!form.asignatura_id && form.miniproyecto_id) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
      return;
    }

    if (!form.miniproyecto_id) {
      return;
    }

    const selectedAsignaturaId = Number(form.asignatura_id);
    if (!Number.isFinite(selectedAsignaturaId)) {
      return;
    }

    const selectedMiniproyecto = miniproyectos.find((item) => Number(item.id) === Number(form.miniproyecto_id));
    if (!selectedMiniproyecto) {
      return;
    }

    const miniproyectoasignaturaId = getMiniproyectoasignaturaId(selectedMiniproyecto);
    if (miniproyectoasignaturaId !== selectedAsignaturaId) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
    }
  }, [form.id, form.tipo, form.asignatura_id, form.miniproyecto_id, miniproyectos]);

  const searchedChatbots = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chatbots;

    return chatbots.filter((chatbot) => {
      const name = chatbot.nombre?.toLowerCase() || '';
      const type = chatbot.tipo?.toLowerCase() || '';
      const model = chatbot.model_name?.toLowerCase() || '';
      return name.includes(term) || type.includes(term) || model.includes(term);
    });
  }, [chatbots, search]);

  const visibleChatbots = useMemo(() => {
    return searchedChatbots.filter((chatbot) => {
      const matchesType = typeFilter === 'all' || chatbot.tipo === typeFilter;
      const isActive = chatbot.estado !== false;
      const matchesState =
        stateFilter === 'all' ||
        (stateFilter === 'active' ? isActive : !isActive);
      return matchesType && matchesState;
    });
  }, [searchedChatbots, typeFilter, stateFilter]);

  const AsignaturaOptions = useMemo(() => asignaturas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)), [asignaturas]);

  useEffect(() => {
    if (!isDocenteMode || form.asignatura_id || AsignaturaOptions.length !== 1) {
      return;
    }

    setForm((prev) => ({ ...prev, asignatura_id: String(AsignaturaOptions[0].id) }));
  }, [AsignaturaOptions, form.asignatura_id, isDocenteMode]);

  const miniproyectoOptions = useMemo(() => {
    const asignaturaId = Number(form.asignatura_id);
    return miniproyectos
      .filter((item) => {
        if (!Number.isFinite(asignaturaId)) {
          return false;
        }

        return getMiniproyectoasignaturaId(item) === asignaturaId;
      })
      .sort((a, b) => getMiniproyectoLabel(a).localeCompare(getMiniproyectoLabel(b)));
  }, [form.asignatura_id, miniproyectos]);

  const selectedAsignatura = AsignaturaOptions.find((Asignatura) => String(Asignatura.id) === form.asignatura_id);
  const selectedMiniproyecto = miniproyectos.find((item) => String(item.id) === form.miniproyecto_id);
  const totalChatbots = chatbots.length;
  const activeChatbots = chatbots.filter((chatbot) => chatbot.estado !== false).length;
  const inactiveChatbots = totalChatbots - activeChatbots;
  const generalChatbots = chatbots.filter((chatbot) => isGeneralType(chatbot.tipo)).length;
  const miniproyectoChatbots = chatbots.filter((chatbot) => chatbot.tipo === 'MINIPROYECTO').length;
  const selectedChatbot = chatbots.find((chatbot) => chatbot.id === selectedChatbotId) || null;
  const selectedChatbotIsActive = selectedChatbot?.estado !== false;
  const selectedChatbotDescription = form.descripcion.trim() || 'Sin descripción breve.';
  const selectedChatbotScope =
    form.tipo === 'GENERAL'
      ? selectedAsignatura?.nombre
        ? isDocenteMode
          ? `General del asignatura ${selectedAsignatura.nombre}.`
          : `General con foco en ${selectedAsignatura.nombre}.`
        : isDocenteMode
          ? 'Cobertura general del asignatura asignada.'
          : 'Cobertura general.'
      : form.tipo === 'GENERAL_ADMINISTRADOR'
        ? 'Disponible para el panel de administrador.'
        : form.tipo === 'GENERAL_DOCENTE'
          ? 'Disponible para el panel de docente.'
      : selectedMiniproyecto
        ? `Vinculado a ${getMiniproyectoLabel(selectedMiniproyecto)}.`
        : 'Miniproyecto pendiente.';
  const selectedChatbotReadiness = selectedChatbotId
    ? documents.length > 0
      ? 'Listo para probar.'
      : 'Faltan documentos.'
    : 'Crea el chatbot primero.';
  const statsProvider = stats?.provider || selectedChatbot?.provider || '-';
  const statsModel = stats?.model || selectedChatbot?.model_name || form.model || '-';
  const statsDocuments = stats?.documentos ?? stats?.documentsCount ?? documents.length;
  const statsChunks = stats?.chunksLoaded ?? stats?.documentsCount ?? 0;
  const statsMessage =
    stats?.message ||
    (selectedChatbotId
      ? documents.length > 0
        ? `${documents.length} documento(s) asociado(s) al chatbot.`
        : 'Sin fragmentos cargados todavía.'
      : 'Selecciona un chatbot para ver su estado.');
  const formCompletion = [
    form.nombre_chatbot.trim(),
    form.descripcion.trim(),
    form.tipo,
    form.model.trim(),
    isGeneralType(form.tipo) && !isDocenteMode ? true : form.asignatura_id,
    isGeneralType(form.tipo) ? true : form.miniproyecto_id,
  ].filter(Boolean).length;
  const canConfirmPdf = Boolean(selectedChatbotId && selectedFile && !isUploading);
  const canCancelPdf = Boolean(selectedFile);

  function scrollToDocumentSection() {
    documentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPdfPicker() {
    if (!selectedChatbotId) {
      setStatusMessage('El chatbot debe estar registrado antes de asociar el PDF.');
      scrollToDocumentSection();
      return;
    }

    scrollToDocumentSection();
    window.setTimeout(() => {
      uploadInputRef.current?.click();
    }, 150);
  }

  async function loadInitialData() {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const asignaturasEndpoint = isDocenteMode ? '/asignaturas/mis-asignaturas' : '/asignaturas';
      const [chatbotsResponse, asignaturasResponse, miniproyectosResponse] = await Promise.all([
        apiFetch('/chatbots'),
        apiFetch(asignaturasEndpoint),
        apiFetch('/miniproyectos', {}, docenteAsignaturaId ?? null),
      ]);

      if (!chatbotsResponse.ok) throw new Error('No se pudieron cargar los chatbots.');
      if (!asignaturasResponse.ok) throw new Error('No se pudieron cargar las asignaturas.');
      if (!miniproyectosResponse.ok) throw new Error('No se pudieron cargar los miniproyectos.');

      const [chatbotsData, asignaturasData, miniproyectosData] = await Promise.all([
        chatbotsResponse.json(),
        asignaturasResponse.json(),
        miniproyectosResponse.json(),
      ]);

      const nextChatbots = Array.isArray(chatbotsData) ? chatbotsData : [];
      setChatbots(nextChatbots);
      setAsignaturas(Array.isArray(asignaturasData) ? asignaturasData : []);
      setMiniproyectos(Array.isArray(miniproyectosData) ? miniproyectosData : []);

      if (nextChatbots.length > 0) {
        await selectChatbot(nextChatbots[0]);
      } else {
        handleCreateNew();
      }
    } catch (error) {
      console.error('Error loading chatbot admin data:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al cargar la gestión de chatbots.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadChatbots() {
    const response = await apiFetch('/chatbots');
    if (!response.ok) {
      throw new Error('No se pudieron refrescar los chatbots.');
    }

    const data = await response.json();
    const nextChatbots = Array.isArray(data) ? data : [];
    setChatbots(nextChatbots);
    return nextChatbots;
  }

  async function selectChatbot(chatbot: ChatbotItem) {
    setSelectedChatbotId(chatbot.id);
    setForm(
      isDocenteMode
        ? enforceDocenteFormMode(mapChatbotToForm(chatbot), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
        : mapChatbotToForm(chatbot)
    );
    setDocuments(chatbot.documentos || []);
    setMessages([]);

    try {
      const [documentsResponse, statsResponse] = await Promise.all([
        apiFetch(`/chatbots/${chatbot.id}/documents`),
        apiFetch(`/chatbots/${chatbot.id}/stats`),
      ]);

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(Array.isArray(documentsData) ? documentsData : []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error selecting chatbot:', error);
      setStats(null);
    }
  }

  function handleCreateNew() {
    setSelectedChatbotId(null);
    setForm(
      isDocenteMode
        ? enforceDocenteFormMode(emptyForm(), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
        : {
            ...emptyForm(),
            asignatura_id: '',
          }
    );
    setDocuments([]);
    setStats(null);
    setSelectedFile(null);
    setMessages([]);
    setIsFormVisible(true);
    setStatusMessage('Preparando un nuevo chatbot.');
  }

  function handleEditSelected() {
    if (!selectedChatbotId) {
      setStatusMessage('Selecciona un chatbot antes de editarlo.');
      return;
    }

    const selectedChatbot = chatbots.find((item) => item.id === selectedChatbotId);
    if (!selectedChatbot) {
      setStatusMessage('No se encontró el chatbot seleccionado.');
      return;
    }

    // Garantizar que form.id corresponde al chatbot seleccionado antes de abrir el formulario.
    setForm(
      isDocenteMode
        ? enforceDocenteFormMode(mapChatbotToForm(selectedChatbot), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
        : mapChatbotToForm(selectedChatbot)
    );
    setIsFormVisible(true);
    setStatusMessage('Editando configuración del chatbot seleccionado.');
  }

  function handleCloseForm() {
    setIsFormVisible(false);
    setSelectedFile(null);

    if (selectedChatbotId) {
      const selectedChatbot = chatbots.find((item) => item.id === selectedChatbotId);
      if (selectedChatbot) {
        setForm(
          isDocenteMode
            ? enforceDocenteFormMode(mapChatbotToForm(selectedChatbot), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
            : mapChatbotToForm(selectedChatbot)
        );
      }
    } else {
      setForm(
        isDocenteMode
          ? enforceDocenteFormMode(emptyForm(), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
          : emptyForm()
      );
    }

    setStatusMessage('Formulario oculto. La edición puede reanudarse desde Crear Nuevo Chatbot o Editar.');
  }

  function updateForm<K extends keyof ChatbotFormState>(key: K, value: ChatbotFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nombre_chatbot.trim()) {
      setStatusMessage('El nombre del chatbot es obligatorio.');
      return;
    }

    if (isDocenteMode && !form.asignatura_id) {
      setStatusMessage('Asignación de asignatura obligatoria para el rol docente.');
      return;
    }

    if (form.tipo === 'MINIPROYECTO' && (!form.asignatura_id || !form.miniproyecto_id)) {
      setStatusMessage('Selección de asignatura y miniproyecto obligatoria para chatbots de miniproyecto.');
      return;
    }

    if (isRoleScopedGeneralType(form.tipo) && (form.asignatura_id || form.miniproyecto_id)) {
      setStatusMessage('Los chatbots generales por rol no deben asociarse a un asignatura ni a un miniproyecto.');
      return;
    }

    setIsSaving(true);
    setStatusMessage('Guardando chatbot...');

    const payload = {
      nombre_chatbot: form.nombre_chatbot,
      descripcion: form.descripcion,
      tipo: form.tipo,
      prompt_base: form.prompt_base,
      estado: form.estado,
      configuracion: {
        asignatura_id: !isDocenteMode && isRoleScopedGeneralType(form.tipo) ? null : (form.asignatura_id ? Number(form.asignatura_id) : null),
        miniproyecto_id: form.tipo === 'MINIPROYECTO' && form.miniproyecto_id ? Number(form.miniproyecto_id) : null,
      },
      parametros_rendimiento: {
        model: form.model,
        topK: Number(form.topK) || 1,
        max_context_chars: Number(form.max_context_chars) || 600,
        max_tokens: Number(form.max_tokens) || 256,
        temperature: 0.1,
      },
    };

    try {
      // La API devuelve BIGINT como string; forzar conversión numérica antes de validar.
      const parsedFormId = Number(form.id);
      const isEditing = Number.isFinite(parsedFormId) && parsedFormId > 0;
      const response = await apiFetch(isEditing ? `/chatbots/${parsedFormId}` : '/chatbots', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, form.asignatura_id ? Number(form.asignatura_id) : (docenteAsignaturaId ?? null));

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo guardar el chatbot.');
      }

      const refreshed = await loadChatbots();
      const selected = refreshed.find((item) => item.id === data.id);
      if (selected) {
        await selectChatbot(selected);
      }

      setIsFormVisible(false);
      setStatusMessage(isEditing ? 'Chatbot actualizado correctamente.' : 'Chatbot creado correctamente.');
      if (!isEditing) {
        window.setTimeout(() => {
          scrollToDocumentSection();
        }, 150);
      }
    } catch (error) {
      console.error('Error saving chatbot:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al guardar el chatbot.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedChatbotId) return;
    if (!window.confirm('¿Seguro que quieres eliminar este chatbot y sus documentos?')) {
      return;
    }

    setIsDeleting(true);
    setStatusMessage('Eliminando chatbot...');
    try {
      const response = await apiFetch(`/chatbots/${selectedChatbotId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo eliminar el chatbot.');
      }

      const refreshed = await loadChatbots();
      if (refreshed.length > 0) {
        await selectChatbot(refreshed[0]);
      } else {
        setSelectedChatbotId(null);
        setForm(emptyForm());
        setDocuments([]);
        setStats(null);
        setSelectedFile(null);
        setMessages([]);
      }
      setIsFormVisible(false);
      setStatusMessage('Chatbot eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting chatbot:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al eliminar el chatbot.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleEstado(chatbot: ChatbotItem, event: React.MouseEvent) {
    event.stopPropagation();
    const newEstado = chatbot.estado === false ? true : false;
    setStatusMessage(newEstado ? 'Habilitando chatbot...' : 'Deshabilitando chatbot...');

    try {
      const payload = buildChatbotPayload(chatbot, { estado: newEstado });
      const response = await apiFetch(`/chatbots/${chatbot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, chatbot.asignatura_id ?? null);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo actualizar el estado.');
      }

      const refreshed = await loadChatbots();
      if (selectedChatbotId === chatbot.id) {
        const updated = refreshed.find((item) => item.id === chatbot.id);
        if (updated) await selectChatbot(updated);
      }
      setStatusMessage(newEstado ? 'Chatbot habilitado correctamente.' : 'Chatbot deshabilitado correctamente.');
    } catch (error) {
      console.error('Error toggling chatbot estado:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al actualizar el estado del chatbot.');
    }
  }

  async function handleUploadDocument() {
    if (!selectedChatbotId) {
      setStatusMessage('Guarda el chatbot antes de subir documentos.');
      return;
    }
    if (!selectedFile) {
      setStatusMessage('Selecciona un PDF antes de subirlo.');
      return;
    }
    if (selectedFile.size > 2500 * 1024) {
      setStatusMessage(`El archivo supera el límite de 2500 KB (${(selectedFile.size / 1024).toFixed(0)} KB). Selecciona un PDF más pequeño.`);
      return;
    }

    setIsUploading(true);
    setStatusMessage('Subiendo documento...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await apiFetch(`/chatbots/${selectedChatbotId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo subir el documento.');
      }

      const refreshed = await loadChatbots();
      const selected = refreshed.find((item) => item.id === selectedChatbotId);
      if (selected) {
        await selectChatbot(selected);
      }
      setSelectedFile(null);
      setPdfSizeError('');
      setStatusMessage('Documento subido y procesado correctamente.');
    } catch (error) {
      console.error('Error uploading document:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al subir el documento.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!selectedChatbotId) return;
    setStatusMessage('Eliminando documento...');
    try {
      const response = await apiFetch(`/chatbots/${selectedChatbotId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo eliminar el documento.');
      }

      const refreshed = await loadChatbots();
      const selected = refreshed.find((item) => item.id === selectedChatbotId);
      if (selected) {
        await selectChatbot(selected);
      }
      setStatusMessage('Documento eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting document:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al eliminar el documento.');
    }
  }

  async function handleReloadDocuments() {
    if (!selectedChatbotId) return;
    setIsReloading(true);
    setStatusMessage('Recargando documentos del chatbot...');
    try {
      const response = await apiFetch(`/chatbots/${selectedChatbotId}/reload`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo recargar el chatbot.');
      }

      const refreshed = await loadChatbots();
      const selected = refreshed.find((item) => item.id === selectedChatbotId);
      if (selected) {
        await selectChatbot(selected);
      }
      setStatusMessage('Documentos recargados correctamente.');
    } catch (error) {
      console.error('Error reloading chatbot:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Error al recargar el chatbot.');
    } finally {
      setIsReloading(false);
    }
  }

  async function handleAskQuestion() {
    if (!selectedChatbotId) {
      setStatusMessage('Selecciona o crea un chatbot antes de probarlo.');
      return;
    }
    if (!inputValue.trim() || isAsking) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { text: userMessage, isBot: false }, { text: '', isBot: true }]);
    setInputValue('');
    setIsAsking(true);

    try {
      const controller = new AbortController();
      let receivedFirstChunk = false;
      const timeoutId = window.setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);

      const response = await apiFetch(`/chatbots/${selectedChatbotId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: userMessage,
          topK: Number(form.topK) || 1,
        }),
      });

      if (!response.ok) {
        window.clearTimeout(timeoutId);
        if (response.status === 504) {
          throw new Error('timeout');
        }
        throw new Error('request_failed');
      }

      if (!response.body) {
        window.clearTimeout(timeoutId);
        throw new Error('Respuesta sin streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          window.clearTimeout(timeoutId);
        }

        accumulatedText += decoder.decode(value, { stream: true });
        setMessages((prev) => replaceLastBotMessage(prev, accumulatedText));
      }

      window.clearTimeout(timeoutId);
      if (!accumulatedText.trim()) {
        setMessages((prev) => replaceLastBotMessage(prev, 'No pude obtener respuesta.'));
      }
    } catch (error) {
      console.error('Error testing chatbot:', error);
      setMessages((prev) => replaceLastBotMessage(
        prev,
        error instanceof Error && error.name === 'AbortError'
          ? 'Timeout: el chatbot tardó más de 2 minutos en responder.'
          : error instanceof Error && error.message === 'timeout'
            ? 'Timeout: el chatbot tardó más de 2 minutos en responder.'
            : 'Error de conexión con el chatbot.'
      ));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="app-shell relative">
      <div className={isFormVisible ? 'pointer-events-none select-none blur-[3px] transition-all duration-200' : 'transition-all duration-200'}>
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Chatbots</h1>
                <p className="text-gray-500 text-sm">{isDocenteMode ? 'Panel de Docente - EduPath' : 'Panel de Administrador - EduPath'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main chatbot-admin-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <section className="chatbot-admin-hero app-panel mb-8 overflow-hidden">
          <div className="chatbot-admin-hero__orb chatbot-admin-hero__orb--blue" />
          <div className="chatbot-admin-hero__orb chatbot-admin-hero__orb--mint" />
          <div className="chatbot-admin-hero__content">
            <div className="chatbot-admin-hero__copy">
              <div className="chatbot-admin-hero__eyebrow">Gestión inteligente</div>
              <h2 className="chatbot-admin-hero__title">Gestión de chatbots</h2>
              <p className="chatbot-admin-hero__description">
                Estado, documentos y prueba de chat bot.
              </p>
            </div>

            <div className="chatbot-admin-hero__side">
              <div className="chatbot-admin-hero-balance-card">
                <div className="chatbot-admin-hero-balance-card__label">Selección actual</div>
                <div className="chatbot-admin-hero-balance-card__title">
                  {selectedChatbotId ? form.nombre_chatbot || `Chatbot #${selectedChatbotId}` : 'Sin chatbot seleccionado'}
                </div>
                <div className="chatbot-admin-hero-balance-card__text">{selectedChatbotScope}</div>

                <div className="chatbot-admin-pill-row chatbot-admin-pill-row--compact">
                  <span className={`chatbot-admin-pill ${getChatbotTypePillClass(form.tipo)}`}>
                    {getChatbotTypeLabel(form.tipo, isDocenteMode ? 'docente' : 'admin')}
                  </span>
                  <span className={`chatbot-admin-pill ${selectedChatbotId && selectedChatbotIsActive ? 'chatbot-admin-pill--green' : 'chatbot-admin-pill--slate'}`}>
                    {selectedChatbotId ? (selectedChatbotIsActive ? 'Activo' : 'Inactivo') : 'Borrador'}
                  </span>
                </div>

                <div className="chatbot-admin-hero__actions chatbot-admin-hero__actions--stacked">
                  {selectedChatbotId ? (
                    <button onClick={handleEditSelected} className="app-btn app-btn-secondary px-4 py-3">
                      Editar chatbot
                    </button>
                  ) : null}
                  <button onClick={handleCreateNew} className="app-btn app-btn-success px-4 py-3">
                    <Plus className="w-4 h-4" />
                    {selectedChatbotId ? 'Nuevo chatbot' : 'Crear chatbot'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="chatbot-admin-stats mb-8">
          <article className="chatbot-admin-stat-card chatbot-admin-stat-card--blue">
            <div className="chatbot-admin-stat-card__icon">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="chatbot-admin-stat-card__value">{totalChatbots}</div>
              <div className="chatbot-admin-stat-card__label">Total</div>
            </div>
          </article>

          <article className="chatbot-admin-stat-card chatbot-admin-stat-card--green">
            <div className="chatbot-admin-stat-card__icon">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="chatbot-admin-stat-card__value">{activeChatbots}</div>
              <div className="chatbot-admin-stat-card__label">Activos</div>
            </div>
          </article>

          <article className="chatbot-admin-stat-card chatbot-admin-stat-card--mint">
            <div className="chatbot-admin-stat-card__icon">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="chatbot-admin-stat-card__value">{generalChatbots}</div>
              <div className="chatbot-admin-stat-card__label">{isDocenteMode ? 'Generales de asignatura' : 'Generales'}</div>
            </div>
          </article>

          <article className="chatbot-admin-stat-card chatbot-admin-stat-card--amber">
            <div className="chatbot-admin-stat-card__icon">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="chatbot-admin-stat-card__value">{miniproyectoChatbots}</div>
              <div className="chatbot-admin-stat-card__label">Miniproyecto</div>
            </div>
          </article>
        </section>

        <div className="chatbot-admin-workspace">
          <section className="chatbot-admin-primary-column space-y-6">
            <section className="app-panel overflow-hidden">
              <div className="chatbot-admin-panel-head">
                <div>
                  <div className="chatbot-admin-section-kicker">Catálogo</div>
                  <h3 className="chatbot-admin-section-title">Biblioteca de chatbots</h3>
                  <p className="chatbot-admin-section-description">Filtra y selecciona rápido.</p>
                </div>
                <div className="chatbot-admin-count-badge">{visibleChatbots.length}</div>
              </div>

              <div className="chatbot-admin-toolbar">
                <div className="space-y-3">
                  <div className="app-filter-row">
                    <button onClick={() => setTypeFilter('all')} className={`app-filter-chip ${typeFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>
                      <Bot className="w-4 h-4" />
                      Todos
                    </button>
                    <button onClick={() => setTypeFilter('GENERAL')} className={`app-filter-chip ${typeFilter === 'GENERAL' ? 'app-filter-chip--green' : ''}`}>
                      <MessageCircle className="w-4 h-4" />
                      {isDocenteMode ? 'General de asignatura' : 'Generales'}
                    </button>
                    {!isDocenteMode ? (
                      <button onClick={() => setTypeFilter('GENERAL_ADMINISTRADOR')} className={`app-filter-chip ${typeFilter === 'GENERAL_ADMINISTRADOR' ? 'app-filter-chip--blue' : ''}`}>
                        <Bot className="w-4 h-4" />
                        Admin
                      </button>
                    ) : null}
                    {!isDocenteMode ? (
                      <button onClick={() => setTypeFilter('GENERAL_DOCENTE')} className={`app-filter-chip ${typeFilter === 'GENERAL_DOCENTE' ? 'app-filter-chip--green' : ''}`}>
                        <Bot className="w-4 h-4" />
                        Docente
                      </button>
                    ) : null}
                    <button onClick={() => setTypeFilter('MINIPROYECTO')} className={`app-filter-chip ${typeFilter === 'MINIPROYECTO' ? 'app-filter-chip--amber' : ''}`}>
                      <FileText className="w-4 h-4" />
                      Miniproyecto
                    </button>
                  </div>

                  <div className="app-filter-row">
                    <button onClick={() => setStateFilter('all')} className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>
                      Todos
                    </button>
                    <button onClick={() => setStateFilter('active')} className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}>
                      Activos ({activeChatbots})
                    </button>
                    <button onClick={() => setStateFilter('inactive')} className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}>
                      Inactivos ({inactiveChatbots})
                    </button>
                  </div>
                </div>

                <label className="chatbot-admin-search">
                  <Search className="chatbot-admin-search__icon" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, tipo o modelo"
                    className="chatbot-admin-search__input"
                  />
                </label>
              </div>

              {isLoading ? (
                <div className="chatbot-admin-empty-state">
                  <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
                  <p>Cargando chatbots...</p>
                </div>
              ) : visibleChatbots.length === 0 ? (
                <div className="chatbot-admin-empty-state">
                  <Bot className="w-10 h-10 text-slate-300" />
                  <p>No hay chatbots que coincidan con los filtros activos.</p>
                </div>
              ) : (
                <div className="chatbot-admin-library">
                  {visibleChatbots.map((chatbot) => {
                    const isSelected = chatbot.id === selectedChatbotId;
                    const chatbotIsActive = chatbot.estado !== false;
                    const documentCount = chatbot.documentos?.length ?? 0;

                    return (
                      <div
                        key={chatbot.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => void selectChatbot(chatbot)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') void selectChatbot(chatbot); }}
                        className={`chatbot-admin-library-card ${isSelected ? 'chatbot-admin-library-card--selected' : ''} ${!chatbotIsActive ? 'chatbot-admin-library-card--inactive' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`chatbot-admin-library-card__icon ${getChatbotLibraryIconClass(chatbot.tipo)}`}>
                              <Bot className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="chatbot-admin-library-card__title">{chatbot.nombre}</div>
                              <div className="chatbot-admin-library-card__subtitle">{chatbot.model_name || 'Modelo por defecto'}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <span className={`chatbot-admin-badge ${getChatbotTypeBadgeClass(chatbot.tipo)}`}>
                              {getChatbotTypeLabel(chatbot.tipo, isDocenteMode ? 'docente' : 'admin')}
                            </span>
                            <span className="chatbot-admin-badge chatbot-admin-badge--slate">
                              {getChatbotUsageContextLabel(chatbot.tipo, isDocenteMode ? 'docente' : 'admin')}
                            </span>
                            <span className={`chatbot-admin-badge ${chatbotIsActive ? 'chatbot-admin-badge--green' : 'chatbot-admin-badge--slate'}`}>
                              {chatbotIsActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>

                        <p className="chatbot-admin-library-card__description text-left">
                          {chatbot.descripcion?.trim() || 'Sin descripción.'}
                        </p>

                        <p className="chatbot-admin-library-card__subtitle text-left mt-2">
                          {getChatbotVisibilityHint(chatbot.tipo, isDocenteMode ? 'docente' : 'admin')}
                        </p>

                        <div className="chatbot-admin-library-card__meta">
                          <div>
                            <span className="chatbot-admin-library-card__meta-label">Documentos</span>
                            <span className="chatbot-admin-library-card__meta-value">{documentCount}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => void handleToggleEstado(chatbot, e)}
                            title={chatbotIsActive ? 'Deshabilitar chatbot' : 'Habilitar chatbot'}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              chatbotIsActive
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {chatbotIsActive
                              ? <><ToggleRight className="w-4 h-4" /><span>Deshabilitar</span></>
                              : <><ToggleLeft className="w-4 h-4" /><span>Habilitar</span></>
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="chatbot-admin-secondary-grid">
              <section ref={documentSectionRef} className="app-panel p-6 chatbot-admin-lower-panel">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="chatbot-admin-tone-icon chatbot-admin-tone-icon--green">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="chatbot-admin-section-title">Base documental</h3>
                      <p className="chatbot-admin-section-description">PDFs asociados.</p>
                    </div>
                  </div>
                  <button onClick={() => void handleReloadDocuments()} disabled={!selectedChatbotId || isReloading} className="app-btn app-btn-secondary px-4 py-3 text-slate-700 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                    Recargar
                  </button>
                </div>

                <input
                  ref={uploadInputRef}
                  id="chatbot-pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (file && file.size > 2500 * 1024) {
                      setPdfSizeError(`El archivo "${file.name}" pesa ${(file.size / 1024).toFixed(0)} KB y supera el límite de 2500 KB. Selecciona un PDF más pequeño.`);
                      event.target.value = '';
                      setSelectedFile(null);
                      return;
                    }
                    setPdfSizeError('');
                    setSelectedFile(file);
                  }}
                  className="hidden"
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{ display: 'none' }}
                />

                <div className="app-form-stack">
                  <div className="chatbot-admin-overview-card">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
                      <div className="min-w-0">
                        <div className="app-form-summary-label">Destino documental</div>
                        <div className="app-form-summary-value">{selectedChatbotId ? (form.nombre_chatbot || `#${selectedChatbotId}`) : 'Guarda o selecciona un chatbot'}</div>
                        <div className="app-form-summary-help">{selectedChatbotId ? 'Se cargará aquí.' : 'Guárdalo antes de cargar.'}</div>
                      </div>
                      <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedChatbotId ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedChatbotId ? 'Listo para cargar' : 'Pendiente de guardar'}
                      </div>
                    </div>
                  </div>

                  <div className="chatbot-admin-upload-band">
                    <div className="chatbot-admin-upload-band__summary">
                      <div>
                        <div className="app-form-summary-label">Archivo seleccionado <span className="text-slate-400 font-normal">(máx. 2500 KB)</span></div>
                        <div className="chatbot-admin-upload-band__filename">
                          {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(0)} KB` : 'Ningún PDF seleccionado'}
                        </div>
                      </div>
                      <div className="chatbot-admin-upload-band__status">{selectedFile ? 'Listo para confirmar' : 'Sin selección'}</div>
                    </div>

                    {pdfSizeError && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span className="mt-0.5 shrink-0">⚠️</span>
                        <span>{pdfSizeError}</span>
                      </div>
                    )}

                    <div className="chatbot-admin-upload-band__actions">
                      <button onClick={openPdfPicker} className="app-btn app-primary-btn h-14 justify-center text-sm font-semibold">
                        Seleccionar PDF
                      </button>
                      <button onClick={() => void handleUploadDocument()} disabled={!canConfirmPdf} className="app-btn app-btn-success h-14 justify-center text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        {isUploading ? 'Cargando...' : 'Cargar PDF'}
                      </button>
                      <button onClick={() => { setSelectedFile(null); setPdfSizeError(''); }} disabled={!canCancelPdf} className="app-btn chatbot-admin-upload-band__cancel h-14 justify-center text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        Cancelar PDF
                      </button>
                    </div>

                    <div className="chatbot-admin-document-list space-y-3 max-h-72 overflow-y-auto pr-1">
                      {documents.length === 0 ? (
                        <div className="chatbot-admin-empty-inline">No hay documentos asociados todavía.</div>
                      ) : (
                        documents.map((document) => (
                          <div key={document.id} className="chatbot-admin-document-item">
                            <div className="min-w-0">
                              <p className="chatbot-admin-document-item__title">{document.nombre_original || document.nombre_archivo}</p>
                              <p className="chatbot-admin-document-item__meta">{formatBytes(document.tamano_bytes)}</p>
                            </div>
                            <button onClick={() => void handleDeleteDocument(document.id)} className="app-btn-icon inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-red-50" title="Eliminar documento">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="app-panel p-6 chatbot-admin-lower-panel">
                <div className="flex items-start gap-3 mb-5">
                  <div className="chatbot-admin-tone-icon chatbot-admin-tone-icon--blue">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="chatbot-admin-section-title">Rendimiento y estado</h3>
                    <p className="chatbot-admin-section-description">Estado técnico del chatbot.</p>
                  </div>
                </div>

                <div className="app-form-stack">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="chatbot-admin-overview-card">
                      <div className="app-form-summary-label">Proveedor</div>
                      <div className="app-form-summary-value">{statsProvider}</div>
                    </div>
                    <div className="chatbot-admin-overview-card">
                      <div className="app-form-summary-label">Modelo</div>
                      <div className="app-form-summary-value">{statsModel}</div>
                    </div>
                    <div className="chatbot-admin-overview-card">
                      <div className="app-form-summary-label">Documentos</div>
                      <div className="app-form-summary-value">{statsDocuments}</div>
                    </div>
                    <div className="chatbot-admin-overview-card">
                      <div className="app-form-summary-label">Chunks</div>
                      <div className="app-form-summary-value">{statsChunks}</div>
                    </div>
                  </div>

                  <div className="app-form-note chatbot-admin-note-card">
                    <div className="app-form-summary-label">Estado del índice</div>
                    <div className="text-sm text-slate-600 mt-2">{statsMessage}</div>
                  </div>
                </div>

                <div className="app-form-note chatbot-admin-note-card chatbot-admin-note-card--spaced">
                  <div className="app-form-summary-label">Sugerencia base</div>
                  <div className="text-sm text-slate-600 mt-2">TopK 1 y contexto corto suelen funcionar mejor.</div>
                </div>
              </section>
            </div>
          </section>

          <aside className="chatbot-admin-sidebar">
            <div className="chatbot-admin-sidebar__stack">
              {statusMessage ? (
                <div className="chatbot-admin-status-banner">
                  {statusMessage}
                </div>
              ) : null}

              <section className="app-panel p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                  <div>
                    <div className="chatbot-admin-section-kicker">Vista rápida</div>
                    <h3 className="chatbot-admin-section-title">Resumen del chatbot</h3>
                    <p className="chatbot-admin-section-description">Contexto y estado.</p>
                  </div>
                  {!isFormVisible && selectedChatbotId ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={handleEditSelected} className="app-btn app-btn-secondary px-4 py-3">
                        Editar chatbot
                      </button>
                      <button
                        onClick={(e) => { if (selectedChatbot) void handleToggleEstado(selectedChatbot, e); }}
                        className={`app-btn inline-flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                          selectedChatbotIsActive
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {selectedChatbotIsActive
                          ? <><ToggleRight className="w-4 h-4" /><span>Deshabilitar</span></>
                          : <><ToggleLeft className="w-4 h-4" /><span>Habilitar</span></>
                        }
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="chatbot-admin-sidebar-summary">
                  <div className="chatbot-admin-overview-card chatbot-admin-overview-card--primary">
                    <div className="chatbot-admin-overview-card__label">Asistente activo en foco</div>
                    <div className="chatbot-admin-overview-card__title">
                      {selectedChatbotId ? form.nombre_chatbot || `Chatbot #${selectedChatbotId}` : 'Selecciona o crea un chatbot'}
                    </div>
                    <p className="chatbot-admin-overview-card__text">{selectedChatbotDescription}</p>
                    <div className="chatbot-admin-pill-row">
                      <span className={`chatbot-admin-pill ${getChatbotTypePillClass(form.tipo)}`}>
                        {getChatbotTypeLabel(form.tipo, isDocenteMode ? 'docente' : 'admin')}
                      </span>
                      <span className="chatbot-admin-pill chatbot-admin-pill--slate">
                        {getChatbotUsageContextLabel(form.tipo, isDocenteMode ? 'docente' : 'admin')}
                      </span>
                      <span className={`chatbot-admin-pill ${selectedChatbotId && selectedChatbotIsActive ? 'chatbot-admin-pill--green' : 'chatbot-admin-pill--slate'}`}>
                        {selectedChatbotId ? (selectedChatbotIsActive ? 'Disponible' : 'Inactivo') : 'Aun sin guardar'}
                      </span>
                    </div>
                  </div>

                  <div className="chatbot-admin-overview-stack">
                    <div className="chatbot-admin-overview-card">
                      <div className="chatbot-admin-overview-card__label">Asignación académica</div>
                      <div className="chatbot-admin-overview-card__text">{selectedChatbotScope}</div>
                    </div>
                    <div className="chatbot-admin-overview-card">
                      <div className="chatbot-admin-overview-card__label">Estado de preparación</div>
                      <div className="chatbot-admin-overview-card__text">{selectedChatbotReadiness}</div>
                    </div>
                    <p className="chatbot-admin-overview-card__text">{getChatbotVisibilityHint(form.tipo, isDocenteMode ? 'docente' : 'admin')}</p>
                  </div>
                </div>
              </section>

              <section className="app-panel overflow-hidden chatbot-admin-chat-panel">
                <div className="chatbot-admin-chat-head chatbot-admin-chat-head--plain">
                  <div className="flex items-center gap-3">
                    <div className="chatbot-admin-tone-icon chatbot-admin-tone-icon--blue">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="chatbot-admin-section-title">Probador</h3>
                      <p className="chatbot-admin-section-description">Prueba rápida.</p>
                    </div>
                  </div>
                  <div className="chatbot-admin-chat-pill chatbot-admin-chat-pill--plain">
                    {selectedChatbotId ? 'Listo para probar' : 'Selecciona un chatbot'}
                  </div>
                </div>

                <div className="p-6">
                  <div className="chatbot-admin-chat-shell">
                    <div className={`chatbot-admin-chat-messages ${messages.length === 0 ? 'chatbot-admin-chat-messages--empty' : ''}`}>
                      {messages.length === 0 ? (
                        <div className="chatbot-admin-empty-state chatbot-admin-empty-state--compact">
                          <Bot className="w-12 h-12 text-slate-300" />
                          <p>Seleccione un chatbot y registre una consulta de prueba.</p>
                        </div>
                      ) : (
                        messages.map((message, index) => (
                          <div key={index} className="chatbot-admin-transcript-row">
                            <div className="chatbot-admin-transcript-row__meta">
                              <span className={`chatbot-admin-transcript-row__tag ${message.isBot ? 'chatbot-admin-transcript-row__tag--bot' : 'chatbot-admin-transcript-row__tag--user'}`}>
                                {message.isBot ? 'Chatbot' : 'Usuario'}
                              </span>
                            </div>
                            <div className={`chatbot-admin-message ${message.isBot ? 'chatbot-admin-message--bot' : 'chatbot-admin-message--user'}`}>
                              {message.isBot ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessForMarkdown(String(message.text || ''))}</ReactMarkdown>
                              ) : (
                                message.text || (message.isBot && isAsking ? 'Procesando respuesta...' : '')
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="chatbot-admin-chat-input-row">
                      <input
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleAskQuestion();
                          }
                        }}
                        disabled={isAsking || !selectedChatbotId}
                        placeholder={selectedChatbotId ? 'Registrar consulta de prueba...' : 'Se requiere crear o seleccionar un chatbot'}
                        className="chatbot-admin-chat-input"
                      />
                      <button onClick={() => void handleAskQuestion()} disabled={isAsking || !selectedChatbotId || !inputValue.trim()} className="app-btn app-primary-btn px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send className="w-4 h-4" />
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>
      </div>

      {isFormVisible ? (
        <div className="app-modal-overlay app-modal-overlay--top z-50">
          <div
            className="app-modal-card app-modal-card--xl"
            style={{ height: 'min(860px, calc(100vh - 2rem))' }}
          >
            <div className="app-modal-header border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="app-modal-kicker">Chatbot</div>
                  <h2 className="app-modal-title">{selectedChatbotId ? 'Editar chatbot' : 'Crear nuevo chatbot'}</h2>
                  <p className="app-modal-description">
                    Configuración del comportamiento del asistente, vinculación al contexto académico y preparación de la base documental.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="app-modal-meta hidden sm:block">
                    <div className="app-modal-meta-label">Estado</div>
                    <div className="app-modal-meta-value">{selectedChatbotId ? 'Edición activa' : 'Nuevo chatbot'}</div>
                  </div>
                  <button onClick={handleCloseForm} className="app-modal-close">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
                <div className="app-form-main app-form-stack">
                  {!selectedChatbotId && (
                    <div className="app-form-note">
                      El chatbot debe registrarse antes de cargar la base documental.
                    </div>
                  )}

                  {isDocenteMode ? (
                    <div className="app-form-note">
                      En modo docente, puedes gestionar el chatbot general de tu asignatura y los chatbots de miniproyecto asociados.
                    </div>
                  ) : null}

                  <section className="app-form-section app-form-section--muted">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Información base</h4>
                      <p className="app-form-section-description">Definición del nombre, propósito y tipo de chatbot publicado.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Nombre</label>
                        <input value={form.nombre_chatbot} onChange={(event) => updateForm('nombre_chatbot', event.target.value)} className="app-form-input" placeholder="Tutor de Inventarios v1" />
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Tipo</label>
                        <select
                          value={form.tipo}
                          onChange={(event) => updateForm('tipo', event.target.value as ChatbotFormState['tipo'])}
                          className="app-form-select disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          {isDocenteMode ? (
                            <>
                              <option value="GENERAL">General de asignatura</option>
                              <option value="MINIPROYECTO">Miniproyecto</option>
                            </>
                          ) : (
                            <>
                              <option value="GENERAL">General</option>
                              <option value="GENERAL_ADMINISTRADOR">General administrador</option>
                              <option value="GENERAL_DOCENTE">General docente</option>
                              <option value="MINIPROYECTO">Miniproyecto</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Modelo</label>
                        <select value={form.model} onChange={(event) => updateForm('model', event.target.value)} className="app-form-select">
                          {MODEL_OPTIONS.map((modelOption) => (
                            <option key={modelOption} value={modelOption}>{modelOption}</option>
                          ))}
                        </select>
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600">
                          <p><strong>Qwen 2.5 0.5b:</strong> más ligero y estable para el servidor.</p>
                          <p><strong>Llama 3.2 1b:</strong> suele responder más rápido, pero consume más memoria.</p>
                          <p><strong>Llama 3.2:</strong> ofrece respuestas más completas, con mayor costo general.</p>
                        </div>
                      </div>

                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Descripción</label>
                        <textarea value={form.descripcion} onChange={(event) => updateForm('descripcion', event.target.value)} rows={3} className="app-form-textarea" placeholder="Describe el propósito del chatbot." />
                      </div>

                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Prompt base</label>
                        <textarea value={form.prompt_base} onChange={(event) => updateForm('prompt_base', event.target.value)} rows={4} className="app-form-textarea" placeholder="Instrucciones base opcionales para el chatbot." />
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Vinculación académica</h4>
                      <p className="app-form-section-description">Asociación del chatbot al asignatura correspondiente y, cuando aplique, al miniproyecto específico.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label">Asignatura</label>
                        <select
                          value={form.asignatura_id}
                          onChange={(event) => updateForm('asignatura_id', event.target.value)}
                          disabled={isDocenteMode || isRoleScopedGeneralType(form.tipo)}
                          className="app-form-select disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="">
                            {isDocenteMode
                              ? 'Asignatura asignada'
                              : isRoleScopedGeneralType(form.tipo)
                                ? 'No aplica para este tipo'
                                : form.tipo === 'GENERAL'
                                ? 'Sin asignatura (global)'
                                : 'Asignatura requerida'}
                          </option>
                          {AsignaturaOptions.map((Asignatura) => (
                            <option key={Asignatura.id} value={Asignatura.id}>{Asignatura.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Miniproyecto</label>
                        <select
                          value={form.miniproyecto_id}
                          onChange={(event) => updateForm('miniproyecto_id', event.target.value)}
                          disabled={form.tipo !== 'MINIPROYECTO' || !form.asignatura_id}
                          className="app-form-select disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="">
                            {form.tipo !== 'MINIPROYECTO'
                              ? 'No aplica para este tipo'
                              : !form.asignatura_id
                                ? 'Selección de asignatura requerida'
                                : miniproyectoOptions.length === 0
                                  ? 'No hay miniproyectos disponibles para esta asignatura'
                                  : 'Seleccione un miniproyecto'}
                          </option>
                          {miniproyectoOptions.map((item) => (
                            <option key={item.id} value={item.id}>{getMiniproyectoLabel(item)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="app-form-field md:col-span-2">
                        <label className="inline-flex items-center gap-3 mt-2">
                          <input type="checkbox" checked={form.estado} onChange={(event) => updateForm('estado', event.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2]" />
                          <span className="text-sm text-gray-700">Chatbot activo</span>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Parámetros de generación</h4>
                      <p className="app-form-section-description">Ajusta la recuperación y la respuesta del modelo para equilibrar precisión, costo y velocidad.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">
                          Temperatura
                          <InfoBadge text="Controla la creatividad o aleatoriedad de la respuesta." />
                        </label>
                        <select value="0.1" disabled className="app-form-select disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="0.1">0.1 – Determinista (Recomendado)</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          Ideal para ceñirse estrictamente a los documentos sin inventar.
                        </p>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">
                          Fragmentos RAG (Top-K)
                          <InfoBadge text="Cuántos fragmentos del PDF recupera el sistema para construir el contexto antes de responder." />
                        </label>
                        <select value={form.topK} onChange={(e) => updateForm('topK', e.target.value)} className="app-form-select">
                          <option value="3">3 – Mínimo (más rápido)</option>
                          <option value="5">5 – Estándar (Recomendado)</option>
                          <option value="10">10 – Amplio</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          {form.topK === '3' && 'Toma solo los 3 fragmentos más relevantes del PDF. Respuestas más rápidas pero con menos contexto.'}
                          {form.topK === '5' && 'Buen balance: suficiente contexto del documento sin sobrecargar el modelo.'}
                          {form.topK === '10' && 'Recupera más contexto del PDF. Útil para documentos técnicos con mucha información relacionada.'}
                        </p>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">
                          Máx. Tokens
                          <InfoBadge text="Longitud máxima de la respuesta generada por la IA." />
                        </label>
                        <select value={form.max_tokens} onChange={(e) => updateForm('max_tokens', e.target.value)} className="app-form-select">
                          <option value="256">256 – Corto</option>
                          <option value="512">512 – Medio (Recomendado)</option>
                          <option value="1024">1024 – Largo</option>
                          <option value="2048">2048 – Muy largo</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          {form.max_tokens === '256' && 'Ideal para respuestas rápidas o definiciones breves.'}
                          {form.max_tokens === '512' && 'Buen balance entre detalle y velocidad de respuesta.'}
                          {form.max_tokens === '1024' && 'Para resúmenes extensos o explicaciones detalladas de procesos.'}
                          {form.max_tokens === '2048' && 'Útil para generación de código o artículos completos.'}
                        </p>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">
                          Máx. Chars de Contexto
                          <InfoBadge text="Límite de texto del PDF que el sistema RAG le pasa a la IA antes de responder." />
                        </label>
                        <select value={form.max_context_chars} onChange={(e) => updateForm('max_context_chars', e.target.value)} className="app-form-select">
                          <option value="1000">1000 – Enfocado</option>
                          <option value="4000">4000 – Estándar (Recomendado)</option>
                          <option value="8000">8000 – Amplio</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          {form.max_context_chars === '1000' && 'Solo el párrafo más relevante del documento.'}
                          {form.max_context_chars === '4000' && 'Aprox. 2-3 páginas de texto. Suficiente para entender el tema.'}
                          {form.max_context_chars === '8000' && 'Para documentos con mucha información técnica relacionada. Consume más memoria.'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <aside className="app-form-aside app-form-stack md:self-start">
                  <section className="app-form-section app-form-section--accent">
                    <h4 className="app-form-section-title">Resumen del chatbot</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Nombre</div>
                        <div className="app-form-summary-value">{form.nombre_chatbot.trim() || 'Sin nombre definido'}</div>
                        <div className="app-form-summary-help">{isGeneralType(form.tipo) ? (isDocenteMode ? 'Chatbot general del asignatura' : 'Chatbot transversal') : 'Chatbot de miniproyecto'}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Asignatura</div>
                          <div className="app-form-summary-value">{isRoleScopedGeneralType(form.tipo) ? 'No aplica' : selectedAsignatura?.nombre || 'Pendiente'}</div>
                        </div>
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Miniproyecto</div>
                          <div className="app-form-summary-value">{form.tipo === 'MINIPROYECTO' ? (selectedMiniproyecto ? getMiniproyectoLabel(selectedMiniproyecto) : 'Pendiente') : 'No aplica'}</div>
                        </div>
                      </div>
                      <div className="app-form-note">
                        <div className="app-form-summary-label">Estado del formulario</div>
                        <div className="app-form-summary-value">{selectedChatbotId ? 'Editando configuración existente' : 'Preparando nuevo chatbot'}</div>
                        <div className="app-form-summary-help">Avance del formulario: {formCompletion}/{isGeneralType(form.tipo) ? (isDocenteMode ? 6 : 5) : 6} campos clave completos.</div>
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <h4 className="app-form-section-title">Antes de guardar</h4>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      <p>Validación del modelo configurado en el proveedor correspondiente.</p>
                      {isDocenteMode ? <p>El chatbot general del dashboard estudiantil global sigue siendo exclusivo del administrador.</p> : null}
                      <p>Para chatbots de miniproyecto, asignatura y miniproyecto deben corresponder al contexto configurado.</p>
                      <p>Después del guardado, corresponde cargar la base documental y ejecutar una prueba breve.</p>
                    </div>
                  </section>

                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedChatbotId ? (
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="app-btn px-4 py-3 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>

            <div className="app-form-footer">
              <button
                type="button"
                onClick={handleCloseForm}
                disabled={isSaving}
                className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="app-btn app-btn-success rounded-xl px-6 py-3 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>{selectedChatbotId ? 'Guardando...' : 'Creando...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{selectedChatbotId ? 'Guardar cambios' : 'Crear chatbot'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
