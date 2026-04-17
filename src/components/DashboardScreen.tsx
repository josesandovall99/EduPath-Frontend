import { LogOut, Code, Database, BarChart3, BookOpen, Clock, CheckCircle2, TrendingUp, User } from 'lucide-react';
import { ChatbotButton } from './ChatbotButton';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

interface Subject {
  id: string;
  name: string;
}

interface Area {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface DashboardScreenProps {
  userName?: string; // Nuevo prop opcional
  onSubjectSelect: (subject: Subject) => void;
  onLogout: () => void;
  estudianteId?: number;
}

const colorPalette = ['#4A90E2', '#7ED6A7', '#F5A97F', '#FFB84D', '#A78BFA', '#EC4899'];

// Fallback data por si falla el fetch
const FALLBACK_SUBJECTS = [
  {
    id: '1',
    name: 'Fundamentos de Programación',
    icon: Code,
    color: '#4A90E2',
    progress: 65,
    topics: 12,
    completed: 8,
    nextTopic: 'Funciones y Procedimientos'
  },
  {
    id: '2',
    name: 'Análisis de Sistemas',
    icon: Database,
    color: '#7ED6A7',
    progress: 45,
    topics: 10,
    completed: 4,
    nextTopic: 'Diagramas de Secuencia'
  },
  {
    id: '3',
    name: 'Alcance, Tiempo y Costo',
    icon: BarChart3,
    color: '#F5A97F',
    progress: 30,
    topics: 8,
    completed: 2,
    nextTopic: 'Estimación inicial del proyecto'
  }
];

export function DashboardScreen({ userName, onSubjectSelect, onLogout, estudianteId }: DashboardScreenProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progresosPorArea, setProgresosPorArea] = useState<Map<number, number>>(new Map());
  const [loadingProgresos, setLoadingProgresos] = useState(false);

  // Obtener progreso de una área específica
  const obtenerProgresoArea = async (areaId: number) => {
    if (!estudianteId) {
      console.warn('No hay estudiante_id disponible');
      return 0;
    }

    try {
      const url = `${API_BASE_URL}/progresos/por-area?area_id=${areaId}&estudiante_id=${estudianteId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Error al obtener progreso del área ${areaId}:`, response.status);
        return 0;
      }
      
      const data = await response.json();
      const porcentaje = data.resumen?.porcentajeTotalArea || 0;
      return Math.round(porcentaje);
    } catch (err) {
      console.error(`Error al obtener progreso del área ${areaId}:`, err);
      return 0;
    }
  };

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching areas from:', `${API_BASE_URL}/areas`);

        const response = await fetch(`${API_BASE_URL}/areas`);

        // Validación crítica: verificar si la respuesta es exitosa
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Invalid content type. Expected JSON, got: ${contentType}`);
        }

        const areas = await response.json();
        console.log('Areas loaded successfully:', areas);

        // Transformar áreas a formato de subjects
        const transformedSubjects = areas.map((area: Area, index: number) => ({
          id: area.id.toString(),
          name: area.nombre,
          icon: Code,
          color: colorPalette[index % colorPalette.length],
          progress: 0, // Se cargará dinámicamente después
          topics: Math.floor(Math.random() * 15) + 5,
          completed: Math.floor(Math.random() * 10) + 1,
          nextTopic: 'Próximo tema disponible'
        }));

        setSubjects(transformedSubjects);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error fetching areas:', errorMessage);
        setError(`No se pudieron cargar las áreas: ${errorMessage}`);
        
        // Usar fallback data
        console.log('Using fallback data');
        setSubjects(FALLBACK_SUBJECTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  // Cargar progreso de todas las áreas cuando se carguen
  useEffect(() => {
    if (subjects.length > 0 && estudianteId) {
      setLoadingProgresos(true);
      const cargarProgresos = async () => {
        const nuevosProgresos = new Map<number, number>();
        
        for (const subject of subjects) {
          const areaId = parseInt(subject.id);
          const progreso = await obtenerProgresoArea(areaId);
          nuevosProgresos.set(areaId, progreso);
        }
        
        setProgresosPorArea(nuevosProgresos);
        setLoadingProgresos(false);
      };
      
      cargarProgresos();
    }
  }, [subjects, estudianteId]);

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">EduPath</h1>
                <p className="text-gray-500 text-sm">Panel del Estudiante XD</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[#3A4A5B]">{userName || 'Estudiante'}</p>
                <p className="text-gray-500 text-sm">Ingeniería de Sistemas</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white shadow-md">
                <User className="h-5 w-5" />
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#4A90E2] to-[#7ED6A7] rounded-2xl p-8 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#3A4A5B]">¡Hola, {userName || 'Estudiante'}!</h2>
              <p className="text-white/90 text-lg">Continúa tu aprendizaje donde lo dejaste</p>
            </div>
            <BookOpen className="w-20 h-20 text-white/30" />
          </div>
        </div>

        {/* Subjects Section */}
        <div className="mb-6">
          <h3 className="text-[#3A4A5B] mb-4 text-2xl">Tus Materias</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading && (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">Cargando materias...</p>
            </div>
          )}
          
          {error && (
            <div className="col-span-3 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700 text-sm">{error}</p>
              <p className="text-yellow-600 text-xs mt-2">Se están mostrando datos de prueba.</p>
            </div>
          )}
          
          {!loading && subjects.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">No hay áreas disponibles</p>
            </div>
          ) : (
          subjects.map((subject) => {
            const Icon = subject.icon;
            const areaId = parseInt(subject.id);
            const progresoReal = progresosPorArea.get(areaId) || 0;
            return (
              <button
                key={subject.id}
                onClick={() => onSubjectSelect({ id: subject.id, name: subject.name })}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left group hover:transform hover:scale-[1.02]"
              >
                {/* Icon and Title */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="p-4 rounded-xl shadow-sm group-hover:shadow-md transition-shadow"
                    style={{ backgroundColor: `${subject.color}15` }}
                  >
                    <Icon className="w-8 h-8" style={{ color: subject.color }} />
                  </div>
                  <div className="text-gray-400 group-hover:text-[#4A90E2] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Subject Name */}
                <h4 className="text-[#3A4A5B] mb-3 text-lg group-hover:text-[#4A90E2] transition-colors">
                  {subject.name}
                </h4>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Progreso</span>
                    <span className="text-sm" style={{ color: subject.color }}>
                      {loadingProgresos ? '...' : `${progresoReal}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progresoReal}%`,
                        backgroundColor: subject.color
                      }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <span>{subject.completed} de {subject.topics} temas</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                    {subject.topics - subject.completed} pendientes
                  </span>
                </div>

                {/* Next Topic */}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Siguiente tema:</p>
                  <p className="text-sm text-[#3A4A5B]">{subject.nextTopic}</p>
                </div>
              </button>
            );
          })
          )}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-[#3A4A5B] mb-4 text-xl">Actividad Reciente</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#7ED6A7]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Completaste "Variables y Tipos de Datos"</p>
                <p className="text-gray-500 text-sm">Fundamentos de Programación • Hace 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#4A90E2]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Nuevo contenido disponible en Análisis de Sistemas</p>
                <p className="text-gray-500 text-sm">Diagramas UML • Hace 5 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#F5A97F]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Taller pendiente: Gestión del Alcance</p>
                <p className="text-gray-500 text-sm">Alcance, Tiempo y Costo • Vence en 3 días</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ChatbotButton contextLabel="panel del estudiante" />
    </div>
  );
}