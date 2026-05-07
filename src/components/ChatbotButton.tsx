import { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessForMarkdown } from '../utils/markdown';

const CHATBOT_TIMEOUT_MS = 120000;

type ChatbotType = 'GENERAL' | 'GENERAL_ADMINISTRADOR' | 'GENERAL_DOCENTE' | 'MINIPROYECTO';

interface ChatbotButtonProps {
  chatbotType?: ChatbotType;
  asignaturaId?: number | null;
  miniproyectoId?: number | string | null;
  contextLabel?: string;
}

interface ResolvedChatbot {
  id: number;
  nombre: string;
  tipo: ChatbotType;
  fallback?: boolean;
}

function toOptionalPositiveId(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function replaceLastBotMessage(messages: Array<{ text: string; isBot: boolean }>, text: string) {
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
    if (chatbotType === 'MINIPROYECTO') {
      return 'No hay un chatbot activo para este miniproyecto en este momento.';
    }

    if (chatbotType === 'GENERAL_ADMINISTRADOR') {
      return 'No hay un chatbot general de administrador activo en este momento.';
    }

    if (chatbotType === 'GENERAL_DOCENTE') {
      return 'No hay un chatbot general de docente activo en este momento.';
    }

    return 'No hay un chatbot general activo para esta vista en este momento.';
  }

  if (chatbotType === 'MINIPROYECTO') {
    if (chatbotName) {
      return `${chatbotName} disponible para consultas sobre ${contextLabel || 'este miniproyecto'}.`;
    }

    return `Asistente disponible para consultas sobre ${contextLabel || 'este miniproyecto'}.`;
  }

  if (chatbotType === 'GENERAL_ADMINISTRADOR') {
    return chatbotName
      ? `${chatbotName} disponible para consultas del panel administrativo.`
      : 'Asistente disponible para consultas del panel administrativo.';
  }

  if (chatbotType === 'GENERAL_DOCENTE') {
    return chatbotName
      ? `${chatbotName} disponible para consultas del panel docente.`
      : 'Asistente disponible para consultas del panel docente.';
  }

  if (chatbotName) {
    return `${chatbotName} disponible para consultas generales.`;
  }

  return 'Asistente EduPath disponible para consultas.';
}

