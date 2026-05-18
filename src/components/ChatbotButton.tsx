import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Bot } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessForMarkdown } from '../utils/markdown';
import { getChatbotResolveKey, getCachedChatbot, setCachedChatbot } from '../utils/chatbotResolveCache';

const CHATBOT_TIMEOUT_MS = 120000;

type ChatbotType = 'GENERAL' | 'GENERAL_ADMINISTRADOR' | 'GENERAL_DOCENTE' | 'MINIPROYECTO';

interface ResolvedChatbot {
  id: number;
  nombre: string;
  tipo: ChatbotType;
  fallback?: boolean;
}

interface ChatbotButtonProps {
  chatbotType?: ChatbotType;
  asignaturaId?: number | null;
  miniproyectoId?: number | string | null;
  contextLabel?: string;
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
    if (chatbotType === 'MINIPROYECTO') return 'No hay un chatbot activo para este miniproyecto en este momento.';
    if (chatbotType === 'GENERAL_ADMINISTRADOR') return 'No hay un chatbot general de administrador activo en este momento.';
    if (chatbotType === 'GENERAL_DOCENTE') return 'No hay un chatbot general de docente activo en este momento.';
    return 'No hay un chatbot general activo para esta vista en este momento.';
  }
  if (chatbotType === 'MINIPROYECTO') return chatbotName ? `${chatbotName} disponible para consultas sobre ${contextLabel || 'este miniproyecto'}.` : `Asistente disponible para consultas sobre ${contextLabel || 'este miniproyecto'}.`;
  if (chatbotType === 'GENERAL_ADMINISTRADOR') return chatbotName ? `${chatbotName} disponible para consultas del panel administrativo.` : 'Asistente disponible para consultas del panel administrativo.';
  if (chatbotType === 'GENERAL_DOCENTE') return chatbotName ? `${chatbotName} disponible para consultas del panel docente.` : 'Asistente disponible para consultas del panel docente.';
  return chatbotName ? `${chatbotName} disponible para consultas generales.` : 'Asistente EduPath disponible para consultas.';
}

function getSubtitle(chatbotType: ChatbotType, fallback?: boolean) {
  if (chatbotType === 'MINIPROYECTO') return fallback ? 'Chatbot general de respaldo' : 'Soporte del miniproyecto';
  if (chatbotType === 'GENERAL_ADMINISTRADOR') return fallback ? 'Chatbot general de respaldo' : 'Asistente del administrador';
  if (chatbotType === 'GENERAL_DOCENTE') return fallback ? 'Chatbot general de respaldo' : 'Asistente del docente';
  return 'Asistente general';
}

