import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Check, Save } from 'lucide-react';


interface AIWorkshopViewProps {
  subjectName: string;
  workshop: {
    id: string;
    title: string;
    isMiniproyecto?: boolean;
    actividadId?: number;
  };
  onBack: () => void;
  estudianteId?: number;
}


// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

const workshopConfigs = {
  analysis: {
    description: (
      <>
        En este taller interactuarás con un cliente simulado por IA que te 
        presentará un proyecto real. Tu objetivo es realizar el análisis de 
        requisitos completo del sistema.
      </>
    ),
    tasks: [
      'Identificar stakeholders del proyecto',
      'Recopilar requisitos funcionales',
      'Definir requisitos no funcionales',
      'Crear casos de uso principales',
      'Validar requisitos con el cliente'
    ],
    iframeSrc: 'https://zenoembed.textcortex.com/?embed_id=emb_01kg7mwvbgfw2r9tjcat0get0c'
  },
  management: {
    description: (
      <>
        En este taller interactuarás con un cliente simulado por IA. Tu objetivo 
        es determinar el alcance, crear un cronograma y estimar los costos del 
        proyecto propuesto.
      </>
    ),
    tasks: [
      'Definir alcance del proyecto',
      'Identificar entregables principales',
      'Crear cronograma del proyecto',
      'Estimar costos y recursos',
      'Presentar propuesta al cliente'
    ],
    iframeSrc: 'https://zenoembed.textcortex.com/?embed_id=emb_01kg7w1f7aep7axvz2r0wjw6jm'
  }
};

const API_BASE_URL = '/api';

export function AIWorkshopView({ subjectName, workshop, onBack, estudianteId }: AIWorkshopViewProps) {
  const [currentTask, setCurrentTask] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const totalTasks = 5;
  const subjectColor = subjectColors[subjectName] || '#4A90E2';
  const isManagementWorkshop = workshop.actividadId === 13 || subjectName === 'Alcance, Tiempo y Costo';
  const workshopConfig = isManagementWorkshop ? workshopConfigs.management : workshopConfigs.analysis;

  const resolveEstudianteId = () => {
    if (estudianteId) return estudianteId;
    const stored = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    return stored ? parseInt(stored, 10) : null;
  };

  const handlePersistProgress = async (estado: 'ENVIADO' | 'COMPLETADO') => {
    if (!workshop.isMiniproyecto) return;
    const esId = resolveEstudianteId();
    const miniId = parseInt(workshop.id, 10);
    if (!esId || isNaN(miniId)) {
      setSaveMessage('No se pudo identificar estudiante o miniproyecto.');
      return;
    }

    const respuesta = JSON.stringify({
      mensajes: [],
      tareaActual: currentTask,
      totalTareas: totalTasks
    });

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/respuestas-miniproyecto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respuesta,
          estudiante_id: esId,
          miniproyecto_id: miniId,
          estado
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.mensaje || 'Error al guardar el progreso');
      }

      setSaveMessage(estado === 'COMPLETADO' ? 'Miniproyecto completado.' : 'Progreso guardado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el progreso';
      setSaveMessage(message);
    } finally {
      setIsSaving(false);
    }
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
            {workshopConfig.description}
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
            {workshopConfig.tasks.map((task, index) => (
              <TaskItem
                key={task}
                number={index + 1}
                text={task}
                completed={index === 0}
                active={index === 1}
                subjectColor={subjectColor}
              />
            ))}
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

        {/* Chat */}
        <div className="flex-1 overflow-y-auto bg-[#F2F2F2] p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <iframe
                src={workshopConfig.iframeSrc}
                width="100%"
                height="760"
                frameBorder={0}
                title="Chatbot cliente"
              />
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
              <button
                onClick={() => handlePersistProgress('ENVIADO')}
                disabled={isSaving || !workshop.isMiniproyecto}
                className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Guardar progreso
              </button>
              <button 
                onClick={() => handlePersistProgress('COMPLETADO')}
                disabled={isSaving || !workshop.isMiniproyecto}
                className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: subjectColor }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Completar tarea
              </button>
            </div>
          </div>
          {saveMessage && (
            <div className="mt-3 px-4 text-sm text-gray-600">
              {saveMessage}
            </div>
          )}
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