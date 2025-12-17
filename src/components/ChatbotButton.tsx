import { useState } from 'react';
import { X, Send, Minimize2 } from 'lucide-react';
import robotImage from 'figma:asset/a8ee7cfd19d700913d7e71c907ce6f4bd027fcb9.png';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "380px",
        height: "520px",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        zIndex: 9999,
        background: "white",
      }}
    >
      <iframe
        src="https://zenoembed.textcortex.com/?embed_id=emb_01kc7hagpqe7h85qxfy3800thr"
        width="100%"
        height="100%"
        style={{
          border: "none",
        }}
      ></iframe>
    </div>
  );
}
