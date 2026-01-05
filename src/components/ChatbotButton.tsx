import { useState } from 'react';
import { X, Send, Minimize2, MessageCircle } from 'lucide-react';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isBot: boolean }>>([
    { text: '¡Hola! Soy tu asistente educativo. ¿En qué puedo ayudarte hoy?', isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;

    setMessages(prev => [...prev, { text: inputValue, isBot: false }]);
    
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          text: 'Entiendo tu pregunta. Puedo ayudarte con ejercicios, explicar conceptos o resolver dudas sobre los temas del curso.',
          isBot: true 
        }
      ]);
    }, 1000);

    setInputValue('');
  };

  // Botón flotante
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#7ED6A7",
          border: "none",
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 4px 12px rgba(126, 214, 167, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(126, 214, 167, 0.6)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(126, 214, 167, 0.4)";
        }}
      >
        <MessageCircle size={28} color="white" />
      </button>
    );
  }

  // Chat abierto/minimizado
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: isMinimized ? "380px" : "380px",
        height: isMinimized ? "60px" : "520px",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        zIndex: 9999,
        background: "white",
        display: "flex",
        flexDirection: "column",
        transition: "height 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#7ED6A7",
          color: "white",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
          Asistente Educativo
        </h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            <Minimize2 size={18} />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Content (solo si no está minimizado) */}
      {!isMinimized && (
        <iframe
          src="https://zenoembed.textcortex.com/?embed_id=emb_01kc7hagpqe7h85qxfy3800thr"
          style={{
            flex: 1,
            border: "none",
            borderRadius: "0 0 12px 12px",
          }}
        ></iframe>
      )}
    </div>
  );
}
