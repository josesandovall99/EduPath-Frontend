import { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, MessageCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { text: '¡Hola! Soy tu asistente PathBot. ¿Qué dato deseas consultar?', isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          topK: 3
        })
      });

      if (!response.ok) throw new Error('Error en la comunicación');

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, {
          text: data.answer || "No pude obtener respuesta.",
          isBot: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          text: "No pude procesar tu pregunta.",
          isBot: true
        }]);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        text: "Error de conexión con el chatbot. Verifica que el servidor esté activo.",
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed", bottom: "20px", right: "20px",
          width: "60px", height: "60px", borderRadius: "50%",
          backgroundColor: "#7ED6A7", border: "none", cursor: "pointer",
          zIndex: 9999, boxShadow: "0 4px 12px rgba(126, 214, 167, 0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <MessageCircle size={28} color="white" />
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
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Asistente EduPath</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><Minimize2 size={18} /></button>
          <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={18} /></button>
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
                {msg.text}
              </div>
            ))}
            {isLoading && <div style={{ alignSelf: "flex-start", color: "#999", fontSize: "12px" }}>Escribiendo...</div>}
          </div>

          {/* Input Area */}
          <div style={{ padding: "15px", borderTop: "1px solid #eee", display: "flex", gap: "10px" }}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta algo..."
              style={{ flex: 1, border: "1px solid #ddd", borderRadius: "20px", padding: "8px 15px", outline: "none" }}
            />
            <button onClick={handleSend} disabled={isLoading} style={{ background: "#7ED6A7", border: "none", borderRadius: "50%", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}