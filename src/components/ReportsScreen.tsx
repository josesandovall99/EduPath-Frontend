import { useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Filter, X, User, Calendar, Activity, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, Award } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ReportsScreenProps {
  onBack: () => void;
}

// Tipos de datos
interface StudentProgress {
  id: string;
  name: string;
  email: string;
  createdDate: string;
  subjects: {
    name: string;
    color: string;
    progress: number;
    contentViewed: number;
    exercisesCompleted: number;
    miniprojectsSubmitted: number;
    topics: {
      name: string;
      progress: number;
      subtopics: { name: string; progress: number; }[];
    }[];
  }[];
}

interface Filters {
  contentType: string;
  area: string;
  status: string;
  topic: string;
  student: string;
}

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'date' | 'activity'>('student');
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    contentType: 'all',
    area: 'all',
    status: 'all',
    topic: 'all',
    student: 'all'
  });

  // Datos mock de estudiantes
  const studentsData: StudentProgress[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@universidad.edu',
      createdDate: '2025-09-15',
      subjects: [
        {
          name: 'Fundamentos de Programación',
          color: '#4A90E2',
          progress: 85,
          contentViewed: 24,
          exercisesCompleted: 18,
          miniprojectsSubmitted: 3,
          topics: [
            { 
              name: 'Introducción a Python', 
              progress: 100,
              subtopics: [
                { name: 'Variables y tipos de datos', progress: 100 },
                { name: 'Estructuras de control', progress: 100 }
              ]
            },
            { 
              name: 'Estructuras de datos', 
              progress: 75,
              subtopics: [
                { name: 'Listas y tuplas', progress: 100 },
                { name: 'Diccionarios', progress: 50 }
              ]
            }
          ]
        },
        {
          name: 'Análisis de Sistemas',
          color: '#7ED6A7',
          progress: 70,
          contentViewed: 18,
          exercisesCompleted: 12,
          miniprojectsSubmitted: 2,
          topics: [
            { 
              name: 'Requerimientos', 
              progress: 80,
              subtopics: [
                { name: 'Requerimientos funcionales', progress: 100 },
                { name: 'Requerimientos no funcionales', progress: 60 }
              ]
            }
          ]
        },
        {
          name: 'Alcance, Tiempo y Costo',
          color: '#F5A97F',
          progress: 65,
          contentViewed: 15,
          exercisesCompleted: 10,
          miniprojectsSubmitted: 1,
          topics: [
            { 
              name: 'Gestión de Alcance', 
              progress: 90,
              subtopics: [
                { name: 'Definición del alcance', progress: 100 },
                { name: 'WBS', progress: 80 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria.garcia@universidad.edu',
      createdDate: '2025-09-15',
      subjects: [
        {
          name: 'Fundamentos de Programación',
          color: '#4A90E2',
          progress: 92,
          contentViewed: 28,
          exercisesCompleted: 22,
          miniprojectsSubmitted: 4,
          topics: [
            { 
              name: 'Introducción a Python', 
              progress: 100,
              subtopics: [
                { name: 'Variables y tipos de datos', progress: 100 },
                { name: 'Estructuras de control', progress: 100 }
              ]
            },
            { 
              name: 'Estructuras de datos', 
              progress: 90,
              subtopics: [
                { name: 'Listas y tuplas', progress: 100 },
                { name: 'Diccionarios', progress: 80 }
              ]
            }
          ]
        },
        {
          name: 'Análisis de Sistemas',
          color: '#7ED6A7',
          progress: 88,
          contentViewed: 22,
          exercisesCompleted: 18,
          miniprojectsSubmitted: 3,
          topics: [
            { 
              name: 'Requerimientos', 
              progress: 95,
              subtopics: [
                { name: 'Requerimientos funcionales', progress: 100 },
                { name: 'Requerimientos no funcionales', progress: 90 }
              ]
            }
          ]
        },
        {
          name: 'Alcance, Tiempo y Costo',
          color: '#F5A97F',
          progress: 84,
          contentViewed: 20,
          exercisesCompleted: 15,
          miniprojectsSubmitted: 2,
          topics: [
            { 
              name: 'Gestión de Alcance', 
              progress: 100,
              subtopics: [
                { name: 'Definición del alcance', progress: 100 },
                { name: 'WBS', progress: 100 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: '3',
      name: 'Carlos López',
      email: 'carlos.lopez@universidad.edu',
      createdDate: '2025-10-20',
      subjects: [
        {
          name: 'Fundamentos de Programación',
          color: '#4A90E2',
          progress: 58,
          contentViewed: 16,
          exercisesCompleted: 10,
          miniprojectsSubmitted: 1,
          topics: [
            { 
              name: 'Introducción a Python', 
              progress: 80,
              subtopics: [
                { name: 'Variables y tipos de datos', progress: 100 },
                { name: 'Estructuras de control', progress: 60 }
              ]
            },
            { 
              name: 'Estructuras de datos', 
              progress: 40,
              subtopics: [
                { name: 'Listas y tuplas', progress: 60 },
                { name: 'Diccionarios', progress: 20 }
              ]
            }
          ]
        },
        {
          name: 'Análisis de Sistemas',
          color: '#7ED6A7',
          progress: 45,
          contentViewed: 12,
          exercisesCompleted: 6,
          miniprojectsSubmitted: 1,
          topics: [
            { 
              name: 'Requerimientos', 
              progress: 50,
              subtopics: [
                { name: 'Requerimientos funcionales', progress: 70 },
                { name: 'Requerimientos no funcionales', progress: 30 }
              ]
            }
          ]
        },
        {
          name: 'Alcance, Tiempo y Costo',
          color: '#F5A97F',
          progress: 38,
          contentViewed: 10,
          exercisesCompleted: 5,
          miniprojectsSubmitted: 0,
          topics: [
            { 
              name: 'Gestión de Alcance', 
              progress: 60,
              subtopics: [
                { name: 'Definición del alcance', progress: 80 },
                { name: 'WBS', progress: 40 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: '4',
      name: 'Ana Martínez',
      email: 'ana.martinez@universidad.edu',
      createdDate: '2025-10-20',
      subjects: [
        {
          name: 'Fundamentos de Programación',
          color: '#4A90E2',
          progress: 42,
          contentViewed: 12,
          exercisesCompleted: 8,
          miniprojectsSubmitted: 0,
          topics: [
            { 
              name: 'Introducción a Python', 
              progress: 70,
              subtopics: [
                { name: 'Variables y tipos de datos', progress: 100 },
                { name: 'Estructuras de control', progress: 40 }
              ]
            },
            { 
              name: 'Estructuras de datos', 
              progress: 20,
              subtopics: [
                { name: 'Listas y tuplas', progress: 40 },
                { name: 'Diccionarios', progress: 0 }
              ]
            }
          ]
        },
        {
          name: 'Análisis de Sistemas',
          color: '#7ED6A7',
          progress: 52,
          contentViewed: 14,
          exercisesCompleted: 8,
          miniprojectsSubmitted: 1,
          topics: [
            { 
              name: 'Requerimientos', 
              progress: 60,
              subtopics: [
                { name: 'Requerimientos funcionales', progress: 80 },
                { name: 'Requerimientos no funcionales', progress: 40 }
              ]
            }
          ]
        },
        {
          name: 'Alcance, Tiempo y Costo',
          color: '#F5A97F',
          progress: 48,
          contentViewed: 13,
          exercisesCompleted: 7,
          miniprojectsSubmitted: 1,
          topics: [
            { 
              name: 'Gestión de Alcance', 
              progress: 70,
              subtopics: [
                { name: 'Definición del alcance', progress: 90 },
                { name: 'WBS', progress: 50 }
              ]
            }
          ]
        }
      ]
    }
  ];

  const clearFilters = () => {
    setFilters({
      contentType: 'all',
      area: 'all',
      status: 'all',
      topic: 'all',
      student: 'all'
    });
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    alert(`Exportando informe en formato ${format.toUpperCase()}...`);
  };

  // Calcular datos agrupados por fecha de creación
  const getDataByDate = () => {
    const grouped: { [key: string]: StudentProgress[] } = {};
    studentsData.forEach(student => {
      if (!grouped[student.createdDate]) {
        grouped[student.createdDate] = [];
      }
      grouped[student.createdDate].push(student);
    });

    return Object.entries(grouped).map(([date, students]) => {
      const avgProgress = students.reduce((sum, s) => {
        const totalProgress = s.subjects.reduce((acc, subj) => acc + subj.progress, 0);
        return sum + (totalProgress / s.subjects.length);
      }, 0) / students.length;

      return {
        date,
        avgProgress: Math.round(avgProgress),
        studentCount: students.length,
        students
      };
    });
  };

  // Datos para gráfica de actividades
  const getActivityData = () => {
    const activities = [
      { name: 'Contenidos Visualizados', value: 0 },
      { name: 'Ejercicios Completados', value: 0 },
      { name: 'Miniproyectos Entregados', value: 0 }
    ];

    studentsData.forEach(student => {
      student.subjects.forEach(subject => {
        activities[0].value += subject.contentViewed;
        activities[1].value += subject.exercisesCompleted;
        activities[2].value += subject.miniprojectsSubmitted;
      });
    });

    return activities;
  };

  // Datos para gráfica de progreso por materia
  const getSubjectProgressData = () => {
    const subjects = ['Fundamentos de Programación', 'Análisis de Sistemas', 'Alcance, Tiempo y Costo'];
    return subjects.map((subjectName, index) => {
      const colors = ['#4A90E2', '#7ED6A7', '#F5A97F'];
      const avgProgress = studentsData.reduce((sum, student) => {
        const subject = student.subjects.find(s => s.name === subjectName);
        return sum + (subject?.progress || 0);
      }, 0) / studentsData.length;

      return {
        name: subjectName,
        progress: Math.round(avgProgress),
        color: colors[index]
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Generación de Informes Académicos</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[#7ED6A7] text-[#7ED6A7] rounded-lg hover:bg-[#7ED6A7] hover:text-white transition-all duration-300"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Excel</span>
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F] text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                <span>Exportar PDF</span>
              </button>
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

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'student'
                  ? 'bg-[#4A90E2] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Progreso por Estudiante</span>
            </button>
            <button
              onClick={() => setActiveTab('date')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'date'
                  ? 'bg-[#7ED6A7] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Progreso por Fecha de Creación</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#F5A97F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Desempeño por Actividad</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#3A4A5B]" />
                <h3 className="text-[#3A4A5B]">Filtros Avanzados</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Tipo de Contenido</label>
                <select 
                  value={filters.contentType}
                  onChange={(e) => setFilters({...filters, contentType: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="content">Contenido</option>
                  <option value="exercise">Ejercicio</option>
                  <option value="miniproject">Miniproyecto</option>
                </select>
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Área</label>
                <select 
                  value={filters.area}
                  onChange={(e) => setFilters({...filters, area: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todas las áreas</option>
                  <option value="programming">Fundamentos de Programación</option>
                  <option value="analysis">Análisis de Sistemas</option>
                  <option value="management">Alcance, Tiempo y Costo</option>
                </select>
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Estado de Avance</label>
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos</option>
                  <option value="completed">Completado</option>
                  <option value="in-progress">En Progreso</option>
                  <option value="not-started">No Iniciado</option>
                </select>
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Tema</label>
                <select 
                  value={filters.topic}
                  onChange={(e) => setFilters({...filters, topic: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos los temas</option>
                  <option value="python">Introducción a Python</option>
                  <option value="data-structures">Estructuras de datos</option>
                  <option value="requirements">Requerimientos</option>
                  <option value="scope">Gestión de Alcance</option>
                </select>
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Estudiante</label>
                <select 
                  value={filters.student}
                  onChange={(e) => setFilters({...filters, student: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos los estudiantes</option>
                  {studentsData.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={clearFilters}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm"
              >
                Limpiar Filtros
              </button>
              <button className="px-5 py-2.5 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-lg hover:shadow-lg transition-all text-sm">
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {!showFilters && (
          <button
            onClick={() => setShowFilters(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-[#3A4A5B]"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Mostrar Filtros</span>
          </button>
        )}

        {/* Content by Tab */}
        {activeTab === 'student' && (
          <div className="space-y-6">
            {/* Resumen Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Estudiantes</span>
                  <User className="w-5 h-5 text-[#4A90E2]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">{studentsData.length}</div>
                <div className="text-xs text-gray-500">Activos en el sistema</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Progreso Promedio</span>
                  <TrendingUp className="w-5 h-5 text-[#7ED6A7]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
                  {Math.round(studentsData.reduce((sum, s) => {
                    const avg = s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length;
                    return sum + avg;
                  }, 0) / studentsData.length)}%
                </div>
                <div className="text-xs text-gray-500">En todas las materias</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Estudiantes al Día</span>
                  <CheckCircle2 className="w-5 h-5 text-[#7ED6A7]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
                  {studentsData.filter(s => {
                    const avg = s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length;
                    return avg >= 70;
                  }).length}
                </div>
                <div className="text-xs text-gray-500">≥ 70% de progreso</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Estudiantes Rezagados</span>
                  <AlertCircle className="w-5 h-5 text-[#F5A97F]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
                  {studentsData.filter(s => {
                    const avg = s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length;
                    return avg < 50;
                  }).length}
                </div>
                <div className="text-xs text-gray-500">{'<'} 50% de progreso</div>
              </div>
            </div>

            {/* Tabla detallada por estudiante */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED]">
                <h3 className="text-white text-lg">Progreso Detallado por Estudiante</h3>
                <p className="text-white/90 text-sm mt-1">Avance en áreas, temas y actividades</p>
              </div>
              
              <div className="p-6">
                {studentsData.map((student) => (
                  <div key={student.id} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-[#3A4A5B]">{student.name}</h4>
                          <p className="text-gray-500 text-sm">{student.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#3A4A5B] mb-1">
                          {Math.round(student.subjects.reduce((acc, s) => acc + s.progress, 0) / student.subjects.length)}%
                        </div>
                        <div className="text-xs text-gray-500">Progreso general</div>
                      </div>
                    </div>

                    {/* Estadísticas por materia */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {student.subjects.map((subject) => (
                        <div 
                          key={subject.name}
                          className="border-2 rounded-xl p-4"
                          style={{ borderColor: subject.color + '40' }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span className="text-[#3A4A5B] text-sm">{subject.name}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">Progreso</span>
                                <span className="text-sm text-[#3A4A5B]">{subject.progress}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${subject.progress}%`,
                                    backgroundColor: subject.color
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.contentViewed}</div>
                                <div className="text-xs text-gray-500">Contenidos</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.exercisesCompleted}</div>
                                <div className="text-xs text-gray-500">Ejercicios</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.miniprojectsSubmitted}</div>
                                <div className="text-xs text-gray-500">Proyectos</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Detalle de temas y subtemas */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-[#3A4A5B] text-sm mb-3">Detalle por Tema y Subtema</h5>
                      <div className="space-y-3">
                        {student.subjects.map((subject) => (
                          <div key={subject.name}>
                            {subject.topics.map((topic) => (
                              <div key={topic.name} className="mb-3 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-[#3A4A5B]">{topic.name}</span>
                                  <span className="text-sm text-gray-600">{topic.progress}%</span>
                                </div>
                                <div className="pl-4 space-y-1">
                                  {topic.subtopics.map((subtopic) => (
                                    <div key={subtopic.name} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">• {subtopic.name}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full rounded-full"
                                            style={{ 
                                              width: `${subtopic.progress}%`,
                                              backgroundColor: subject.color
                                            }}
                                          />
                                        </div>
                                        <span className="text-gray-500 w-8">{subtopic.progress}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'date' && (
          <div className="space-y-6">
            {/* Resumen por fecha */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7ED6A7]" />
                  Progreso Promedio por Cohorte
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getDataByDate()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="avgProgress" fill="#7ED6A7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#7ED6A7]" />
                  Distribución de Estudiantes
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getDataByDate()}
                      dataKey="studentCount"
                      nameKey="date"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.date}: ${entry.studentCount}`}
                    >
                      {getDataByDate().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#7ED6A7', '#4A90E2', '#F5A97F'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla por cohorte */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#7ED6A7] to-[#8FE0B7]">
                <h3 className="text-white text-lg">Análisis por Fecha de Creación</h3>
                <p className="text-white/90 text-sm mt-1">Comparación de cohortes y estudiantes rezagados</p>
              </div>
              
              <div className="p-6">
                {getDataByDate().map((dateGroup) => (
                  <div key={dateGroup.date} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-[#3A4A5B] text-lg">Cohorte: {dateGroup.date}</h4>
                        <p className="text-gray-500 text-sm">{dateGroup.studentCount} estudiantes</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#3A4A5B] mb-1">{dateGroup.avgProgress}%</div>
                        <div className="text-xs text-gray-500">Promedio de avance</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Fundamentos</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Análisis</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Alcance</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Promedio</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dateGroup.students.map((student) => {
                            const avgProgress = Math.round(student.subjects.reduce((acc, s) => acc + s.progress, 0) / student.subjects.length);
                            const isLagging = avgProgress < 50;
                            
                            return (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#7ED6A7] to-[#8FE0B7] rounded-full flex items-center justify-center text-white text-xs">
                                      {student.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-[#3A4A5B] text-sm">{student.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${student.subjects[0].progress}%`,
                                          backgroundColor: '#4A90E2'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{student.subjects[0].progress}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${student.subjects[1].progress}%`,
                                          backgroundColor: '#7ED6A7'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{student.subjects[1].progress}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${student.subjects[2].progress}%`,
                                          backgroundColor: '#F5A97F'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{student.subjects[2].progress}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[#3A4A5B]">{avgProgress}%</span>
                                </td>
                                <td className="px-4 py-3">
                                  {isLagging ? (
                                    <span className="flex items-center gap-1 text-[#F5A97F] text-sm">
                                      <XCircle className="w-4 h-4" />
                                      Rezagado
                                    </span>
                                  ) : avgProgress >= 70 ? (
                                    <span className="flex items-center gap-1 text-[#7ED6A7] text-sm">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Al día
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                                      <Clock className="w-4 h-4" />
                                      Regular
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Resumen de actividades */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#4A90E2]/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#4A90E2]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Contenidos Visualizados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {Math.round(studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0) / studentsData.length)} por estudiante
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#7ED6A7]/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-[#7ED6A7]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Ejercicios Completados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {Math.round(studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0) / studentsData.length)} por estudiante
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#F5A97F]/10 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-[#F5A97F]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Miniproyectos Entregados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {Math.round(studentsData.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0) / studentsData.length)} por estudiante
                </div>
              </div>
            </div>

            {/* Gráficas de actividades */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F5A97F]" />
                  Distribución de Actividades
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getActivityData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.value}`}
                    >
                      <Cell fill="#4A90E2" />
                      <Cell fill="#7ED6A7" />
                      <Cell fill="#F5A97F" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#F5A97F]" />
                  Progreso por Materia
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getSubjectProgressData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="progress" radius={[8, 8, 0, 0]}>
                      {getSubjectProgressData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla detallada de actividades por materia */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F]">
                <h3 className="text-white text-lg">Desempeño Detallado por Actividad</h3>
                <p className="text-white/90 text-sm mt-1">Análisis de completitud y calificaciones</p>
              </div>
              
              <div className="p-6">
                {['Fundamentos de Programación', 'Análisis de Sistemas', 'Alcance, Tiempo y Costo'].map((subjectName, index) => {
                  const colors = ['#4A90E2', '#7ED6A7', '#F5A97F'];
                  const color = colors[index];
                  
                  const totalContent = studentsData.reduce((sum, s) => {
                    const subject = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subject?.contentViewed || 0);
                  }, 0);
                  
                  const totalExercises = studentsData.reduce((sum, s) => {
                    const subject = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subject?.exercisesCompleted || 0);
                  }, 0);
                  
                  const totalProjects = studentsData.reduce((sum, s) => {
                    const subject = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subject?.miniprojectsSubmitted || 0);
                  }, 0);

                  const avgProgress = Math.round(studentsData.reduce((sum, s) => {
                    const subject = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subject?.progress || 0);
                  }, 0) / studentsData.length);

                  return (
                    <div key={subjectName} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <h4 className="text-[#3A4A5B] text-lg">{subjectName}</h4>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Progreso Promedio</div>
                          <div className="flex items-center gap-2">
                            <div className="text-2xl text-[#3A4A5B]">{avgProgress}%</div>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${avgProgress}%`,
                                  backgroundColor: color
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Contenidos Visualizados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalContent}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(totalContent / studentsData.length)} por estudiante
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Ejercicios Completados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalExercises}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(totalExercises / studentsData.length)} por estudiante
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Miniproyectos Entregados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalProjects}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(totalProjects / studentsData.length)} por estudiante
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Contenidos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Progreso</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Calificación Est.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {studentsData.map((student) => {
                              const subject = student.subjects.find(s => s.name === subjectName);
                              if (!subject) return null;
                              
                              const estimatedGrade = (subject.progress / 100 * 5).toFixed(1);

                              return (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-[#3A4A5B] text-sm">{student.name}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.contentViewed}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.exercisesCompleted}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.miniprojectsSubmitted}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full rounded-full"
                                          style={{ 
                                            width: `${subject.progress}%`,
                                            backgroundColor: color
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm text-gray-600">{subject.progress}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span 
                                      className="px-3 py-1 rounded-full text-sm"
                                      style={{
                                        backgroundColor: `${color}20`,
                                        color: color
                                      }}
                                    >
                                      {estimatedGrade}/5.0
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estadísticas de tiempo */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#F5A97F]" />
                Tiempo Promedio de Resolución
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#4A90E2]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Ejercicios de Programación</div>
                  <div className="text-3xl text-[#4A90E2] mb-1">25 min</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por ejercicio</div>
                </div>
                <div className="bg-[#7ED6A7]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Actividades Teóricas</div>
                  <div className="text-3xl text-[#7ED6A7] mb-1">15 min</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por actividad</div>
                </div>
                <div className="bg-[#F5A97F]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Miniproyectos</div>
                  <div className="text-3xl text-[#F5A97F] mb-1">3.5 hrs</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por proyecto</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
