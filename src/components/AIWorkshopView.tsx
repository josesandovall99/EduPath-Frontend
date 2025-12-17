import { useState } from 'react';
import { ArrowLeft, Send, MessageSquare, CheckCircle2, Circle, Lightbulb, FileText, Check, Save, Bot } from 'lucide-react';


interface AIWorkshopViewProps {
  subjectName: string;
  workshop: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'student';
  text: string;
  timestamp: string;
}

// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

export function AIWorkshopView({ subjectName, workshop, onBack }: AIWorkshopViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: '¡Hola! Soy el representante de TechCorp. Necesitamos desarrollar un sistema de gestión para nuestra empresa. ¿Podrías ayudarnos a analizar los requisitos?',
      timestamp: '10:00'
    },
    {
      id: '2',
      sender: 'ai',
      text: 'Necesitamos llevar control de nuestros proyectos, empleados y clientes. ¿Qué información necesitas de mí para empezar?',
      timestamp: '10:01'
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [currentTask, setCurrentTask] = useState(1);
  const totalTasks = 5;
  const subjectColor = subjectColors[subjectName] || '#4A90E2';

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'student',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Excelente pregunta. Déjame darte más detalles sobre ese aspecto...',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      {/* Left Panel - Tasks & Guidelines */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        {/* Header */}
        <div 
          className="text-white p-4 border-b border-gray-200"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <h2 className="text-sm">Taller Evaluativo</h2>
          <p className="text-xs text-white/80 mt-1">{workshop.title}</p>
        </div>

        {/* Workshop Info */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-[#3A4A5B] mb-3">Descripción del Taller</h3>
          <p className="text-gray-700 text-sm mb-4">
            {subjectName === 'Análisis de Sistemas' ? (
              <>
                En este taller interactuarás con un cliente simulado por IA que te 
                presentará un proyecto real. Tu objetivo es realizar el análisis de 
                requisitos completo del sistema.
              </>
            ) : (
              <>
                En este taller interactuarás con un cliente simulado por IA. Tu objetivo 
                es determinar el alcance, crear un cronograma y estimar los costos del 
                proyecto propuesto.
              </>
            )}
          </p>
          
          {/* Progress */}
          <div 
            className="border-2 p-4 rounded-xl"
            style={{ 
              backgroundColor: `${subjectColor}10`,
              borderColor: `${subjectColor}40`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Progreso</span>
              <span className="text-sm" style={{ color: subjectColor }}>{currentTask}/{totalTasks} tareas</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(currentTask / totalTasks) * 100}%`,
                  backgroundColor: subjectColor
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tasks Checklist */}
        <div className="p-6">
          <h3 className="text-[#3A4A5B] mb-4">Tareas a Completar</h3>
          <div className="space-y-3">
            {subjectName === 'Análisis de Sistemas' ? (
              <>
                <TaskItem 
                  number={1} 
                  text="Identificar stakeholders del proyecto"
                  completed={true}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={2} 
                  text="Recopilar requisitos funcionales"
                  completed={false}
                  active={true}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={3} 
                  text="Definir requisitos no funcionales"
                  completed={false}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={4} 
                  text="Crear casos de uso principales"
                  completed={false}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={5} 
                  text="Validar requisitos con el cliente"
                  completed={false}
                  subjectColor={subjectColor}
                />
              </>
            ) : (
              <>
                <TaskItem 
                  number={1} 
                  text="Definir alcance del proyecto"
                  completed={true}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={2} 
                  text="Identificar entregables principales"
                  completed={false}
                  active={true}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={3} 
                  text="Crear cronograma del proyecto"
                  completed={false}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={4} 
                  text="Estimar costos y recursos"
                  completed={false}
                  subjectColor={subjectColor}
                />
                <TaskItem 
                  number={5} 
                  text="Presentar propuesta al cliente"
                  completed={false}
                  subjectColor={subjectColor}
                />
              </>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-[#3A4A5B] mb-3 text-sm">Consejos</h4>
            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <Lightbulb className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Haz preguntas específicas al cliente para obtener información clara</span>
              </div>
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <FileText className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Documenta todas las respuestas importantes</span>
              </div>
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <Check className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Verifica tu comprensión repitiendo lo entendido</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                  <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="EduPath" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-[#3A4A5B]">{subjectName}</h1>
                  <p className="text-gray-500 text-sm">Conversación con el Cliente (IA)</p>
                </div>
              </div>
              
              {/* Client Info */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[#3A4A5B] text-sm">Cliente: TechCorp</div>
                  <div className="flex items-center gap-1 justify-end" style={{ color: subjectColor }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }}></div>
                    <span className="text-xs">En línea</span>
                  </div>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center p-2 shadow-md"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="AI" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-[#F2F2F2] p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-2xl ${message.sender === 'student' ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-start gap-3">
                    {message.sender === 'ai' && (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center p-2 flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: `${subjectColor}20` }}
                      >
                        <img src={'https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3'} alt="AI" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div 
                        className="p-4 rounded-2xl shadow-sm border"
                        style={{
                          borderColor: message.sender === 'ai' ? '#E5E7EB' : subjectColor,
                          backgroundColor: message.sender === 'ai' ? 'white' : `${subjectColor}15`
                        }}
                      >
                        <p className="text-gray-800 text-sm">{message.text}</p>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 px-2">
                        {message.timestamp}
                      </div>
                    </div>
                    {message.sender === 'student' && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs">TÚ</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator placeholder */}
            <div className="text-gray-400 text-sm italic pl-14">
              {/* El cliente está escribiendo... */}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu pregunta o respuesta al cliente..."
                className="flex-1 border-2 border-gray-300 rounded-xl p-4 bg-white outline-none focus:border-[#4A90E2] resize-none transition-colors"
                rows={3}
              />
              <button
                onClick={handleSendMessage}
                className="px-8 rounded-xl text-white self-end shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                style={{ backgroundColor: subjectColor }}
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
            
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
              <Lightbulb className="w-4 h-4" />
              <span>Tip: Presiona Enter para enviar, Shift+Enter para nueva línea</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between px-4">
            <div className="text-gray-600 text-sm">
              Tarea actual: <span style={{ color: subjectColor }}>{currentTask} de {totalTasks}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm transition-all flex items-center gap-2">
                <Save className="w-4 h-4" />
                Guardar progreso
              </button>
              <button 
                className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                style={{ backgroundColor: subjectColor }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Completar tarea
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  number: number;
  text: string;
  completed?: boolean;
  active?: boolean;
  subjectColor: string;
}

function TaskItem({ number, text, completed, active, subjectColor }: TaskItemProps) {
  return (
    <div 
      className="flex items-start gap-3 p-3 border-2 rounded-xl transition-all"
      style={{
        borderColor: active ? subjectColor : completed ? '#7ED6A7' : '#E5E7EB',
        backgroundColor: active ? `${subjectColor}10` : completed ? '#7ED6A710' : 'white'
      }}
    >
      <div 
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs shadow-sm"
        style={{ 
          borderColor: completed ? '#7ED6A7' : active ? subjectColor : '#D1D5DB',
          backgroundColor: completed ? '#7ED6A7' : active ? subjectColor : 'white',
          color: completed || active ? 'white' : '#9CA3AF'
        }}
      >
        {completed ? <Check className="w-3 h-3" /> : number}
      </div>
      <span className={`text-sm ${ 
        completed ? 'text-gray-500 line-through' :
        active ? 'text-[#3A4A5B]' :
        'text-gray-600'
      }`}>
        {text}
      </span>
    </div>
  );
}