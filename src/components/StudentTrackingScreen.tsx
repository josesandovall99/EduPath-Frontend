import { useState } from 'react';
import { ArrowLeft, Search, User, TrendingUp, Clock, CheckCircle2, Award } from 'lucide-react';

interface StudentTrackingScreenProps {
  onBack: () => void;
}

interface Student {
  id: string;
  name: string;
  email: string;
  progress: number;
  subjects: {
    name: string;
    progress: number;
    color: string;
  }[];
  totalHours: number;
  completedTopics: number;
}

export function StudentTrackingScreen({ onBack }: StudentTrackingScreenProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const students: Student[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@universidad.edu',
      progress: 75,
      subjects: [
        { name: 'Fundamentos de Programación', progress: 85, color: '#4A90E2' },
        { name: 'Análisis de Sistemas', progress: 70, color: '#7ED6A7' },
        { name: 'Alcance, Tiempo y Costo', progress: 65, color: '#F5A97F' }
      ],
      totalHours: 42,
      completedTopics: 18
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria.garcia@universidad.edu',
      progress: 88,
      subjects: [
        { name: 'Fundamentos de Programación', progress: 92, color: '#4A90E2' },
        { name: 'Análisis de Sistemas', progress: 85, color: '#7ED6A7' },
        { name: 'Alcance, Tiempo y Costo', progress: 87, color: '#F5A97F' }
      ],
      totalHours: 56,
      completedTopics: 24
    },
    {
      id: '3',
      name: 'Carlos López',
      email: 'carlos.lopez@universidad.edu',
      progress: 62,
      subjects: [
        { name: 'Fundamentos de Programación', progress: 65, color: '#4A90E2' },
        { name: 'Análisis de Sistemas', progress: 58, color: '#7ED6A7' },
        { name: 'Alcance, Tiempo y Costo', progress: 63, color: '#F5A97F' }
      ],
      totalHours: 35,
      completedTopics: 14
    }
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={'https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3'} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Seguimiento de Estudiantes</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar estudiante por nombre o correo..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Student List */}
          <div className="col-span-1 space-y-3">
            <h3 className="text-[#3A4A5B] mb-4">Lista de Estudiantes</h3>
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full p-4 rounded-xl transition-all duration-300 text-left ${
                  selectedStudent?.id === student.id
                    ? 'bg-gradient-to-r from-[#A78BFA] to-[#B79BFA] text-white shadow-lg transform scale-105'
                    : 'bg-white hover:shadow-md shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedStudent?.id === student.id ? 'bg-white/20' : 'bg-purple-100'
                  }`}>
                    <User className={`w-5 h-5 ${
                      selectedStudent?.id === student.id ? 'text-white' : 'text-[#A78BFA]'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`${
                      selectedStudent?.id === student.id ? 'text-white' : 'text-[#3A4A5B]'
                    }`}>{student.name}</p>
                    <p className={`text-sm ${
                      selectedStudent?.id === student.id ? 'text-white/80' : 'text-gray-500'
                    }`}>{student.email}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${
                      selectedStudent?.id === student.id ? 'text-white/90' : 'text-gray-600'
                    }`}>Progreso general</span>
                    <span className={`text-xs ${
                      selectedStudent?.id === student.id ? 'text-white' : 'text-[#A78BFA]'
                    }`}>{student.progress}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${
                    selectedStudent?.id === student.id ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    <div 
                      className={`h-full rounded-full ${
                        selectedStudent?.id === student.id ? 'bg-white' : 'bg-[#A78BFA]'
                      }`}
                      style={{ width: `${student.progress}%` }}
                    ></div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Student Detail */}
          <div className="col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Header */}
                <div className="bg-gradient-to-r from-[#A78BFA] to-[#B79BFA] rounded-2xl p-8 text-white shadow-lg">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl mb-1">{selectedStudent.name}</h2>
                      <p className="text-white/90">{selectedStudent.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">Temas completados</span>
                      </div>
                      <p className="text-2xl">{selectedStudent.completedTopics}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm">Horas totales</span>
                      </div>
                      <p className="text-2xl">{selectedStudent.totalHours}h</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5" />
                        <span className="text-sm">Promedio</span>
                      </div>
                      <p className="text-2xl">4.2</p>
                    </div>
                  </div>
                </div>

                {/* Progress by Subject */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-[#3A4A5B] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Progreso por Materia
                  </h3>
                  <div className="space-y-6">
                    {selectedStudent.subjects.map((subject, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#3A4A5B]">{subject.name}</span>
                          <span className="text-lg" style={{ color: subject.color }}>
                            {subject.progress}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${subject.progress}%`,
                              backgroundColor: subject.color
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-[#3A4A5B] mb-4">Actividad Reciente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-[#4A90E2]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#3A4A5B]">Completó "Funciones y Procedimientos"</p>
                        <p className="text-gray-500 text-sm">Fundamentos de Programación • Hace 3 horas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Award className="w-5 h-5 text-[#7ED6A7]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#3A4A5B]">Obtuvo 4.5 en Taller de Análisis</p>
                        <p className="text-gray-500 text-sm">Análisis de Sistemas • Hace 1 día</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-500 text-lg">Selecciona un estudiante</h3>
                <p className="text-gray-400 text-sm">La selección de un estudiante muestra la información detallada del registro.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
