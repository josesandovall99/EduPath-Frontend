import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, ClipboardList, Clock, GitBranch, LogOut, MapPinned, Users } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { ExerciseManagementScreen } from './ExerciseManagementScreen';
import { MiniproyectoManagementScreen } from './MiniproyectoManagementScreen';
import { ReportsScreen } from './ReportsScreen';

interface DocenteDashboardProps {
  onLogout: () => void;
  onManageArea: () => void;
  docente?: {
    id?: number;
    personaId?: number;
    nombre?: string;
    email?: string;
    especialidad?: string;
    areaId?: number;
    areaNombre?: string;
  } | null;
}

type DashboardStats = {
  assignedAreas: number;
  areaTemas: number;
  areaSubtemas: number;
};

type AreaSummary = {
  id: number;
  nombre?: string;
  estado?: boolean;
};

type TemaSummary = {
  id: number;
  area_id?: number;
  estado?: boolean;
};

type SubtemaSummary = {
  id: number;
  tema_id?: number;
  estado?: boolean;
};

const EMPTY_STATS: DashboardStats = {
  assignedAreas: 0,
  areaTemas: 0,
  areaSubtemas: 0,
};

const isActiveFlag = (value: unknown) => value !== false;

export function DocenteDashboard({ onLogout, onManageArea, docente }: DocenteDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'ejercicios' | 'miniproyectos' | 'reports'>('dashboard');
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (currentScreen !== 'dashboard') {
      return;
    }

    let isCancelled = false;

    const loadDashboardStats = async () => {
      setIsLoadingStats(true);
      try {
        const authToken = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(docente?.id ? { 'x-docente-id': String(docente.id) } : {}),
          ...(docente?.personaId ? { 'x-persona-id': String(docente.personaId) } : {}),
        };

        const parseJson = async (response: Response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        };

        const areasResponse = await fetch(`${API_BASE_URL}/areas/mis-areas`, {
          headers,
          credentials: 'include'
        });

        const rawAreas = await parseJson(areasResponse);
        const activeAreas = Array.isArray(rawAreas)
          ? rawAreas.filter((area: AreaSummary) => Number.isFinite(Number(area?.id)) && isActiveFlag(area?.estado))
          : [];

        const temasResponse = await fetch(`${API_BASE_URL}/temas`, {
          headers,
          credentials: 'include'
        });
        const rawTemas = await parseJson(temasResponse);

        const allowedAreaIds = new Set(activeAreas.map((area: AreaSummary) => Number(area.id)));
        const activeTemas = Array.isArray(rawTemas)
          ? rawTemas.filter((tema: TemaSummary) => allowedAreaIds.has(Number(tema?.area_id)) && isActiveFlag(tema?.estado))
          : [];

        const subtemasByTema = await Promise.all(
          activeTemas.map(async (tema: TemaSummary) => {
            const temaAreaId = Number(tema.area_id);
            const subtemasResponse = await fetch(`${API_BASE_URL}/subtemas/por-tema/${tema.id}`, {
              headers: {
                ...headers,
                ...(Number.isFinite(temaAreaId) ? { 'x-area-id': String(temaAreaId) } : {})
              },
              credentials: 'include'
            });

            const rawSubtemas = await parseJson(subtemasResponse);
            return Array.isArray(rawSubtemas)
              ? rawSubtemas.filter((subtema: SubtemaSummary) => isActiveFlag(subtema?.estado))
              : [];
          })
        );

        if (isCancelled) {
          return;
        }

        setStatsData({
          assignedAreas: activeAreas.length,
          areaTemas: activeTemas.length,
          areaSubtemas: subtemasByTema.reduce((total, subtemas) => total + subtemas.length, 0),
        });
      } catch (error) {
        console.error('No se pudieron cargar las estadísticas del dashboard docente:', error);
        if (!isCancelled) {
          setStatsData(EMPTY_STATS);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingStats(false);
        }
      }
    };

    loadDashboardStats();

    return () => {
      isCancelled = true;
    };
  }, [currentScreen, docente?.id, docente?.personaId]);

  const stats = [
    {
      label: 'Áreas asignadas',
      value: String(statsData.assignedAreas),
      icon: MapPinned,
      color: '#4A90E2',
      trend: isLoadingStats ? 'Cargando' : 'En BD'
    },
    {
      label: 'Temas de sus áreas',
      value: String(statsData.areaTemas),
      icon: GitBranch,
      color: '#7ED6A7',
      trend: isLoadingStats ? 'Cargando' : 'En BD'
    },
    {
      label: 'Subtemas de sus áreas',
      value: String(statsData.areaSubtemas),
      icon: ClipboardList,
      color: '#F5A97F',
      trend: isLoadingStats ? 'Cargando' : 'En BD'
    },
    {
      label: 'Perfil docente',
      value: docente?.nombre ? 'Activo' : '-',
      icon: Users,
      color: '#A78BFA',
      trend: 'Sesión'
    }
  ];

  const actions = [
    {
      id: 'area',
      title: 'Gestión de Área',
      description: 'Administra el área asignada y sus contenidos disponibles.',
      icon: MapPinned,
      color: '#4A90E2',
      gradient: 'from-[#4A90E2] to-[#5B9FED]',
      onClick: onManageArea
    },
    {
      id: 'ejercicios',
      title: 'Gestión de Ejercicios',
      description: 'Crear y editar ejercicios asociados a contenidos específicos.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      onClick: () => setCurrentScreen('ejercicios')
    },
    {
      id: 'miniproyectos',
      title: 'Gestión de Miniproyectos',
      description: 'Selecciona y edita miniproyectos existentes y su actividad asociada.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      onClick: () => setCurrentScreen('miniproyectos')
    },
    {
      id: 'reports',
      title: 'Informes de Materia',
      description: 'Consulta progreso por estudiante y reporte de fallos de tu materia asignada.',
      icon: ClipboardList,
      color: '#F5A97F',
      gradient: 'from-[#F5A97F] to-[#F7B98F]',
      onClick: () => setCurrentScreen('reports')
    }
  ];

  if (currentScreen === 'ejercicios') {
    return (
      <ExerciseManagementScreen
        onBack={() => setCurrentScreen('dashboard')}
      />
    );
  }

  if (currentScreen === 'miniproyectos') {
    return (
      <MiniproyectoManagementScreen
        onBack={() => setCurrentScreen('dashboard')}
        mode="docente"
        docenteId={docente?.id}
        docentePersonaId={docente?.personaId}
        docenteAreaId={docente?.areaId}
      />
    );
  }

  if (currentScreen === 'reports') {
    return (
      <ReportsScreen
        onBack={() => setCurrentScreen('dashboard')}
        mode="docente"
        docenteId={docente?.id}
        docentePersonaId={docente?.personaId}
        docenteAreaId={docente?.areaId}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#7ED6A7] rounded-xl flex items-center justify-center p-2 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Panel de Docente</h1>
                <p className="text-gray-500 text-sm">Sistema de Gestión Académica - EduPath</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[#3A4A5B]">{docente?.nombre || 'Docente'}</p>
                <p className="text-gray-500 text-sm">{docente?.especialidad || 'Especialidad no definida'}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#F5A97F] to-[#F7B98F] rounded-full flex items-center justify-center text-white shadow-md">
                <span className="text-xl">D</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {stat.trend}
                  </span>
                </div>
                <div className="text-3xl mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <p className="text-gray-600 text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`} style={{ backgroundColor: action.color }}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#4A90E2] transition-colors" />
                </div>
                <h2 className="text-[#3A4A5B] mb-2 text-xl group-hover:text-[#4A90E2] transition-colors">
                  {action.title}
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-md">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-[#3A4A5B] text-xl">Actividad Reciente</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#4A90E2]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Área asignada: {docente?.areaNombre || 'Por confirmar'}.</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500 text-sm">Actualización reciente</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Gestión de subtemas disponible desde tu panel.</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500 text-sm">Hace unos minutos</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-[#0EA5E9]" />
              </div>
              <div className="flex-1">
                <p className="text-[#3A4A5B]">Módulos de ejercicios y miniproyectos listos para gestionar.</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500 text-sm">Estado del sistema</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
