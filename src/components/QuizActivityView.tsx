import { useState } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, CheckCircle2, Play, FileText, Lightbulb, SkipBack, SkipForward } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { submitExercise } from '../utils/submitExercise';

interface QuizActivityViewProps {
  subjectName: string;
  activity: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

export function QuizActivityView({ subjectName, activity, onBack }: QuizActivityViewProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [expandedModule, setExpandedModule] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [puntos, setPuntos] = useState<number | null>(null);
  
  const subjectColor = subjectColors[subjectName] || '#4A90E2';

  const question = {
    text: '¿Cuáles de los siguientes son desafíos y consideraciones éticas en el aprendizaje automático?',
    options: [
      'Transparencia del modelo',
      'Privacidad de datos',
      'Perfección del resultado',
      'Seguridad de datos'
    ],
    correctAnswer: 1
  };

  const indexToLetter = (idx: number) => ['A', 'B', 'C', 'D', 'E'][idx] || 'A';

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;
    setIsSubmitting(true);
    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      alert('No se encontró el ID del estudiante. Inicia sesión.');
      setIsSubmitting(false);
      return;
    }

    const payload = { respuestas: { p1: indexToLetter(selectedAnswer) } };
    const result = await submitExercise(activity.id, payload, estudianteId!);

    if (result.status === 429) {
      alert(`${result.message || 'Evaluación en curso'}`);
      setIsSubmitting(false);
      return;
    }

    if (result.status === 409) {
      setAprobado(true);
      alert(`${result.message || 'Ejercicio ya aprobado'}`);
      setIsSubmitting(false);
      return;
    }

    if (result.status === 400) {
      const data: any = result.data || {};
      setFeedback(data?.retroalimentacion || 'Respuesta incorrecta. Nuevo intento disponible.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`Incorrecta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      setAprobado(false);
      setIsSubmitting(false);
      return;
    }

    if (result.status === 200) {
      const data: any = result.data || {};
      setAprobado(true);
      setFeedback(data?.retroalimentacion || '¡Correcto!');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      alert(`Correcta${typeof data?.puntosObtenidos === 'number' ? `\n\nPuntos obtenidos: ${data.puntosObtenidos}` : ''}${data?.retroalimentacion ? `\n\nRetroalimentación:\n${data.retroalimentacion}` : ''}`);
      setIsSubmitting(false);
      return;
    }

    alert(`Error del servidor: ${result.message || 'Error desconocido'}`);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        <div 
          className="p-4 border-b border-gray-200 text-white"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm">Módulos del Curso</span>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3">
            <button 
              onClick={() => setExpandedModule(!expandedModule)}
              className="w-full text-left p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shadow-sm"
                  style={{ backgroundColor: subjectColor }}
                >
                  1
                </div>
                <span className="text-sm text-[#3A4A5B]">Fundamentos de la Generativa</span>
              </div>
              {expandedModule ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedModule && (
              <div className="mt-2 ml-4 space-y-1">
                <button 
                  className="w-full text-left p-3 rounded-lg flex items-center gap-3 text-sm transition-all"
                  style={{ 
                    backgroundColor: `${subjectColor}15`,
                    border: `2px solid ${subjectColor}`
                  }}
                >
                  <div 
                    className="w-5 h-5 border-2 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: subjectColor }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }}></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[#3A4A5B]">{activity.title}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <FileText className="w-3 h-3" />
                      <span>15 min</span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-[#3A4A5B]">{subjectName}</h1>
                  <p className="text-gray-500 text-sm">{activity.title}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Pregunta 1 de 10</span>
                  <span className="text-xl" style={{ color: subjectColor }}>10%</span>
                </div>
                <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '10%', backgroundColor: subjectColor }}></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Quiz Content */}
        <div className="flex-1 overflow-y-auto bg-[#F2F2F2] p-8">
          <div className="max-w-3xl mx-auto">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            {/* Question Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 mb-6 shadow-md">
              <div className="mb-6">
                <h2 className="text-[#3A4A5B]">{question.text}</h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    className="w-full text-left p-4 rounded-xl transition-all border-2"
                    style={{
                      borderColor: selectedAnswer === index ? subjectColor : '#E5E7EB',
                      backgroundColor: selectedAnswer === index ? `${subjectColor}15` : 'white'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: selectedAnswer === index ? subjectColor : '#E5E7EB' }}
                      >
                        {selectedAnswer === index && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subjectColor }}></div>
                        )}
                      </div>
                      <span className="text-gray-800">{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null || isSubmitting || aprobado}
                  className="px-8 py-3 rounded-xl text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: (selectedAnswer === null || isSubmitting || aprobado) ? '#9CA3AF' : subjectColor }}
                  title={aprobado ? 'Ejercicio ya aprobado' : 'Enviar respuesta'}
                >
                  {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </div>

              {feedback && (
                <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: subjectColor }}>
                  <div className="text-sm text-gray-700">{feedback}</div>
                  {puntos !== null && <div className="text-sm mt-2" style={{ color: subjectColor }}>Puntos obtenidos: {puntos}</div>}
                </div>
              )}
            </div>

            {/* Help Card */}
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-6 shadow-md">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Lightbulb className="w-5 h-5" style={{ color: subjectColor }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#3A4A5B] mb-2">Ayuda</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Revisión recomendada de cada opción y del material teórico antes del envío de la respuesta.
                  </p>
                  <button 
                    onClick={() => setShowHint(!showHint)}
                    className="border-2 px-4 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                    style={{ borderColor: showHint ? subjectColor : '#E5E7EB' }}
                  >
                    {showHint ? 'Ocultar pista' : 'Mostrar pista'}
                  </button>
                  {showHint && (
                    <div 
                      className="mt-4 p-4 rounded-lg border-2"
                      style={{ 
                        backgroundColor: `${subjectColor}10`,
                        borderColor: subjectColor
                      }}
                    >
                      <p className="text-gray-700 text-sm">
                        Piensa en los aspectos fundamentales de seguridad y transparencia 
                        en el desarrollo de sistemas de IA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-6">
              <button className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-300 py-3 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                <SkipBack className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700">Anterior</span>
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: subjectColor }}
              >
                <span>Siguiente</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}