export function ChatbotButton({ chatbotType = 'GENERAL', asignaturaId = null, miniproyectoId = null, contextLabel }: ChatbotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { text: buildWelcomeMessage(chatbotType, null, contextLabel), isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedChatbot, setResolvedChatbot] = useState<ResolvedChatbot | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const resolveChatbot = async () => {
      setIsResolving(true);
      setResolvedChatbot(null);

      try {
        const searchParams = new URLSearchParams();
        searchParams.set('tipo', chatbotType);
        searchParams.set('allow_fallback', 'false');

        const parsedasignaturaId = toOptionalPositiveId(asignaturaId);
        const shouldSendasignaturaId = chatbotType === 'GENERAL' || chatbotType === 'MINIPROYECTO';
        if (shouldSendasignaturaId && parsedasignaturaId !== undefined) {
          searchParams.set('asignatura_id', String(parsedasignaturaId));
        }

        const parsedMiniproyectoId = toOptionalPositiveId(miniproyectoId);
        if (chatbotType === 'MINIPROYECTO' && parsedMiniproyectoId !== undefined) {
          searchParams.set('miniproyecto_id', String(parsedMiniproyectoId));
        }

        const response = await fetch(`${API_BASE_URL}/chatbots/resolve?${searchParams.toString()}`, {
          headers: buildAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'not_found' : 'resolve_failed');
        }

        const data = await response.json();
        if (cancelled) return;

        setResolvedChatbot(data);
        setMessages([{ text: buildWelcomeMessage(chatbotType, data?.nombre, contextLabel), isBot: true }]);
      } catch (error) {
        if (cancelled) return;

        console.error('Error resolving chatbot:', error);
        setResolvedChatbot(null);
        setMessages([{ text: buildWelcomeMessage(chatbotType, null, contextLabel, true), isBot: true }]);
      } finally {
        if (!cancelled) {
          setIsResolving(false);
        }
      }
    };

    void resolveChatbot();

    return () => {
      cancelled = true;
    };
  }, [chatbotType, asignaturaId, miniproyectoId, contextLabel]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !resolvedChatbot?.id) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }, { text: '', isBot: true }]);
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
        })
      });

      if (!response.ok) {
        window.clearTimeout(timeoutId);
        if (response.status === 504) {
          throw new Error('timeout');
        }

        throw new Error('Error en la comunicación');
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
        setMessages(prev => replaceLastBotMessage(prev, accumulatedText));
      }

      window.clearTimeout(timeoutId);

      if (!accumulatedText.trim()) {
        setMessages(prev => replaceLastBotMessage(prev, 'Respuesta no disponible.'));
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => replaceLastBotMessage(prev,
        error instanceof Error && error.name === 'AbortError'
          ? 'Tiempo de espera agotado en la respuesta del chatbot.'
          : error instanceof Error && error.message === 'timeout'
            ? 'Tiempo de espera agotado en la respuesta del chatbot.'
            : 'Error de conexión con el servicio de chatbot.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir asistente del chatbot"
        title="Abrir asistente"
        style={{
          position: "fixed", bottom: "20px", right: "20px",
          width: "60px", height: "60px", borderRadius: "50%",
          backgroundColor: "#7ED6A7", border: "none", cursor: "pointer",
          zIndex: 9999, boxShadow: "0 4px 12px rgba(126, 214, 167, 0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <MessageCircle size={28} color="white" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", bottom: "20px", right: "20px",
        width: "380px", height: isMinimized ? "60px" : "520px",
        borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999,
        background: "white", display: "flex", flexDirection: "column",
        transition: "height 0.3s ease",
      }}
    >
      {/* Header */}
      <div style={{ backgroundColor: "#7ED6A7", color: "white", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>{resolvedChatbot?.nombre || 'Asistente EduPath'}</h3>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
            {chatbotType === 'MINIPROYECTO'
              ? resolvedChatbot?.fallback
                ? 'Usando chatbot general del asignatura'
                : 'Soporte del miniproyecto'
              : chatbotType === 'GENERAL_ADMINISTRADOR'
                ? resolvedChatbot?.fallback
                  ? 'Usando chatbot general de respaldo'
                  : 'Asistente del administrador'
                : chatbotType === 'GENERAL_DOCENTE'
                  ? resolvedChatbot?.fallback
                    ? 'Usando chatbot general de respaldo'
                    : 'Asistente del docente'
                  : 'Asistente general'}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={isMinimized ? 'Expandir chatbot' : 'Minimizar chatbot'}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
          >
            <Minimize2 size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar chatbot"
            title="Cerrar"
            style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      {!isMinimized && (
        <>
          <div ref={scrollRef} style={{ flex: 1, padding: "15px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", background: "#f9f9f9" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.isBot ? "flex-start" : "flex-end",
                backgroundColor: msg.isBot ? "#eee" : "#7ED6A7",
                color: msg.isBot ? "#333" : "white",
                padding: "10px 14px", borderRadius: "12px", maxWidth: "80%",
                fontSize: "14px", lineHeight: "1.4"
              }}>
                {msg.isBot ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessForMarkdown(String(msg.text || ''))}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {(isLoading || isResolving) && <div style={{ alignSelf: "flex-start", color: "#999", fontSize: "12px" }}>{isResolving ? 'Cargando chatbot...' : 'Escribiendo...'}</div>}
          </div>

          {/* Input Asignatura */}
          <div style={{ padding: "15px", borderTop: "1px solid #eee", display: "flex", gap: "10px" }}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={isResolving || !resolvedChatbot?.id}
              placeholder={resolvedChatbot?.id ? 'Pregunta algo...' : 'No hay chatbot disponible para este contexto'}
              style={{ flex: 1, border: "1px solid #ddd", borderRadius: "20px", padding: "8px 15px", outline: "none", backgroundColor: isResolving || !resolvedChatbot?.id ? '#f3f4f6' : 'white' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || isResolving || !resolvedChatbot?.id}
              aria-label="Enviar mensaje al chatbot"
              title="Enviar"
              style={{ background: "#7ED6A7", border: "none", borderRadius: "50%", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", opacity: isLoading || isResolving || !resolvedChatbot?.id ? 0.5 : 1 }}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// using shared preprocessForMarkdown from utils/markdown