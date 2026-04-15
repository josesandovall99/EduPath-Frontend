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
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const CHATBOT_TIMEOUT_MS = 120000;
const MODEL_OPTIONS = ['qwen2.5:0.5b', 'llama3.2:1b', 'llama3.2'];

interface ChatbotManagementScreenProps {
  onBack: () => void;
}

interface AreaItem {
  id: number;
  nombre: string;
}

interface MiniproyectoItem {
  id: number;
  area_id?: number;
  Area?: {
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
  tipo: 'GENERAL' | 'MINIPROYECTO';
  prompt_base?: string | null;
  area_id?: number | null;
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
  provider?: string;
  model?: string;
  documentos?: number;
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
  tipo: 'GENERAL' | 'MINIPROYECTO';
  prompt_base: string;
  area_id: string;
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
  area_id: '',
  miniproyecto_id: '',
  model: 'qwen2.5:0.5b',
  topK: '1',
  max_context_chars: '600',
  max_tokens: '256',
  temperature: '0.2',
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

function getMiniproyectoAreaId(item: MiniproyectoItem) {
  if (Number.isFinite(Number(item.area_id))) {
    return Number(item.area_id);
  }

  if (Number.isFinite(Number(item.Area?.id))) {
    return Number(item.Area?.id);
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

function mapChatbotToForm(chatbot: ChatbotItem): ChatbotFormState {
  return {
    id: chatbot.id,
    nombre_chatbot: chatbot.nombre || '',
    descripcion: chatbot.descripcion || '',
    tipo: chatbot.tipo || 'GENERAL',
    prompt_base: chatbot.prompt_base || '',
    area_id: chatbot.area_id ? String(chatbot.area_id) : '',
    miniproyecto_id: chatbot.miniproyecto_id ? String(chatbot.miniproyecto_id) : '',
    model: chatbot.model_name || 'qwen2.5:0.5b',
    topK: String(chatbot.top_k || 1),
    max_context_chars: String(chatbot.max_context_chars || 600),
    max_tokens: String(chatbot.max_tokens || 256),
    temperature: String(chatbot.temperature ?? 0.2),
    estado: chatbot.estado !== false,
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

export function ChatbotManagementScreen({ onBack }: ChatbotManagementScreenProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const documentSectionRef = useRef<HTMLDivElement | null>(null);

  const [chatbots, setChatbots] = useState<ChatbotItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'GENERAL' | 'MINIPROYECTO'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (form.tipo === 'GENERAL' && form.miniproyecto_id) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
    }
  }, [form.tipo, form.miniproyecto_id]);

  useEffect(() => {
    if (form.tipo !== 'MINIPROYECTO') {
      return;
    }

    if (!form.area_id && form.miniproyecto_id) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
      return;
    }

    if (!form.miniproyecto_id) {
      return;
    }

    const selectedAreaId = Number(form.area_id);
    if (!Number.isFinite(selectedAreaId)) {
      return;
    }

    const selectedMiniproyecto = miniproyectos.find((item) => Number(item.id) === Number(form.miniproyecto_id));
    if (!selectedMiniproyecto) {
      return;
    }

    const miniproyectoAreaId = getMiniproyectoAreaId(selectedMiniproyecto);
    if (miniproyectoAreaId !== selectedAreaId) {
      setForm((prev) => ({ ...prev, miniproyecto_id: '' }));
    }
  }, [form.tipo, form.area_id, form.miniproyecto_id, miniproyectos]);

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

  const areaOptions = useMemo(() => areas.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)), [areas]);

  const miniproyectoOptions = useMemo(() => {
    const areaId = Number(form.area_id);
    return miniproyectos
      .filter((item) => {
        if (!Number.isFinite(areaId)) {
          return false;
        }

        return getMiniproyectoAreaId(item) === areaId;
      })
      .sort((a, b) => getMiniproyectoLabel(a).localeCompare(getMiniproyectoLabel(b)));
  }, [form.area_id, miniproyectos]);

