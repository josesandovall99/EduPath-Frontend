import { useState, useEffect, useRef } from 'react';
import { X, Send, Minimize2, MessageCircle } from 'lucide-react';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { text: '¡Hola! Soy tu asistente experto en RUT. ¿Qué dato deseas consultar?', isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generamos un ID de sesión único que persistirá mientras no se recargue la página
  const [sessionId] = useState(`session-${Math.random().toString(36).substr(2, 9)}`);

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
    // REEMPLAZA ESTA URL con la que te da el nodo "When chat message received"
    // Normalmente es algo como http://localhost:5678/webhook/tu-id-largo
    const response = await fetch('http://localhost:5678/webhook/TU_ID_DEL_CHAT_TRIGGER', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "sendMessage", // Obligatorio para el Chat Trigger
        chatInput: userMessage,
        sessionId: sessionId    // Usa el ID que ya tienes en el estado
      }),
    });

    if (!response.ok) throw new Error('Error en la comunicación');

    const data = await response.json();
    
    // El Chat Trigger responde directamente con un objeto que tiene "output"
    setMessages(prev => [...prev, {
      text: data.output || "No pude obtener respuesta.",
      isBot: true
    }]);

  } catch (error) {
    console.error("Fallo total:", error);
    setMessages(prev => [...prev, {
      text: "Error de conexión. Revisa que n8n esté activo.",
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
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Asistente RUT</h3>
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