export function ChatbotButton({ chatbotType = 'GENERAL', asignaturaId = null, miniproyectoId = null, contextLabel }: ChatbotButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: buildWelcomeMessage(chatbotType, null, contextLabel), isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedChatbot, setResolvedChatbot] = useState<ResolvedChatbot | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const resolveChatbot = async () => {
      if (!localStorage.getItem('authToken')) { setIsResolving(false); return; }

      const parsedAsignaturaId = toOptionalPositiveId(asignaturaId);
      const parsedMiniproyectoId = toOptionalPositiveId(miniproyectoId);
      const cacheKey = getChatbotResolveKey(chatbotType, parsedAsignaturaId, parsedMiniproyectoId);

      // Si ya tenemos el resultado en caché (incluyendo los 404), lo usamos directamente.
      const cached = getCachedChatbot(cacheKey);
      if (cached.found) {
        setResolvedChatbot(cached.value);
        setMessages([{ text: buildWelcomeMessage(chatbotType, cached.value?.nombre, contextLabel, !cached.value), isBot: true }]);
        setIsResolving(false);
        return;
      }

      setIsResolving(true);
      setResolvedChatbot(null);
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('tipo', chatbotType);
        searchParams.set('allow_fallback', 'false');
        if ((chatbotType === 'GENERAL' || chatbotType === 'MINIPROYECTO') && parsedAsignaturaId !== undefined)
          searchParams.set('asignatura_id', String(parsedAsignaturaId));
        if (chatbotType === 'MINIPROYECTO' && parsedMiniproyectoId !== undefined)
          searchParams.set('miniproyecto_id', String(parsedMiniproyectoId));
        const response = await fetch(`${API_BASE_URL}/chatbots/resolve?${searchParams.toString()}`, { headers: buildAuthHeaders() });
        if (!response.ok) throw new Error(response.status === 404 ? 'not_found' : 'resolve_failed');
        const data: ResolvedChatbot = await response.json();
        setCachedChatbot(cacheKey, data);
        if (cancelled) return;
        setResolvedChatbot(data);
        setMessages([{ text: buildWelcomeMessage(chatbotType, data?.nombre, contextLabel), isBot: true }]);
      } catch {
        setCachedChatbot(cacheKey, null); // cachea el 404 para no repetir
        if (cancelled) return;
        setResolvedChatbot(null);
        setMessages([{ text: buildWelcomeMessage(chatbotType, null, contextLabel, true), isBot: true }]);
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };
    void resolveChatbot();
    return () => { cancelled = true; };
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
      const payloadasignaturaId = (chatbotType === 'GENERAL' || chatbotType === 'MINIPROYECTO') ? toOptionalPositiveId(asignaturaId) : undefined;
      const response = await fetch(`${API_BASE_URL}/chatbots/${resolvedChatbot.id}/chat/stream`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        signal: controller.signal,
        body: JSON.stringify({ question: userMessage, topK: 3, tipo: chatbotType, asignatura_id: payloadasignaturaId, miniproyecto_id: chatbotType === 'MINIPROYECTO' ? toOptionalPositiveId(miniproyectoId) : undefined }),
      });
      if (!response.ok) { window.clearTimeout(timeoutId); throw new Error(response.status === 504 ? 'timeout' : 'Error en la comunicación'); }
      if (!response.body) { window.clearTimeout(timeoutId); throw new Error('Respuesta sin streaming'); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!receivedFirstChunk) { receivedFirstChunk = true; window.clearTimeout(timeoutId); }
        accumulatedText += decoder.decode(value, { stream: true });
        setMessages(prev => replaceLastBotMessage(prev, accumulatedText));
      }
      window.clearTimeout(timeoutId);
      if (!accumulatedText.trim()) setMessages(prev => replaceLastBotMessage(prev, 'Respuesta no disponible.'));
    } catch (error) {
      setMessages(prev => replaceLastBotMessage(prev,
        error instanceof Error && (error.name === 'AbortError' || error.message === 'timeout')
          ? 'Tiempo de espera agotado en la respuesta del chatbot.'
          : 'Error de conexión con el servicio de chatbot.'));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Botón flotante ────────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir asistente"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a56db, #142d61)',
          border: 'none', cursor: 'pointer', zIndex: 9999,
          boxShadow: '0 4px 16px rgba(26,86,219,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MessageCircle size={24} color="white" aria-hidden="true" />
      </button>
    );
  }

  /* ── Panel lateral ─────────────────────────────────────────────── */
  return (
    <>
      {/* Overlay sutil para cerrar haciendo clic fuera */}
      <div
        onClick={() => setIsOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(10,20,50,0.15)' }}
      />

      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '380px', zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          background: '#f0f5ff',
          boxShadow: '-4px 0 24px rgba(26,86,219,0.15)',
          animation: 'slideInRight 0.22s ease',
        }}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>

        {/* Cabecera */}
        <div style={{
          background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {resolvedChatbot?.nombre || 'Asistente EduPath'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {getSubtitle(chatbotType, resolvedChatbot?.fallback)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar asistente"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '6px', display: 'flex', lineHeight: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensajes */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
              maxWidth: '82%',
            }}>
              {msg.isBot && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Bot size={14} color="white" />
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #bfd3f5', borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: '13.5px', lineHeight: '1.55', color: '#1e3a5f' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessForMarkdown(String(msg.text || ''))}</ReactMarkdown>
                  </div>
                </div>
              )}
              {!msg.isBot && (
                <div style={{ background: 'linear-gradient(135deg, #1a56db, #1e429f)', borderRadius: '12px 0 12px 12px', padding: '10px 14px', fontSize: '13.5px', lineHeight: '1.55', color: '#fff', marginLeft: 'auto' }}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          {(isLoading || isResolving) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="white" />
              </div>
              <div style={{ background: '#fff', border: '1px solid #bfd3f5', borderRadius: '0 12px 12px 12px', padding: '10px 14px' }}>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0,1,2].map(d => (
                    <span key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a56db', animation: `bounce 1.2s ${d*0.2}s infinite`, display: 'inline-block' }} />
                  ))}
                </span>
                <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #bfd3f5', background: '#f0f5ff', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={isResolving || !resolvedChatbot?.id}
            placeholder={resolvedChatbot?.id ? 'Escribe tu pregunta...' : 'No hay chatbot disponible'}
            style={{
              flex: 1, border: '1.5px solid #bfd3f5', borderRadius: '24px',
              padding: '10px 16px', outline: 'none', fontSize: '13.5px',
              background: isResolving || !resolvedChatbot?.id ? '#e8eef8' : '#fff',
              color: '#1e3a5f',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading || isResolving || !resolvedChatbot?.id || !inputValue.trim()}
            aria-label="Enviar mensaje"
            style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: isLoading || isResolving || !resolvedChatbot?.id || !inputValue.trim()
                ? '#bfd3f5' : 'linear-gradient(135deg, #1a56db, #142d61)',
              border: 'none', cursor: isLoading || isResolving || !resolvedChatbot?.id ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
          >
            <Send size={16} color="white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
