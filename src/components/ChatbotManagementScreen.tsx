import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Database,
  FileText,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const CHATBOT_TIMEOUT_MS = 120000;

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
  const [search, setSearch] = useState('');
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

  const filteredChatbots = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chatbots;
    return chatbots.filter((chatbot) => {
      const name = chatbot.nombre?.toLowerCase() || '';
      const type = chatbot.tipo?.toLowerCase() || '';
      const model = chatbot.model_name?.toLowerCase() || '';
      return name.includes(term) || type.includes(term) || model.includes(term);
    });
  }, [chatbots, search]);

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
      .sort((a, b) => {
        const left = getMiniproyectoLabel(a);
        const right = getMiniproyectoLabel(b);
        return left.localeCompare(right);
      });
  }, [form.area_id, miniproyectos]);

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
    setStatusMessage('Preparando un nuevo chatbot.');
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
        handleCreateNew();
      }
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
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl text-[#3A4A5B]">Gestión de Chatbots</h1>
              <p className="text-gray-500 text-sm">Administra chatbots generales y de miniproyecto con aislamiento de conocimiento.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-[320px_1fr] gap-6">
          <section className="bg-white rounded-xl shadow-md p-5 h-fit">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg text-[#3A4A5B]">Chatbots</h2>
                <p className="text-sm text-gray-500">General y miniproyecto</p>
              </div>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4A90E2] text-white hover:bg-[#3A7ED1] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar chatbot..."
              className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
            />

            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="text-sm text-gray-500">Cargando chatbots...</div>
              ) : filteredChatbots.length === 0 ? (
                <div className="text-sm text-gray-500">No hay chatbots registrados.</div>
              ) : (
                filteredChatbots.map((chatbot) => {
                  const isSelected = chatbot.id === selectedChatbotId;
                  return (
                    <button
                      key={chatbot.id}
                      onClick={() => void selectChatbot(chatbot)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-[#4A90E2] bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-[#A7C8F2] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-[#3A4A5B] truncate">{chatbot.nombre}</p>
                          <p className="text-xs text-gray-500">{chatbot.model_name || 'Modelo por defecto'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${chatbot.tipo === 'GENERAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {chatbot.tipo === 'GENERAL' ? 'General' : 'Miniproyecto'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>{chatbot.estado === false ? 'Inactivo' : 'Activo'}</span>
                        <span>{chatbot.documentos?.length || 0} PDF(s)</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            {statusMessage ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
                {statusMessage}
              </div>
            ) : null}

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl text-[#3A4A5B]">Configuración del Chatbot</h2>
                  <p className="text-sm text-gray-500">Define si el chatbot es global o específico de un miniproyecto.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openPdfPicker}
                    disabled={!selectedChatbotId}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    Cargar PDF
                  </button>
                  {selectedChatbotId ? (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  ) : null}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A90E2] text-white hover:bg-[#3A7ED1] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {selectedChatbotId ? 'Guardar cambios' : 'Crear chatbot'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Nombre</span>
                  <input
                    value={form.nombre_chatbot}
                    onChange={(event) => updateForm('nombre_chatbot', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                    placeholder="Tutor de Inventarios v1"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Tipo</span>
                  <select
                    value={form.tipo}
                    onChange={(event) => updateForm('tipo', event.target.value as ChatbotFormState['tipo'])}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  >
                    <option value="GENERAL">General</option>
                    <option value="MINIPROYECTO">Miniproyecto</option>
                  </select>
                </label>

                <label className="block col-span-2">
                  <span className="block text-sm text-gray-600 mb-2">Descripción</span>
                  <textarea
                    value={form.descripcion}
                    onChange={(event) => updateForm('descripcion', event.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                    placeholder="Describe el propósito del chatbot."
                  />
                </label>

                <label className="block col-span-2">
                  <span className="block text-sm text-gray-600 mb-2">Prompt base</span>
                  <textarea
                    value={form.prompt_base}
                    onChange={(event) => updateForm('prompt_base', event.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                    placeholder="Instrucciones base opcionales para el chatbot."
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Área</span>
                  <select
                    value={form.area_id}
                    onChange={(event) => updateForm('area_id', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  >
                    <option value="">{form.tipo === 'GENERAL' ? 'Sin área (global)' : 'Selecciona un área'}</option>
                    {areaOptions.map((area) => (
                      <option key={area.id} value={area.id}>{area.nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Miniproyecto</span>
                  <select
                    value={form.miniproyecto_id}
                    onChange={(event) => updateForm('miniproyecto_id', event.target.value)}
                    disabled={form.tipo !== 'MINIPROYECTO' || !form.area_id}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] disabled:bg-gray-100 disabled:text-gray-400"
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
                      <option key={item.id} value={item.id}>
                        {getMiniproyectoLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Modelo</span>
                  <input
                    value={form.model}
                    onChange={(event) => updateForm('model', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">topK</span>
                  <input
                    type="number"
                    min={1}
                    value={form.topK}
                    onChange={(event) => updateForm('topK', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Máx. chars de contexto</span>
                  <input
                    type="number"
                    min={200}
                    value={form.max_context_chars}
                    onChange={(event) => updateForm('max_context_chars', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Máx. tokens</span>
                  <input
                    type="number"
                    min={64}
                    value={form.max_tokens}
                    onChange={(event) => updateForm('max_tokens', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm text-gray-600 mb-2">Temperatura</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={1}
                    value={form.temperature}
                    onChange={(event) => updateForm('temperature', event.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </label>

                <label className="inline-flex items-center gap-3 mt-8">
                  <input
                    type="checkbox"
                    checked={form.estado}
                    onChange={(event) => updateForm('estado', event.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2]"
                  />
                  <span className="text-sm text-gray-700">Chatbot activo</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div ref={documentSectionRef} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#3A4A5B]">Base Documental</h3>
                      <p className="text-sm text-gray-500">PDFs aislados por chatbot y por miniproyecto.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleReloadDocuments()}
                    disabled={!selectedChatbotId || isReloading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                    Recargar
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-sm font-semibold shrink-0">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Guardar chatbot antes de cargar documentos</p>
                      <p className="text-sm text-amber-800 mt-1">
                        {selectedChatbotId
                          ? `Chatbot activo para documentos: ${form.nombre_chatbot || `#${selectedChatbotId}`}.`
                          : 'Primero crea y guarda el chatbot. Cuando quede guardado se habilitará la confirmación del PDF.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-5 mb-4 bg-gray-50">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#D9E8FB] text-[#2F6FB2] flex items-center justify-center text-sm font-semibold shrink-0">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#3A4A5B]">Seleccionar el PDF</p>
                      <p className="text-sm text-gray-500 mt-1">Elige el archivo que quieres asociar de forma inmediata al chatbot seleccionado.</p>
                    </div>
                  </div>

                  <input
                    ref={uploadInputRef}
                    id="chatbot-pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-3 rounded-xl bg-white border border-gray-200">
                        <Upload className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#3A4A5B] font-medium">Archivo listo para asociar</p>
                        <p className="text-sm text-gray-500 truncate">
                          {selectedFile ? selectedFile.name : 'Todavía no has seleccionado ningún PDF'}
                        </p>
                      </div>
                    </div>

                    <label
                      htmlFor="chatbot-pdf-upload"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 bg-white text-[#3A4A5B] hover:bg-gray-50 cursor-pointer font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Seleccionar PDF
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-5 mb-2">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-9 h-9 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-semibold shrink-0">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">Confirmar y vincular PDF al chatbot</p>
                      <p className="text-sm text-green-800 mt-1">
                        Este botón confirma la carga y asocia el PDF directamente al chatbot actual.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-green-200 px-4 py-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 mb-1">Chatbot destino</p>
                        <p className="text-[#3A4A5B] font-medium">{selectedChatbotId ? (form.nombre_chatbot || `#${selectedChatbotId}`) : 'Ninguno todavía'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">PDF seleccionado</p>
                        <p className="text-[#3A4A5B] font-medium truncate">{selectedFile ? selectedFile.name : 'Ningún archivo seleccionado'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => void handleUploadDocument()}
                    disabled={!selectedChatbotId || !selectedFile || isUploading}
                    className="w-full inline-flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold shadow-sm"
                  >
                    <Upload className="w-5 h-5" />
                    {isUploading ? 'Confirmando y cargando PDF...' : 'Confirmar PDF y cargarlo a este chatbot'}
                  </button>
                </div>

                <div className="mt-5 space-y-3 max-h-64 overflow-y-auto pr-1">
                  {documents.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay documentos asociados.</div>
                  ) : (
                    documents.map((document) => (
                      <div key={document.id} className="rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[#3A4A5B] truncate">{document.nombre_original || document.nombre_archivo}</p>
                          <p className="text-xs text-gray-500">{formatBytes(document.tamano_bytes)}</p>
                        </div>
                        <button
                          onClick={() => void handleDeleteDocument(document.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-[#3A4A5B]">Rendimiento y Estado</h3>
                    <p className="text-sm text-gray-500">Estado del índice y parámetros persistidos.</p>
                  </div>
                </div>

                {stats ? (
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between"><span>Proveedor</span><span>{stats.provider || '-'}</span></div>
                    <div className="flex justify-between"><span>Modelo</span><span>{stats.model || '-'}</span></div>
                    <div className="flex justify-between"><span>Documentos</span><span>{stats.documentos ?? documents.length}</span></div>
                    <div className="flex justify-between"><span>Chunks</span><span>{stats.chunksLoaded ?? 0}</span></div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-gray-600">
                      {stats.message || 'Sin datos de indexación.'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Guarda o selecciona un chatbot para ver sus estadísticas.</div>
                )}

                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Base sugerida para nuevos chatbots: `topK = 1`, `max_context_chars = 600` y documentos mínimos por miniproyecto para no saturar el RAG.
                </div>
              </div>
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
                    <button
                      onClick={() => void handleAskQuestion()}
                      disabled={isAsking || !selectedChatbotId || !inputValue.trim()}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#4A90E2] text-white hover:bg-[#3A7ED1] disabled:opacity-50"
                    >
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
  );
}