  const selectedArea = areaOptions.find((area) => String(area.id) === form.area_id);
  const selectedMiniproyecto = miniproyectos.find((item) => String(item.id) === form.miniproyecto_id);
  const totalChatbots = chatbots.length;
  const activeChatbots = chatbots.filter((chatbot) => chatbot.estado !== false).length;
  const generalChatbots = chatbots.filter((chatbot) => chatbot.tipo === 'GENERAL').length;
  const miniproyectoChatbots = chatbots.filter((chatbot) => chatbot.tipo === 'MINIPROYECTO').length;
  const formCompletion = [
    form.nombre_chatbot.trim(),
    form.descripcion.trim(),
    form.tipo,
    form.model.trim(),
    form.tipo === 'GENERAL' ? true : form.area_id,
    form.tipo === 'GENERAL' ? true : form.miniproyecto_id,
  ].filter(Boolean).length;
  const canConfirmPdf = Boolean(selectedChatbotId && selectedFile && !isUploading);
  const canCancelPdf = Boolean(selectedFile);

  function scrollToDocumentSection() {
    documentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPdfPicker() {
    if (!selectedChatbotId) {
      setStatusMessage('Primero crea y guarda el chatbot; luego podrás seleccionar el PDF.');
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
      const [chatbotsResponse, areasResponse, miniproyectosResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/chatbots`),
        fetch(`${API_BASE_URL}/areas`),
        fetch(`${API_BASE_URL}/miniproyectos`),
      ]);

      if (!chatbotsResponse.ok) throw new Error('No se pudieron cargar los chatbots.');
      if (!areasResponse.ok) throw new Error('No se pudieron cargar las áreas.');
      if (!miniproyectosResponse.ok) throw new Error('No se pudieron cargar los miniproyectos.');

      const [chatbotsData, areasData, miniproyectosData] = await Promise.all([
        chatbotsResponse.json(),
        areasResponse.json(),
        miniproyectosResponse.json(),
      ]);

      const nextChatbots = Array.isArray(chatbotsData) ? chatbotsData : [];
      setChatbots(nextChatbots);
      setAreas(Array.isArray(areasData) ? areasData : []);
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
    const response = await fetch(`${API_BASE_URL}/chatbots`);
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
    setForm(mapChatbotToForm(chatbot));
    setDocuments(chatbot.documentos || []);
    setMessages([]);

    try {
      const [documentsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/chatbots/${chatbot.id}/documents`),
        fetch(`${API_BASE_URL}/chatbots/${chatbot.id}/stats`),
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
    setForm(emptyForm());
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

    setIsFormVisible(true);
    setStatusMessage('Editando configuración del chatbot seleccionado.');
  }

  function handleCloseForm() {
    setIsFormVisible(false);
    setSelectedFile(null);

    if (selectedChatbotId) {
      const selectedChatbot = chatbots.find((item) => item.id === selectedChatbotId);
      if (selectedChatbot) {
        setForm(mapChatbotToForm(selectedChatbot));
      }
    } else {
      setForm(emptyForm());
    }

    setStatusMessage('Formulario oculto. Usa Crear Nuevo Chatbot o Editar para abrirlo cuando lo necesites.');
  }

  function updateForm<K extends keyof ChatbotFormState>(key: K, value: ChatbotFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.nombre_chatbot.trim()) {
      setStatusMessage('El nombre del chatbot es obligatorio.');
      return;
    }

    if (form.tipo === 'MINIPROYECTO' && (!form.area_id || !form.miniproyecto_id)) {
      setStatusMessage('Para un chatbot de miniproyecto debes seleccionar área y miniproyecto.');
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
        area_id: form.area_id ? Number(form.area_id) : null,
        miniproyecto_id: form.tipo === 'MINIPROYECTO' && form.miniproyecto_id ? Number(form.miniproyecto_id) : null,
      },
      parametros_rendimiento: {
        model: form.model,
        topK: Number(form.topK) || 1,
        max_context_chars: Number(form.max_context_chars) || 600,
        max_tokens: Number(form.max_tokens) || 256,
        temperature: Number(form.temperature) || 0.2,
      },
    };

    try {
      const isEditing = typeof form.id === 'number' && Number.isFinite(form.id) && form.id > 0;
      const response = await fetch(isEditing ? `${API_BASE_URL}/chatbots/${form.id}` : `${API_BASE_URL}/chatbots`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
      const response = await fetch(`${API_BASE_URL}/chatbots/${selectedChatbotId}`, { method: 'DELETE' });
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

  async function handleUploadDocument() {
    if (!selectedChatbotId) {
      setStatusMessage('Guarda el chatbot antes de subir documentos.');
      return;
    }
    if (!selectedFile) {
      setStatusMessage('Selecciona un PDF antes de subirlo.');
      return;
    }

    setIsUploading(true);
    setStatusMessage('Subiendo documento...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbots/${selectedChatbotId}/documents`, {
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
      const response = await fetch(`${API_BASE_URL}/chatbots/${selectedChatbotId}/documents/${documentId}`, {
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
      const response = await fetch(`${API_BASE_URL}/chatbots/${selectedChatbotId}/reload`, { method: 'POST' });
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

      const response = await fetch(`${API_BASE_URL}/chatbots/${selectedChatbotId}/chat/stream`, {
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
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button onClick={handleCreateNew} className="app-btn app-btn-success px-6 py-3">
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Chatbot</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{totalChatbots}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Chatbots</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-[#7ED6A7]" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">{activeChatbots}</span>
            </div>
            <p className="text-gray-600 text-sm">Activos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-3xl text-emerald-600">{generalChatbots}</span>
            </div>
            <p className="text-gray-600 text-sm">Generales</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-3xl text-orange-500">{miniproyectoChatbots}</span>
            </div>
            <p className="text-gray-600 text-sm">Miniproyecto</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="app-filter-row">
                <button onClick={() => setTypeFilter('all')} className={`app-filter-chip ${typeFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>Todos</button>
                <button onClick={() => setTypeFilter('GENERAL')} className={`app-filter-chip ${typeFilter === 'GENERAL' ? 'app-filter-chip--green' : ''}`}>Generales</button>
                <button onClick={() => setTypeFilter('MINIPROYECTO')} className={`app-filter-chip ${typeFilter === 'MINIPROYECTO' ? 'app-filter-chip--amber' : ''}`}>Miniproyecto</button>
              </div>

              <div className="app-filter-row">
                <button onClick={() => setStateFilter('all')} className={`app-filter-chip ${stateFilter === 'all' ? 'app-filter-chip--blue' : ''}`}>Todos</button>
                <button onClick={() => setStateFilter('active')} className={`app-filter-chip ${stateFilter === 'active' ? 'app-filter-chip--green' : ''}`}>Activos ({activeChatbots})</button>
                <button onClick={() => setStateFilter('inactive')} className={`app-filter-chip ${stateFilter === 'inactive' ? 'app-filter-chip--amber' : ''}`}>Inactivos ({totalChatbots - activeChatbots})</button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar chatbots..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)] gap-6">
          <section className="bg-white rounded-xl shadow-md overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
                  <p className="text-gray-600">Cargando chatbots...</p>
                </div>
              </div>
            ) : visibleChatbots.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay chatbots que coincidan con los filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-[#3A4A5B]">Chatbot</th>
                      <th className="px-6 py-4 text-left text-[#3A4A5B]">Tipo</th>
                      <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {visibleChatbots.map((chatbot) => {
                      const isSelected = chatbot.id === selectedChatbotId;
                      const chatbotIsActive = chatbot.estado !== false;
                      return (
                        <tr
                          key={chatbot.id}
                          onClick={() => void selectChatbot(chatbot)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : chatbotIsActive ? 'hover:bg-gray-50' : 'bg-slate-50/70 text-slate-500'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${chatbot.tipo === 'GENERAL' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                                <Bot className={`w-5 h-5 ${chatbot.tipo === 'GENERAL' ? 'text-emerald-700' : 'text-orange-700'}`} />
                              </div>
                              <div>
                                <div className="text-[#3A4A5B]">{chatbot.nombre}</div>
                                <div className="text-xs text-gray-500">{chatbot.model_name || 'Modelo por defecto'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${chatbot.tipo === 'GENERAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {chatbot.tipo === 'GENERAL' ? 'General' : 'Miniproyecto'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${chatbotIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {chatbotIsActive ? 'Activo' : 'Inhabilitado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-6">
            {statusMessage ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
                {statusMessage}
              </div>
            ) : null}

            {!isFormVisible && selectedChatbotId ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400 mb-1">Chatbot seleccionado</div>
                    <div className="text-lg text-[#3A4A5B]">{form.nombre_chatbot || `Chatbot #${selectedChatbotId}`}</div>
                    <div className="text-sm text-slate-500">
                      {form.tipo === 'GENERAL' ? 'General' : 'Miniproyecto'}
                      {form.model ? ` • ${form.model}` : ''}
                    </div>
                  </div>
                  <button onClick={handleEditSelected} className="app-btn app-btn-secondary px-4 py-3">
                    <span>Editar chatbot seleccionado</span>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-6">
              <section ref={documentSectionRef} className="app-form-section app-form-section--muted bg-white rounded-xl shadow-md p-5 lg:p-6">
                <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#3A4A5B]">Base Documental</h3>
                      <p className="text-sm text-slate-500">Gestiona la base de PDFs vinculada al chatbot con el mismo patrón visual del panel administrativo.</p>
                    </div>
                  </div>
                  <button onClick={() => void handleReloadDocuments()} disabled={!selectedChatbotId || isReloading} className="app-btn app-btn-secondary px-4 py-3 text-slate-700 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                    <span>Recargar</span>
                  </button>
                </div>

                <input ref={uploadInputRef} id="chatbot-pdf-upload" type="file" accept=".pdf" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="hidden" />

                <div className="app-form-stack">
                  <div className="app-form-summary-card">
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
                      <div className="min-w-0">
                        <div className="app-form-summary-label">Destino documental</div>
                        <div className="app-form-summary-value">{selectedChatbotId ? (form.nombre_chatbot || `#${selectedChatbotId}`) : 'Guarda o selecciona un chatbot'}</div>
                        <div className="app-form-summary-help">{selectedChatbotId ? 'La carga quedará asociada a este chatbot.' : 'Debes guardar el chatbot antes de confirmar la carga.'}</div>
                      </div>
                      <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${selectedChatbotId ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedChatbotId ? 'Listo para cargar' : 'Pendiente de guardar'}
                      </div>
                    </div>
                  </div>

                  <div className="app-form-section border border-slate-200 bg-slate-50/80">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Cargar documento</h4>
                      <p className="app-form-section-description">Selecciona, confirma o cancela la carga del PDF desde una sola banda operativa.</p>
                    </div>

                    <div className="rounded-xl border border-white bg-white px-4 py-3 flex items-center justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="app-form-summary-label">Archivo seleccionado</div>
                        <div className="text-sm text-[#3A4A5B] truncate">{selectedFile ? selectedFile.name : 'Ningún PDF seleccionado'}</div>
                      </div>
                      <div className="text-xs text-slate-400">{selectedFile ? 'Listo para confirmar' : 'Sin selección'}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label
                        htmlFor="chatbot-pdf-upload"
                        className="relative inline-flex h-14 items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-sm transition-all cursor-pointer text-center"
                        style={{
                          backgroundColor: '#3b82f6',
                          borderColor: '#3b82f6',
                          color: '#ffffff',
                          boxShadow: '0 10px 20px rgba(59, 130, 246, 0.18)',
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center leading-none">
                          Seleccionar PDF
                        </span>
                      </label>
                      <button
                        onClick={() => void handleUploadDocument()}
                        disabled={!canConfirmPdf}
                        className="inline-flex h-14 items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed text-center"
                        style={{
                          backgroundColor: '#22c55e',
                          borderColor: '#22c55e',
                          color: '#ffffff',
                          boxShadow: '0 10px 20px rgba(34, 197, 94, 0.18)',
                          opacity: 1,
                        }}
                      >
                        <span>{isUploading ? 'Cargando...' : 'Cargar PDF'}</span>
                      </button>
                      <button
                        onClick={() => setSelectedFile(null)}
                        disabled={!canCancelPdf}
                        className="inline-flex h-14 items-center justify-center rounded-xl border px-4 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed text-center"
                        style={{
                          backgroundColor: '#ef4444',
                          borderColor: '#ef4444',
                          color: '#111827',
                          boxShadow: '0 10px 20px rgba(239, 68, 68, 0.18)',
                          opacity: 1,
                        }}
                      >
                        <span>Cancelar PDF</span>
                      </button>
                    </div>
                  </div>

                  <div className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Documentos vinculados</h4>
                      <p className="app-form-section-description">Listado limpio de los recursos ya incorporados a la base del chatbot.</p>
                    </div>

                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {documents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 text-center bg-slate-50/60">No hay documentos asociados.</div>
                      ) : (
                        documents.map((document) => (
                          <div key={document.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                            <div className="min-w-0">
                              <p className="text-sm text-[#3A4A5B] truncate">{document.nombre_original || document.nombre_archivo}</p>
                              <p className="text-xs text-slate-500">{formatBytes(document.tamano_bytes)}</p>
                            </div>
                            <button onClick={() => void handleDeleteDocument(document.id)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-red-600 hover:bg-red-50" title="Eliminar documento">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="app-form-section bg-white rounded-xl shadow-md p-5 lg:p-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="p-2.5 bg-blue-100 rounded-xl">
                    <Database className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-lg text-[#3A4A5B]">Rendimiento y Estado</h3>
                    <p className="text-sm text-slate-500">Indicadores compactos sobre el índice cargado y la configuración persistida del chatbot.</p>
                  </div>
                </div>

                {stats ? (
                  <div className="app-form-stack">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Proveedor</div>
                        <div className="app-form-summary-value">{stats.provider || '-'}</div>
                      </div>
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Modelo</div>
                        <div className="app-form-summary-value">{stats.model || '-'}</div>
                      </div>
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Documentos</div>
                        <div className="app-form-summary-value">{stats.documentos ?? documents.length}</div>
                      </div>
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Chunks</div>
                        <div className="app-form-summary-value">{stats.chunksLoaded ?? 0}</div>
                      </div>
                    </div>

                    <div className="app-form-note">
                      <div className="app-form-summary-label">Estado del índice</div>
                      <div className="text-sm text-slate-600 mt-2">{stats.message || 'Sin datos de indexación.'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 text-center bg-slate-50/60">
                    Guarda o selecciona un chatbot para ver sus estadísticas.
                  </div>
                )}

                <div className="app-form-note mt-5">
                  <div className="app-form-summary-label">Sugerencia base</div>
                  <div className="text-sm text-slate-600 mt-2">Usa `topK = 1`, `max_context_chars = 600` y una base documental contenida para mantener respuestas más rápidas y enfocadas.</div>
                </div>
              </section>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] p-4 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-white">Probar Chatbot</h3>
                  <p className="text-blue-100 text-sm">Usa streaming contra el chatbot seleccionado.</p>
                </div>
              </div>

              <div className="p-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                        <Bot className="w-12 h-12 mb-3 opacity-50" />
                        <p>Selecciona un chatbot y haz una pregunta para probarlo.</p>
                      </div>
                    ) : (
                      messages.map((message, index) => (
                        <div key={index} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[75%] px-4 py-3 rounded-xl ${message.isBot ? 'bg-white border border-gray-200 text-gray-800' : 'bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white'}`}>
                            {message.text || (message.isBot && isAsking ? '...' : '')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-white flex gap-3">
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
                      placeholder={selectedChatbotId ? 'Haz una pregunta al chatbot seleccionado...' : 'Primero crea o selecciona un chatbot'}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] disabled:bg-gray-100"
                    />
                    <button onClick={() => void handleAskQuestion()} disabled={isAsking || !selectedChatbotId || !inputValue.trim()} className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#4A90E2] text-white hover:bg-[#3A7ED1] disabled:opacity-50">
                      <Send className="w-4 h-4" />
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
                    Configura el comportamiento del tutor, asígnalo al contexto académico correcto y deja lista su base documental.
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
                      Crea primero el chatbot y luego completa su base documental para dejarlo listo para estudiantes o miniproyectos.
                    </div>
                  )}

                  <section className="app-form-section app-form-section--muted">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Información base</h4>
                      <p className="app-form-section-description">Define el nombre, el propósito y el tipo de chatbot que vas a publicar.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Nombre</label>
                        <input value={form.nombre_chatbot} onChange={(event) => updateForm('nombre_chatbot', event.target.value)} className="app-form-input" placeholder="Tutor de Inventarios v1" />
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Tipo</label>
                        <select value={form.tipo} onChange={(event) => updateForm('tipo', event.target.value as ChatbotFormState['tipo'])} className="app-form-select">
                          <option value="GENERAL">General</option>
                          <option value="MINIPROYECTO">Miniproyecto</option>
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
                      <p className="app-form-section-description">Asocia el chatbot al área correcta y, si aplica, al miniproyecto específico que lo va a consumir.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label">Área</label>
                        <select value={form.area_id} onChange={(event) => updateForm('area_id', event.target.value)} className="app-form-select">
                          <option value="">{form.tipo === 'GENERAL' ? 'Sin área (global)' : 'Selecciona un área'}</option>
                          {areaOptions.map((area) => (
                            <option key={area.id} value={area.id}>{area.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Miniproyecto</label>
                        <select
                          value={form.miniproyecto_id}
                          onChange={(event) => updateForm('miniproyecto_id', event.target.value)}
                          disabled={form.tipo !== 'MINIPROYECTO' || !form.area_id}
                          className="app-form-select disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          <option value="">
                            {form.tipo !== 'MINIPROYECTO'
                              ? 'No aplica para General'
                              : !form.area_id
                                ? 'Primero selecciona un área'
                                : miniproyectoOptions.length === 0
                                  ? 'No hay miniproyectos para esta área'
                                  : 'Selecciona un miniproyecto'}
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
                        <label className="app-form-label flex items-center gap-2">topK <InfoBadge text="Cantidad de fragmentos recuperados del PDF antes de responder." /></label>
                        <input type="number" min={1} value={form.topK} onChange={(event) => updateForm('topK', event.target.value)} className="app-form-input" />
                      </div>
                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">Máx. chars de contexto <InfoBadge text="Límite de texto de apoyo que se envía al modelo en cada consulta." /></label>
                        <input type="number" min={200} value={form.max_context_chars} onChange={(event) => updateForm('max_context_chars', event.target.value)} className="app-form-input" />
                      </div>
                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">Máx. tokens <InfoBadge text="Cantidad máxima de texto que puede generar el chatbot en su respuesta." /></label>
                        <input type="number" min={64} value={form.max_tokens} onChange={(event) => updateForm('max_tokens', event.target.value)} className="app-form-input" />
                      </div>
                      <div className="app-form-field">
                        <label className="app-form-label flex items-center gap-2">Temperatura <InfoBadge text="Define qué tan creativa o estable será la respuesta del chatbot." /></label>
                        <input type="number" step="0.1" min={0} max={1} value={form.temperature} onChange={(event) => updateForm('temperature', event.target.value)} className="app-form-input" />
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
                        <div className="app-form-summary-help">{form.tipo === 'GENERAL' ? 'Chatbot transversal' : 'Chatbot de miniproyecto'}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Área</div>
                          <div className="app-form-summary-value">{selectedArea?.nombre || 'Pendiente'}</div>
                        </div>
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Miniproyecto</div>
                          <div className="app-form-summary-value">{selectedMiniproyecto ? getMiniproyectoLabel(selectedMiniproyecto) : 'Pendiente'}</div>
                        </div>
                      </div>
                      <div className="app-form-note">
                        <div className="app-form-summary-label">Estado del formulario</div>
                        <div className="app-form-summary-value">{selectedChatbotId ? 'Editando configuración existente' : 'Preparando nuevo chatbot'}</div>
                        <div className="app-form-summary-help">Avance del formulario: {formCompletion}/{form.tipo === 'GENERAL' ? 5 : 6} campos clave completos.</div>
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <h4 className="app-form-section-title">Antes de guardar</h4>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      <p>Verifica que el modelo escrito exista realmente en tu proveedor configurado.</p>
                      <p>Para chatbots de miniproyecto, confirma que el área y el miniproyecto correspondan al contexto correcto.</p>
                      <p>Después de guardar, completa la base documental y prueba una conversación corta antes de publicarlo.</p>
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
