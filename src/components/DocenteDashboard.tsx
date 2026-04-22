import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, Bot, ClipboardList, FileEdit, GitBranch, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { ExerciseManagementScreen } from './ExerciseManagementScreen';
import { MiniproyectoManagementScreen } from './MiniproyectoManagementScreen';
import { ReportsScreen } from './ReportsScreen';
import { DocenteChatbotManagementScreen } from './DocenteChatbotManagementScreen';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { ChatbotButton } from './ChatbotButton';

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

type DashboardStat = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  deferToLoad?: boolean;
};

type DashboardAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  group: 'workflow' | 'support';
  badge: string;
  tone: 'blue' | 'green' | 'amber' | 'slate';
  onClick: () => void;
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
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'ejercicios' | 'miniproyectos' | 'chatbot' | 'reports'>('dashboard');
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

  const actions: DashboardAction[] = [
    {
      id: 'area',
      title: 'Gestión de Área',
      description: 'Administra el área asignada y sus contenidos disponibles.',
      icon: MapPinned,
      color: '#4A90E2',
      gradient: 'from-[#4A90E2] to-[#5B9FED]',
      group: 'workflow',
      badge: 'Ruta base',
      tone: 'blue',
      onClick: onManageArea
    },
    {
      id: 'ejercicios',
      title: 'Gestión de Ejercicios',
      description: 'Creación y edición de ejercicios asociados a contenidos.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      group: 'workflow',
      badge: 'Complemento',
      tone: 'blue',
      onClick: () => setCurrentScreen('ejercicios')
    },
    {
      id: 'miniproyectos',
      title: 'Gestión de Miniproyectos',
      description: 'Administración de miniproyectos y actividades relacionadas.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      group: 'workflow',
      badge: 'Complemento',
      tone: 'green',
      onClick: () => setCurrentScreen('miniproyectos')
    },
    {
      id: 'chatbot',
      title: 'Gestión del Chatbot',
      description: 'Administración del asistente educativo vinculado al área y a los miniproyectos disponibles.',
      icon: Bot,
      color: '#6366F1',
      gradient: 'from-[#6366F1] to-[#818CF8]',
      group: 'support',
      badge: 'Soporte',
      tone: 'slate',
      onClick: () => setCurrentScreen('chatbot')
    },
    {
      id: 'reports',
      title: 'Generación de Informes',
      description: 'Consulta del progreso por estudiante y del estado operativo del área asignada.',
      icon: BarChart3,
      color: '#F5A97F',
      gradient: 'from-[#F5A97F] to-[#F7B98F]',
      group: 'support',
      badge: 'Seguimiento',
      tone: 'amber',
      onClick: () => setCurrentScreen('reports')
    }
  ];

  const stats: DashboardStat[] = [
    {
      label: 'Áreas asignadas',
      value: statsData.assignedAreas,
      icon: BookOpen,
      color: '#4A90E2',
      deferToLoad: true
    },
    {
      label: 'Temas de sus áreas',
      value: statsData.areaTemas,
      icon: FileEdit,
      color: '#7ED6A7',
      deferToLoad: true
    },
    {
      label: 'Subtemas de sus áreas',
      value: statsData.areaSubtemas,
      icon: ClipboardList,
      color: '#F5A97F',
      deferToLoad: true
    },
    {
      label: 'Módulos del panel',
      value: actions.length,
      icon: BarChart3,
      color: '#8B5CF6'
    }
  ];

  const academicActions = actions.filter((action) => action.group === 'workflow');
  const supportActions = actions.filter((action) => action.group === 'support');
  const hasAssignedArea = Boolean(docente?.areaId || docente?.areaNombre);
  const docenteAreaLabel = docente?.areaNombre || 'Área asignada';

  const renderActionCard = (action: DashboardAction) => {
    const Icon = action.icon;

    return (
      <button
        key={action.id}
        type="button"
        onClick={action.onClick}
        className="app-list-card group border-transparent text-left"
      >
        <div className="app-list-card__head">
          <div
            className={`app-list-card__icon bg-gradient-to-br ${action.gradient} shadow-md`}
            style={{ backgroundColor: action.color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <span className={`app-badge app-badge--${action.tone}`}>{action.badge}</span>
        </div>
        <div>
          <div className="app-list-card__title">{action.title}</div>
          <div className="app-list-card__description mt-2">{action.description}</div>
        </div>
        <div className="app-list-card__footer">
          <span className="app-list-card__meta">
            {action.group === 'workflow' ? 'Ruta principal' : 'Soporte operativo'}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb]">
            Abrir
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </button>
    );
  };

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

  if (currentScreen === 'chatbot') {
    return (
      <DocenteChatbotManagementScreen
        onBack={() => setCurrentScreen('dashboard')}
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
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Panel docente</h1>
                <p className="text-gray-500 text-sm">Acceso a los módulos del rol docente.</p>
              </div>
            </div>

            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p>{docente?.nombre || 'Docente'}</p>
                <p>{docente?.especialidad || 'Especialidad no definida'}</p>
              </div>
              <div className="app-user-avatar">
                <span className="text-xl">D</span>
              </div>
              <button onClick={onLogout} className="app-btn app-btn-ghost">
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-section-head mb-6">
          <div>
            <h2 className="app-section-title">Módulos del docente</h2>
            <p className="app-section-description">Panel principal con acceso al área asignada, actividades, chatbot e informes.</p>
          </div>
        </div>

        <AdminFlowGuide
          eyebrow="Ruta docente"
          title="Orden de trabajo del área asignada"
          description={hasAssignedArea
            ? `Acceso a la gestión del área ${docenteAreaLabel}, sus actividades y el seguimiento operativo.`
            : 'Acceso a la gestión del área asignada, actividades y seguimiento del trabajo docente.'}
          breadcrumbs={[
            { label: 'Panel docente' },
            { label: hasAssignedArea ? docenteAreaLabel : 'Sin área asignada', current: true }
          ]}
          steps={[
            {
              label: 'Área asignada',
              helper: hasAssignedArea ? 'Base académica disponible para organizar el trabajo.' : 'Pendiente de asignación institucional.',
              status: hasAssignedArea ? 'complete' : 'current'
            },
            {
              label: 'Temas y subtemas',
              helper: 'Estructura del contenido disponible dentro del área.',
              status: hasAssignedArea ? 'current' : 'upcoming'
            },
            {
              label: 'Ejercicios y miniproyectos',
              helper: 'Actividades aplicadas sobre los contenidos habilitados.',
              status: hasAssignedArea ? 'upcoming' : 'upcoming'
            },
            {
              label: 'Informes y acompañamiento',
              helper: 'Seguimiento académico y soporte educativo del área.',
              status: hasAssignedArea ? 'upcoming' : 'upcoming'
            }
          ]}
        />

        <div className="app-metric-grid mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="app-metric-card">
                <div className="app-metric-icon" style={{ backgroundColor: `${stat.color}16`, color: stat.color }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="app-metric-value" style={{ color: stat.color }}>
                    {stat.deferToLoad && isLoadingStats ? '...' : stat.value}
                  </div>
                  <p className="app-metric-label">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Gestión académica</h3>
              <p className="app-section-description">Módulos para administrar el área asignada, ejercicios y miniproyectos.</p>
            </div>
          </div>

          <div className="app-card-grid">
            {academicActions.map(renderActionCard)}
          </div>
        </section>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Seguimiento y soporte</h3>
              <p className="app-section-description">Herramientas para informes académicos y acompañamiento del área.</p>
            </div>
          </div>

          <div className="app-card-grid">
            {supportActions.map(renderActionCard)}
          </div>
        </section>
      </main>

      <ChatbotButton
        chatbotType="GENERAL_DOCENTE"
        areaId={docente?.areaId}
        contextLabel={docenteAreaLabel}
      />
    </div>
  );
}
