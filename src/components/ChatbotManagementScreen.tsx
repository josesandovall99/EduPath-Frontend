import { AppLogo } from './AppLogo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
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

/** En la biblioteca del administrador: solo bots de alcance global/plataforma (no por asignatura ni miniproyecto). */
function isAdminBibliotecaChatbot(chatbot: ChatbotItem): boolean {
  if (chatbot.tipo === 'MINIPROYECTO') return false;
  if (chatbot.tipo === 'GENERAL_ADMINISTRADOR' || chatbot.tipo === 'GENERAL_DOCENTE') return true;
  if (chatbot.tipo === 'GENERAL') return chatbot.asignatura_id == null;
  return false;
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
  const [catalogExpandedChatbotId, setCatalogExpandedChatbotId] = useState<number | null>(null);
  const [form, setForm] = useState<ChatbotFormState>(emptyForm());
  const [documents, setDocuments] = useState<ChatbotDocumentItem[]>([]);
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
  const [isDownloadingPdfs, setIsDownloadingPdfs] = useState(false);
  const [detailTab, setDetailTab] = useState<'config' | 'documentos' | 'probar'>('config');

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
    if (!isDocenteMode && typeFilter === 'MINIPROYECTO') {
      setTypeFilter('all');
    }
  }, [isDocenteMode, typeFilter]);

  useEffect(() => {
    if (!isDocenteMode && form.tipo === 'MINIPROYECTO') {
      setForm((prev) => ({ ...prev, tipo: 'GENERAL', miniproyecto_id: '' }));
    }
  }, [isDocenteMode, form.tipo]);

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

  const resetCatalogSelection = useCallback(() => {
    setCatalogExpandedChatbotId(null);
    setSelectedChatbotId(null);
    setDocuments([]);
    setMessages([]);
    setSelectedFile(null);
    setForm(
      isDocenteMode
        ? enforceDocenteFormMode(emptyForm(), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
        : { ...emptyForm(), asignatura_id: '' },
    );
  }, [AsignaturaOptions, docenteAsignaturaId, isDocenteMode]);

  useEffect(() => {
    if (!isDocenteMode || form.asignatura_id || AsignaturaOptions.length !== 1) {
      return;
    }

    setForm((prev) => ({ ...prev, asignatura_id: String(AsignaturaOptions[0].id) }));
  }, [AsignaturaOptions, form.asignatura_id, isDocenteMode]);

  useEffect(() => {
    if (isFormVisible) return;
    if (catalogExpandedChatbotId == null && selectedChatbotId == null) return;
    const visibleIds = new Set(visibleChatbots.map((c) => c.id));
    if (
      (catalogExpandedChatbotId != null && !visibleIds.has(catalogExpandedChatbotId)) ||
      (selectedChatbotId != null && !visibleIds.has(selectedChatbotId))
    ) {
      resetCatalogSelection();
    }
  }, [
    catalogExpandedChatbotId,
    isFormVisible,
    resetCatalogSelection,
    selectedChatbotId,
    visibleChatbots,
  ]);

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

  function resolveAsignaturaIdForDocumentsApi(): number | null | undefined {
    const fromBot = selectedChatbot?.asignatura_id ?? null;
    if (Number.isFinite(Number(fromBot))) return Number(fromBot);
    if (form.asignatura_id) return Number(form.asignatura_id);
    if (Number.isFinite(Number(docenteAsignaturaId))) return Number(docenteAsignaturaId);
    return undefined;
  }

  function resolveAsignaturaForCatalogChatbot(ancho: ChatbotItem): number | null | undefined {
    const aid = ancho.asignatura_id ?? null;
    if (Number.isFinite(Number(aid))) return Number(aid);
    if (Number.isFinite(Number(docenteAsignaturaId))) return Number(docenteAsignaturaId);
    return undefined;
  }

  async function downloadChatbotPdfDocument(
    chatbotId: number,
    doc: ChatbotDocumentItem,
    asignaturaOverride?: number | null,
  ) {
    const response = await apiFetch(
      `/chatbots/${chatbotId}/documents/${doc.id}/download`,
      { method: 'GET' },
      asignaturaOverride ?? undefined,
    );
    if (!response.ok) {
      let msg = 'No se pudo descargar el PDF';
      try {
        const body = await response.json();
        if (body?.mensaje) msg = body.mensaje;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
    const blob = await response.blob();
    const fn = doc.nombre_original || doc.nombre_archivo || `documento_${doc.id}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

      const rawChatbots = Array.isArray(chatbotsData) ? chatbotsData : [];
      const nextChatbots = mode === 'admin' ? rawChatbots.filter(isAdminBibliotecaChatbot) : rawChatbots;
      setChatbots(nextChatbots);
      const listaAsign = Array.isArray(asignaturasData) ? asignaturasData : [];
      const firstAsignaturaId = listaAsign[0]?.id != null ? Number(listaAsign[0].id) : NaN;
      setAsignaturas(listaAsign);
      setMiniproyectos(Array.isArray(miniproyectosData) ? miniproyectosData : []);

      if (nextChatbots.length === 0) {
        handleCreateNew();
      } else {
        setCatalogExpandedChatbotId(null);
        setSelectedChatbotId(null);
        setDocuments([]);
        setMessages([]);
        setSelectedFile(null);
        setIsFormVisible(false);
        setForm(
          isDocenteMode
            ? enforceDocenteFormMode(emptyForm(), docenteAsignaturaId, Number.isFinite(firstAsignaturaId) ? firstAsignaturaId : undefined)
            : { ...emptyForm(), asignatura_id: '' },
        );
      }
    } catch (error) {
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
    const raw = Array.isArray(data) ? data : [];
    const nextChatbots = mode === 'admin' ? raw.filter(isAdminBibliotecaChatbot) : raw;
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
      const documentsResponse = await apiFetch(`/chatbots/${chatbot.id}/documents`);

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        const arr = Array.isArray(documentsData) ? documentsData : [];
        setDocuments(arr);
        setChatbots((prev) => prev.map((c) => (c.id === chatbot.id ? { ...c, documentos: arr } : c)));
      }
    } catch (error) {
    }
  }

  async function toggleCatalogDetail(chatbot: ChatbotItem) {
    if (catalogExpandedChatbotId === chatbot.id) {
      resetCatalogSelection();
      return;
    }
    setCatalogExpandedChatbotId(chatbot.id);
    await selectChatbot(chatbot);
  }

  function handleCreateNew() {
    setCatalogExpandedChatbotId(null);
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
    setCatalogExpandedChatbotId(selectedChatbot.id);
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
        const savedId = Number(selected.id ?? data.id);
        if (Number.isFinite(savedId)) setCatalogExpandedChatbotId(savedId);
      }

      setIsFormVisible(false);
      setStatusMessage(isEditing ? 'Chatbot actualizado correctamente.' : 'Chatbot creado correctamente.');
      if (!isEditing) {
        window.setTimeout(() => {
          scrollToDocumentSection();
        }, 150);
      }
    } catch (error) {
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
      setCatalogExpandedChatbotId(null);
      setSelectedChatbotId(null);
      setDocuments([]);
      setSelectedFile(null);
      setMessages([]);
      setForm(
        isDocenteMode
          ? enforceDocenteFormMode(emptyForm(), docenteAsignaturaId, Number(AsignaturaOptions[0]?.id))
          : { ...emptyForm(), asignatura_id: '' },
      );
      setIsFormVisible(false);
      setStatusMessage('Chatbot eliminado correctamente.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Error al eliminar el chatbot.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSetChatbotEstado(chatbot: ChatbotItem, newEstado: boolean, event: React.MouseEvent) {
    event.stopPropagation();
    if ((chatbot.estado !== false) === newEstado) return;
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
      setStatusMessage(error instanceof Error ? error.message : 'Error al actualizar el estado del chatbot.');
    }
  }

  function handleOpenEditFromList(chatbot: ChatbotItem, event: React.MouseEvent) {
    event.stopPropagation();
    void (async () => {
      setCatalogExpandedChatbotId(chatbot.id);
      await selectChatbot(chatbot);
      setIsFormVisible(true);
      setStatusMessage(`Editando «${chatbot.nombre}».`);
    })();
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
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onBack} className="app-brand-icon" title="Volver">
                <AppLogo size={48} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>
                  Gestión de Chatbots
                </p>
                <h1 className="leading-tight">Chatbots</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* ═══════════════════════════════════════════════════
            VISTA 1 — Lista de chatbots en tarjetas
        ═══════════════════════════════════════════════════ */}
        {selectedChatbotId === null && (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Filtro tipo */}
              <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#e8eef8', height: 40 }}>
                {([
                  { key: 'all', label: 'Todos' },
                  { key: 'GENERAL', label: isDocenteMode ? 'Asignatura' : 'General' },
                  ...(!isDocenteMode ? [
                    { key: 'GENERAL_ADMINISTRADOR', label: 'Admin' },
                    { key: 'GENERAL_DOCENTE', label: 'Docente' },
                  ] : []),
                  ...(isDocenteMode ? [{ key: 'MINIPROYECTO', label: 'Miniproyecto' }] : []),
                ] as const).map((f) => (
                  <button key={f.key} type="button"
                    onClick={() => setTypeFilter(f.key as typeof typeFilter)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: typeFilter === f.key ? '#1a56db' : 'transparent', color: typeFilter === f.key ? '#fff' : '#4a6fa5' }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Filtro estado */}
              <div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: '#e8eef8', height: 40 }}>
                {([
                  { key: 'all',      label: `Todos (${totalChatbots})` },
                  { key: 'active',   label: `Activos (${activeChatbots})` },
                  { key: 'inactive', label: `Inactivos (${inactiveChatbots})` },
                ] as const).map((f) => (
                  <button key={f.key} type="button"
                    onClick={() => setStateFilter(f.key)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: stateFilter === f.key ? '#1a56db' : 'transparent', color: stateFilter === f.key ? '#fff' : '#4a6fa5' }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Búsqueda */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-xl px-3"
                style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: 40 }}>
                <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, tipo o modelo…"
                  className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
              </div>

              {/* Crear chatbot */}
              <button type="button" onClick={handleCreateNew}
                className="flex items-center gap-2 text-white font-bold text-sm px-5 rounded-xl transition-all hover:opacity-90 shrink-0"
                style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: 40, whiteSpace: 'nowrap' }}>
                <Plus className="w-4 h-4" />
                Crear chatbot
              </button>
            </div>

            {/* Estado / vacío */}
            {isLoading ? (
              <div className="app-empty-panel py-16 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Cargando chatbots…</p>
              </div>
            ) : visibleChatbots.length === 0 ? (
              <div className="app-empty-panel py-16 flex flex-col items-center gap-3">
                <Bot className="w-12 h-12 text-slate-300" />
                <p className="text-sm text-slate-500">No hay chatbots que coincidan con los filtros.</p>
              </div>
            ) : (
              /* Grid de tarjetas */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
                {visibleChatbots.map(chatbot => {
                  const isActive = chatbot.estado !== false;
                  const tipoColors: Record<string, string> = { GENERAL: '#059669', GENERAL_ADMINISTRADOR: '#1a56db', GENERAL_DOCENTE: '#7c3aed', MINIPROYECTO: '#d97706' };
                  const tColor = tipoColors[chatbot.tipo] || '#1a56db';
                  return (
                    <button key={chatbot.id} type="button"
                      onClick={() => { void toggleCatalogDetail(chatbot); setDetailTab('config'); }}
                      style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px', textAlign: 'left', cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'border-color 0.15s, box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a56db'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(26,86,219,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}>
                      {/* Icono + nombre */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${tColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Bot style={{ width: 18, height: 18, color: tColor }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', lineHeight: 1.3, marginBottom: 4 }}>{chatbot.nombre}</p>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `${tColor}18`, color: tColor }}>
                            {getChatbotTypeLabel(chatbot.tipo, isDocenteMode ? 'docente' : 'admin')}
                          </span>
                        </div>
                        {/* Estado badge */}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                          background: isActive ? '#dcfce7' : '#f1f5f9', color: isActive ? '#16a34a' : '#64748b' }}>
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {/* Modelo */}
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {chatbot.model_name || 'Modelo por defecto'}
                        {chatbot.descripcion ? ` · ${chatbot.descripcion.slice(0, 40)}${chatbot.descripcion.length > 40 ? '…' : ''}` : ''}
                      </p>
                      {/* Flecha */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ChevronRight style={{ width: 14, height: 14, color: '#bfd3f5' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            VISTA 2 — Detalle del chatbot con pestañas
        ═══════════════════════════════════════════════════ */}
        {selectedChatbotId !== null && (() => {
          const selectedChatbot = chatbots.find(c => c.id === selectedChatbotId);
          const isActive = selectedChatbot?.estado !== false;
          const tipoColors: Record<string, string> = { GENERAL: '#059669', GENERAL_ADMINISTRADOR: '#1a56db', GENERAL_DOCENTE: '#7c3aed', MINIPROYECTO: '#d97706' };
          const tColor = tipoColors[selectedChatbot?.tipo || 'GENERAL'] || '#1a56db';
          return (
            <>
              {/* Cabecera del detalle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button type="button"
                  onClick={() => { setSelectedChatbotId(null); setCatalogExpandedChatbotId(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                  <ArrowLeft style={{ width: 15, height: 15 }} />
                  Chatbots
                </button>
                <span style={{ color: '#e2e8f0' }}>›</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${tColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot style={{ width: 16, height: 16, color: tColor }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.nombre_chatbot || `Chatbot #${selectedChatbotId}`}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: `${tColor}18`, color: tColor, flexShrink: 0 }}>
                    {getChatbotTypeLabel(selectedChatbot?.tipo || 'GENERAL', isDocenteMode ? 'docente' : 'admin')}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                    background: isActive ? '#dcfce7' : '#f1f5f9', color: isActive ? '#16a34a' : '#64748b' }}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={handleEditSelected}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#dbeafe', color: '#1a56db', border: 'none' }}>
                    <Pencil style={{ width: 13, height: 13 }} />
                    Editar
                  </button>
                  {selectedChatbot && (
                    <button type="button"
                      onClick={e => void handleSetChatbotEstado(selectedChatbot, !isActive, e)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: isActive ? '#fee2e2' : '#dcfce7', color: isActive ? '#dc2626' : '#16a34a' }}>
                      {isActive ? <Eye style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                      {isActive ? 'Inhabilitar' : 'Habilitar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de pestañas */}
              <div className="flex items-center gap-1 p-1 rounded-xl mb-6" style={{ background: '#e8eef8', width: 'fit-content' }}>
                {([
                  { key: 'config',     label: 'Configuración', icon: <Save style={{ width: 13, height: 13 }} /> },
                  { key: 'documentos', label: 'Documentos',    icon: <FileText style={{ width: 13, height: 13 }} /> },
                  { key: 'probar',     label: 'Probar',        icon: <MessageCircle style={{ width: 13, height: 13 }} /> },
                ] as const).map(t => (
                  <button key={t.key} type="button"
                    onClick={() => setDetailTab(t.key)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: detailTab === t.key ? '#1a56db' : 'transparent', color: detailTab === t.key ? '#fff' : '#4a6fa5' }}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Configuración ── */}
              {detailTab === 'config' && selectedChatbot && (
                <div className="app-table-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    {[
                      { label: 'Tipo', value: getChatbotTypeLabel(selectedChatbot.tipo, isDocenteMode ? 'docente' : 'admin') },
                      { label: 'Modelo', value: selectedChatbot.model_name || 'Modelo por defecto' },
                      { label: 'Uso en', value: getChatbotUsageContextLabel(selectedChatbot.tipo, isDocenteMode ? 'docente' : 'admin') },
                      { label: 'Top-K', value: String(selectedChatbot.top_k ?? 5) },
                      { label: 'Máx. tokens', value: String(selectedChatbot.max_tokens ?? 512) },
                      { label: 'Contexto', value: `${selectedChatbot.max_context_chars ?? 4000} chars` },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {selectedChatbot.descripcion && (
                    <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Descripción</p>
                      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{selectedChatbot.descripcion}</p>
                    </div>
                  )}
                  {selectedChatbot.prompt_base && (
                    <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Prompt base</p>
                      <p style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedChatbot.prompt_base}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Documentos ── */}
              {detailTab === 'documentos' && (
                <section ref={documentSectionRef} className="app-table-card" style={{ padding: '24px' }}>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Base documental</p>
                      <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        PDFs de <strong>{form.nombre_chatbot?.trim() || `#${selectedChatbotId}`}</strong> · máx. 2500 KB por archivo
                      </p>
                    </div>
                    <button type="button" onClick={() => void handleReloadDocuments()} disabled={isReloading}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569' }}>
                      <RefreshCw style={{ width: 13, height: 13 }} className={isReloading ? 'animate-spin' : ''} />
                      Recargar base
                    </button>
                  </div>

                  {statusMessage && (
                    <div style={{ background: '#EFF6FF', border: '1px solid #bfd3f5', color: '#1a56db', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                      {statusMessage}
                    </div>
                  )}
                  {pdfSizeError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                      {pdfSizeError}
                    </div>
                  )}

                  {/* Selector de archivo */}
                  <input ref={uploadInputRef} id="chatbot-pdf-upload" type="file" accept=".pdf"
                    onChange={event => {
                      const file = event.target.files?.[0] || null;
                      if (file && file.size > 2500 * 1024) {
                        setPdfSizeError(`"${file.name}" supera 2500 KB. Selecciona un PDF más pequeño.`);
                        event.target.value = ''; setSelectedFile(null); return;
                      }
                      setPdfSizeError(''); setSelectedFile(file);
                    }}
                    className="hidden" hidden aria-hidden tabIndex={-1} style={{ display: 'none' }} />

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <button type="button" onClick={() => uploadInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#dbeafe', color: '#1a56db', border: 'none' }}>
                      <Plus style={{ width: 14, height: 14 }} />
                      {selectedFile ? selectedFile.name.slice(0, 24) + (selectedFile.name.length > 24 ? '…' : '') : 'Seleccionar PDF'}
                    </button>
                    {selectedFile && (
                      <button type="button" onClick={() => void handleUploadDocument()} disabled={isUploading}
                        className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: 36, whiteSpace: 'nowrap' }}>
                        {isUploading ? <><Loader style={{ width: 14, height: 14 }} className="animate-spin" />Subiendo…</> : <><Save style={{ width: 14, height: 14 }} />Subir PDF</>}
                      </button>
                    )}
                    {selectedFile && (
                      <button type="button" onClick={() => { setSelectedFile(null); setPdfSizeError(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#f1f5f9', color: '#64748b', border: 'none' }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </div>

                  {/* Lista de PDFs */}
                  {documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>
                      <FileText style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.4 }} />
                      <p>Aún no hay PDFs en este chatbot.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                          <FileText style={{ width: 16, height: 16, color: '#1a56db', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.nombre_original || doc.nombre_archivo || `Documento ${doc.id}`}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{formatBytes(doc.tamano_bytes)}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" title="Descargar"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: '#dbeafe', color: '#1a56db', border: 'none', cursor: 'pointer' }}
                              onClick={() => void (async () => {
                                try {
                                  setIsDownloadingPdfs(true);
                                  const res = await apiFetch(`/chatbots/${selectedChatbotId}/documents/${doc.id}/download`);
                                  if (!res.ok) throw new Error('No se pudo descargar.');
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url; a.download = doc.nombre_original || doc.nombre_archivo || `documento_${doc.id}.pdf`;
                                  a.click(); URL.revokeObjectURL(url);
                                } catch (err) { setStatusMessage(err instanceof Error ? err.message : 'Error al descargar.'); }
                                finally { setIsDownloadingPdfs(false); }
                              })()}>
                              <Download style={{ width: 13, height: 13 }} />
                            </button>
                            <button type="button" title="Eliminar" onClick={() => void handleDeleteDocument(doc.id)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* ── Tab: Probar ── */}
              {detailTab === 'probar' && (
                <div className="app-table-card" style={{ overflow: 'hidden' }}>
                  {statusMessage && (
                    <div style={{ background: '#EFF6FF', borderBottom: '1px solid #bfd3f5', color: '#1a56db', padding: '10px 18px', fontSize: 12 }}>
                      {statusMessage}
                    </div>
                  )}
                  {/* Mensajes */}
                  <div style={{ minHeight: 320, maxHeight: 480, overflowY: 'auto', padding: '20px 20px 0' }}>
                    {messages.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 10 }}>
                        <Bot style={{ width: 40, height: 40, color: '#bfd3f5' }} />
                        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 260 }}>
                          Escribe una pregunta para probar el chatbot <strong>{form.nombre_chatbot}</strong>.
                        </p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={index} style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: message.isBot ? '#1a56db' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            {message.isBot ? 'Chatbot' : 'Tú'}
                          </p>
                          <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                            background: message.isBot ? '#EFF6FF' : '#f8fafc',
                            color: message.isBot ? '#1e293b' : '#475569',
                            border: `1px solid ${message.isBot ? '#bfd3f5' : '#e2e8f0'}` }}>
                            {message.isBot
                              ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessForMarkdown(String(message.text || ''))}</ReactMarkdown>
                              : message.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Input */}
                  <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
                    <input type="text" value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAskQuestion(); } }}
                      disabled={isAsking}
                      placeholder="Escribe una pregunta y pulsa Enter…"
                      style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #bfd3f5', fontSize: 13, outline: 'none', color: '#1e293b', background: '#f8fafc' }}
                      className="flex-1" />
                    <button type="button" onClick={() => void handleAskQuestion()}
                      disabled={isAsking || !inputValue.trim()}
                      className="flex items-center gap-2 text-white font-bold text-sm px-4 rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: 40, whiteSpace: 'nowrap' }}>
                      {isAsking ? <><Loader style={{ width: 14, height: 14 }} className="animate-spin" />Esperando…</> : <><Send style={{ width: 14, height: 14 }} />Enviar</>}
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
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
                              <option value="GENERAL">General (estudiantes · panel de asignaturas)</option>
                              <option value="GENERAL_ADMINISTRADOR">General administrador</option>
                              <option value="GENERAL_DOCENTE">General docente</option>
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
                className="app-btn app-primary-btn px-6 py-3 disabled:opacity-50"
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
