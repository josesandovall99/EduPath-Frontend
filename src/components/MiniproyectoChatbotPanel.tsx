import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessForMarkdown } from '../utils/markdown';
import { getChatbotResolveKey, getCachedChatbot, setCachedChatbot } from '../utils/chatbotResolveCache';

const CHATBOT_TIMEOUT_MS = 120000;

type ChatbotType = 'GENERAL' | 'MINIPROYECTO';

interface ResolvedChatbot {
  id: number;
  nombre: string;
  tipo: ChatbotType;
  fallback?: boolean;
}


interface MiniproyectoChatbotPanelProps {
  chatbotType?: ChatbotType;
  asignaturaId?: number | null;
  miniproyectoId?: number | string | null;
  title?: string;
  subtitle?: string;
  contextLabel?: string;
}

function toOptionalPositiveId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

interface ChatMessage {
  text: string;
  isBot: boolean;
}

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

function buildWelcomeMessage(chatbotType: ChatbotType, chatbotName?: string | null, contextLabel?: string, unavailable?: boolean) {
  if (unavailable) {
    return chatbotType === 'MINIPROYECTO'
      ? 'No hay un chatbot activo configurado para este miniproyecto.'
      : 'No hay un chatbot activo disponible para este taller.';
  }

  if (chatbotType === 'MINIPROYECTO') {
    return chatbotName
      ? `${chatbotName} configurado como cliente simulado para ${contextLabel || 'este miniproyecto'}.`
      : `Asistente configurado para ${contextLabel || 'este miniproyecto'}.`;
  }

  return chatbotName
    ? `${chatbotName} disponible para consultas del taller.`
    : 'Asistente disponible para consultas del taller.';
}

export function MiniproyectoChatbotPanel({
  chatbotType = 'MINIPROYECTO',
  asignaturaId = null,
  miniproyectoId = null,
  title = 'Cliente del Proyecto',
  subtitle = 'Chatbot gestionado por el administrador',
  contextLabel,
}: MiniproyectoChatbotPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [resolvedChatbot, setResolvedChatbot] = useState<ResolvedChatbot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: buildWelcomeMessage(chatbotType, null, contextLabel), isBot: true },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const resolveChatbot = async () => {
      if (!localStorage.getItem('authToken')) { setIsResolving(false); return; }

      const parsedAsignaturaId = toOptionalPositiveId(asignaturaId);
      const parsedMiniproyectoId = toOptionalPositiveId(miniproyectoId);
      const cacheKey = getChatbotResolveKey(chatbotType, parsedAsignaturaId, parsedMiniproyectoId);

      const cached = getCachedChatbot(cacheKey);
      if (cached.found) {
        setResolvedChatbot(cached.value);
        setMessages([{ text: buildWelcomeMessage(chatbotType, cached.value?.nombre, contextLabel, !cached.value), isBot: true }]);
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('tipo', chatbotType);
        searchParams.set('allow_fallback', 'false');
        if (parsedAsignaturaId !== undefined)
          searchParams.set('asignatura_id', String(parsedAsignaturaId));
        if (chatbotType === 'MINIPROYECTO' && parsedMiniproyectoId !== undefined)
          searchParams.set('miniproyecto_id', String(parsedMiniproyectoId));

        const response = await fetch(`${API_BASE_URL}/chatbots/resolve?${searchParams.toString()}`, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) throw new Error(response.status === 404 ? 'not_found' : 'resolve_failed');

        const data: ResolvedChatbot = await response.json();
        setCachedChatbot(cacheKey, data);
        if (cancelled) return;
        setResolvedChatbot(data);
        setMessages([{ text: buildWelcomeMessage(chatbotType, data?.nombre, contextLabel), isBot: true }]);
      } catch {
        setCachedChatbot(cacheKey, null);
        if (cancelled) return;
        setResolvedChatbot(null);
        setMessages([{ text: buildWelcomeMessage(chatbotType, null, contextLabel, true), isBot: true }]);
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };

    void resolveChatbot();

    return () => {
      cancelled = true;
    };
  }, [chatbotType, asignaturaId, miniproyectoId, contextLabel]);

  async function handleSend() {
    if (!inputValue.trim() || isLoading || !resolvedChatbot?.id) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { text: userMessage, isBot: false }, { text: '', isBot: true }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      let receivedFirstChunk = false;
      const timeoutId = window.setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);

      const payloadasignaturaId = (chatbotType === 'GENERAL' || chatbotType === 'MINIPROYECTO')
        ? toOptionalPositiveId(asignaturaId)
        : undefined;
      const response = await fetch(`${API_BASE_URL}/chatbots/${resolvedChatbot.id}/chat/stream`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        signal: controller.signal,
        body: JSON.stringify({
          question: userMessage,
          topK: 3,
          tipo: chatbotType,
          asignatura_id: payloadasignaturaId,
          miniproyecto_id: chatbotType === 'MINIPROYECTO'
            ? toOptionalPositiveId(miniproyectoId)
            : undefined,
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
        setMessages((prev) => replaceLastBotMessage(prev, 'Respuesta no disponible.'));
      }
    } catch (error) {
      setMessages((prev) => replaceLastBotMessage(
        prev,
        error instanceof Error && (error.name === 'AbortError' || error.message === 'timeout')
          ? 'Tiempo de espera agotado en la respuesta del chatbot.'
          : 'Error de conexión con el chatbot del miniproyecto.'
      ));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
      <div className="bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-blue-100">{subtitle}</p>
            {resolvedChatbot?.fallback ? (
              <p className="text-xs text-blue-100/90 mt-1">Usando chatbot general como respaldo.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="h-[760px] overflow-y-auto bg-[#F7FAFC] p-5 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.isBot ? 'bg-white border border-gray-200 text-gray-800' : 'bg-[#4A90E2] text-white'}`}>
              {message.isBot ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessForMarkdown(String(message.text || ''))}</ReactMarkdown>
              ) : (
                message.text || (message.isBot && isLoading ? '...' : '')
              )}
            </div>
          </div>
        ))}

        {isResolving ? (
          <div className="text-sm text-gray-500">Resolviendo chatbot del miniproyecto...</div>
        ) : null}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSend();
              }
            }}
            disabled={isLoading || isResolving || !resolvedChatbot?.id}
            placeholder={resolvedChatbot?.id ? 'Registrar mensaje para el cliente del proyecto...' : 'No hay chatbot disponible para este miniproyecto'}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] disabled:bg-gray-100"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || isResolving || !resolvedChatbot?.id || !inputValue.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4A90E2] px-5 py-3 text-white hover:bg-[#3A7ED1] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}