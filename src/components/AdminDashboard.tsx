import { useEffect, useState } from 'react';
import { LogOut, BookOpen, FileEdit, BarChart3, Users, TrendingUp, ClipboardList, Shield, Upload, Bot, ArrowRight } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { ContentManagementScreen } from './ContentManagementScreen';
import { SequenceManagementScreen } from './SequenceManagementScreen';
import { SubtemaSequenceManagementScreen } from './SubtemaSequenceManagementScreen';
import { AreasManagementScreen } from './AreasManagementScreen';
import { TemasManagementScreen } from './TemasManagementScreen';
import { SubThemeManagementScreen } from './SubThemeManagementScreen';
import { MiniproyectoManagementScreen } from './MiniproyectoManagementScreen';
import { ExerciseManagementScreen } from './ExerciseManagementScreen';
import { ChatbotManagementScreen } from './ChatbotManagementScreen';
import { DocenteManagementScreen } from './DocenteManagementScreen';
import { AdminManagementScreen } from './AdminManagementScreen';
import { AdminFlowGuide } from './ui/AdminFlowGuide';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate: (section: 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes') => void;
}

type AdminScreen = 'dashboard' | 'areas' | 'temas' | 'subtema-sequences' | 'contents' | 'content-management' | 'subthemes' | 'miniproyectos' | 'ejercicios' | 'chatbot' | 'docentes' | 'administradores';

type DashboardStats = {
  activeAreas: number;
  activeTemas: number;
  activeEstudiantes: number;
  activeContenidos: number;
};

type DashboardAction = {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  gradient: string;
  group: 'workflow' | 'support';
  badge: string;
  tone: 'blue' | 'green' | 'amber' | 'slate';
  onClick?: () => void;
  navigateSection?: 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes';
};

const EMPTY_STATS: DashboardStats = {
  activeAreas: 0,
  activeTemas: 0,
  activeEstudiantes: 0,
  activeContenidos: 0,
};

const isActiveFlag = (value: unknown) => value !== false;

export function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps) {
  const ADMIN_DASHBOARD_STATE_KEY = 'adminDashboardState';

  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<AdminScreen[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState<string>('');
  const [selectedTemaId, setSelectedTemaId] = useState<number | null>(null);
  const [selectedTemaName, setSelectedTemaName] = useState<string>('');
  const [selectedSubtemaId, setSelectedSubtemaId] = useState<number | null>(null);
  const [selectedSubtemaNombre, setSelectedSubtemaNombre] = useState<string>('');
  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    try {
      const rawState = localStorage.getItem(ADMIN_DASHBOARD_STATE_KEY);
      if (!rawState) {
        return;
      }

      const parsedState = JSON.parse(rawState) as {
        currentScreen?: AdminScreen;
        navigationHistory?: AdminScreen[];
        selectedAreaId?: number | null;
        selectedAreaName?: string;
        selectedTemaId?: number | null;
        selectedTemaName?: string;
        selectedSubtemaId?: number | null;
        selectedSubtemaNombre?: string;
      };

      if (parsedState.currentScreen) setCurrentScreen(parsedState.currentScreen);
      if (Array.isArray(parsedState.navigationHistory)) setNavigationHistory(parsedState.navigationHistory);
      if (parsedState.selectedAreaId !== undefined) setSelectedAreaId(parsedState.selectedAreaId);
      if (parsedState.selectedAreaName !== undefined) setSelectedAreaName(parsedState.selectedAreaName);
      if (parsedState.selectedTemaId !== undefined) setSelectedTemaId(parsedState.selectedTemaId);
      if (parsedState.selectedTemaName !== undefined) setSelectedTemaName(parsedState.selectedTemaName);
      if (parsedState.selectedSubtemaId !== undefined) setSelectedSubtemaId(parsedState.selectedSubtemaId);
      if (parsedState.selectedSubtemaNombre !== undefined) setSelectedSubtemaNombre(parsedState.selectedSubtemaNombre);
    } catch (error) {
      console.error('No se pudo restaurar el estado del panel admin:', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ADMIN_DASHBOARD_STATE_KEY, JSON.stringify({
      currentScreen,
      navigationHistory,
      selectedAreaId,
      selectedAreaName,
      selectedTemaId,
      selectedTemaName,
      selectedSubtemaId,
      selectedSubtemaNombre
    }));
  }, [
    currentScreen,
    navigationHistory,
    selectedAreaId,
    selectedAreaName,
    selectedTemaId,
    selectedTemaName,
    selectedSubtemaId,
    selectedSubtemaNombre
  ]);

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
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        };

        const fetchJsonWithFallback = async (paths: string[]) => {
          let lastError: unknown = null;

          for (const path of paths) {
            try {
              const response = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: 'include' });
              if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} en ${path}`);
                continue;
              }
              return await response.json();
            } catch (error) {
              lastError = error;
            }
          }

          throw lastError || new Error('No se pudo obtener la respuesta del servidor');
        };

        const [areas, temas, estudiantes, contenidos] = await Promise.all([
          fetchJsonWithFallback(['/areas']),
          fetchJsonWithFallback(['/temas']),
          fetchJsonWithFallback(['/estudiante', '/estudiantes']),
          fetchJsonWithFallback(['/contenidos'])
        ]);

        if (isCancelled) {
          return;
        }

        setStatsData({
          activeAreas: Array.isArray(areas) ? areas.filter((area) => isActiveFlag(area?.estado)).length : 0,
          activeTemas: Array.isArray(temas) ? temas.filter((tema) => isActiveFlag(tema?.estado)).length : 0,
          activeEstudiantes: Array.isArray(estudiantes)
            ? estudiantes.filter((estudiante) => isActiveFlag(estudiante?.persona?.estado)).length
            : 0,
          activeContenidos: Array.isArray(contenidos) ? contenidos.filter((contenido) => isActiveFlag(contenido?.estado)).length : 0,
        });
      } catch (error) {
        console.error('No se pudieron cargar las estadísticas del dashboard admin:', error);
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
  }, [currentScreen]);

  const navigateTo = (nextScreen: AdminScreen) => {
    if (nextScreen === currentScreen) {
      return;
    }
    setNavigationHistory((prev) => [...prev, currentScreen]);
    setCurrentScreen(nextScreen);
  };

  const goBack = () => {
    setNavigationHistory((prev) => {
      if (prev.length === 0) {
        setCurrentScreen('dashboard');
        return prev;
      }

      const newHistory = [...prev];
      const previousScreen = newHistory.pop()!;
      setCurrentScreen(previousScreen);
      return newHistory;
    });
  };

  const goHome = () => {
    setNavigationHistory([]);
    setCurrentScreen('dashboard');
  };

  const handleAreaSelect = (areaId: number, areaName: string) => {
    setSelectedAreaId(areaId);
    setSelectedAreaName(areaName);
    setSelectedTemaId(null);
    setSelectedTemaName('');
    setSelectedSubtemaId(null);
    setSelectedSubtemaNombre('');
    navigateTo('temas');
  };

  const handleTemaSelect = (temaId: number, temaName: string, nextScreen: AdminScreen = 'subthemes') => {
    setSelectedTemaId(temaId);
    setSelectedTemaName(temaName);
    setSelectedSubtemaId(null);
    setSelectedSubtemaNombre('');
    navigateTo(nextScreen);
  };

  const handleSubtemaSelect = (subtemaId: number, temaId: number, subtemaNombre: string) => {
    setSelectedTemaId(temaId);
    setSelectedSubtemaId(subtemaId);
    setSelectedSubtemaNombre(subtemaNombre);
    navigateTo('contents');
  };

  const stats = [
    { label: 'Áreas activas', value: statsData.activeAreas, icon: BookOpen, color: '#4A90E2' },
    { label: 'Temas activos', value: statsData.activeTemas, icon: FileEdit, color: '#7ED6A7' },
    { label: 'Estudiantes activos', value: statsData.activeEstudiantes, icon: Users, color: '#F5A97F' },
    { label: 'Contenidos activos', value: statsData.activeContenidos, icon: TrendingUp, color: '#14B8A6' }
  ];

  const actions: DashboardAction[] = [
    {
      id: 'areas',
      title: 'Gestión de Áreas',
      description: 'Registro y organización de áreas académicas.',
      icon: BookOpen,
      color: '#4A90E2',
      gradient: 'from-[#4A90E2] to-[#5B9FED]',
      group: 'workflow',
      badge: 'Paso 1',
      tone: 'blue',
      onClick: () => navigateTo('areas')
    },
    {
      id: 'contents',
      title: 'Catálogo de Contenidos',
      description: 'Administración del catálogo de contenidos, recursos y actividades.',
      icon: TrendingUp,
      color: '#0F766E',
      gradient: 'from-[#0F766E] to-[#14B8A6]',
      group: 'workflow',
      badge: 'Paso final',
      tone: 'green',
      onClick: () => navigateTo('content-management')
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
      onClick: () => navigateTo('ejercicios')
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
      onClick: () => navigateTo('miniproyectos')
    },
    {
      id: 'reports',
      title: 'Generación de Informes',
      description: 'Consulta y exportación de informes de progreso y estado.',
      icon: BarChart3,
      color: '#F5A97F',
      gradient: 'from-[#F5A97F] to-[#F7B98F]',
      group: 'support',
      badge: 'Seguimiento',
      tone: 'amber',
      navigateSection: 'reports'
    },
    {
      id: 'docentes',
      title: 'Gestión de Docentes',
      description: 'Administración de docentes, especialidades y áreas asignadas.',
      icon: Users,
      color: '#14B8A6',
      gradient: 'from-[#14B8A6] to-[#2DD4BF]',
      group: 'support',
      badge: 'Operación',
      tone: 'green',
      onClick: () => navigateTo('docentes')
    },
    {
      id: 'administradores',
      title: 'Gestión de Administradores',
      description: 'Administración de cuentas y credenciales del rol administrador.',
      icon: Shield,
      color: '#2563EB',
      gradient: 'from-[#2563EB] to-[#3B82F6]',
      group: 'support',
      badge: 'Control',
      tone: 'blue',
      onClick: () => navigateTo('administradores')
    },
    {
      id: 'upload',
      title: 'Carga Masiva de Estudiantes',
      description: 'Importación masiva de estudiantes desde archivo Excel.',
      icon: Upload,
      color: '#F472B6',
      gradient: 'from-[#F472B6] to-[#FB87C6]',
      group: 'support',
      badge: 'Operación',
      tone: 'amber',
      navigateSection: 'upload'
    },
    {
      id: 'chatbot',
      title: 'Gestión del Chatbot',
      description: 'Administración de documentos y actualización de la base de conocimiento.',
      icon: Bot,
      color: '#6366F1',
      gradient: 'from-[#6366F1] to-[#818CF8]',
      group: 'support',
      badge: 'Soporte',
      tone: 'slate',
      onClick: () => navigateTo('chatbot')
    }
  ];

  const hasAreaContext = Boolean(selectedAreaId);
  const hasTemaContext = Boolean(selectedTemaId);
  const hasSubtemaContext = Boolean(selectedSubtemaId);
  const currentFlowLabel = hasSubtemaContext ? 'Secuencias y contenidos' : hasTemaContext ? 'Subtemas' : hasAreaContext ? 'Temas' : 'Áreas';
  const academicActions = actions.filter((action) => action.group === 'workflow');
  const supportActions = actions.filter((action) => action.group === 'support');
  const lastNavigationScreen = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;
  const isContentManagementFlowScoped = lastNavigationScreen === 'contents' && (hasAreaContext || hasTemaContext || hasSubtemaContext);

  const openAction = (action: DashboardAction) => {
    if (action.onClick) {
      action.onClick();
      return;
    }

    if (action.navigateSection) {
      onNavigate(action.navigateSection);
    }
  };

  const renderActionCard = (action: DashboardAction) => {
    const Icon = action.icon;

    return (
      <button
        key={action.id}
        onClick={() => openAction(action)}
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

  if (currentScreen === 'subthemes') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={handleAreaSelect}
        />
      );
    }

    if (!selectedTemaId) {
      return (
        <TemasManagementScreen
          areaId={selectedAreaId}
          areaName={selectedAreaName}
          onBack={goBack}
          onHome={goHome}
          onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
        />
      );
    }

    return (
      <SubThemeManagementScreen
        onBack={goBack}
        onHome={goHome}
        initialAreaId={selectedAreaId}
        initialTemaId={selectedTemaId}
        onManageSequences={(nextAreaId, nextAreaName, nextTemaId, nextTemaName) => {
          setSelectedAreaId(nextAreaId);
          setSelectedAreaName(nextAreaName);
          setSelectedTemaId(nextTemaId);
          setSelectedTemaName(nextTemaName);
          setSelectedSubtemaId(null);
          setSelectedSubtemaNombre('');
          navigateTo('subtema-sequences');
        }}
      />
    );
  }

  if (currentScreen === 'areas') {
    return (
      <AreasManagementScreen
        onBack={goBack}
        onHome={goHome}
        onSelectArea={handleAreaSelect}
      />
    );
  }

  if (currentScreen === 'temas') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={handleAreaSelect}
        />
      );
    }

    return (
      <TemasManagementScreen
        areaId={selectedAreaId}
        areaName={selectedAreaName}
        onBack={goBack}
        onHome={goHome}
        onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
      />
    );
  }

  if (currentScreen === 'subtema-sequences') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={handleAreaSelect}
        />
      );
    }

    if (!selectedTemaId) {
      return (
        <TemasManagementScreen
          areaId={selectedAreaId}
          areaName={selectedAreaName}
          onBack={goBack}
          onHome={goHome}
          onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
        />
      );
    }

    return (
      <SubtemaSequenceManagementScreen
        onBack={goBack}
        onHome={goHome}
        onSelectSubtema={handleSubtemaSelect}
        areaId={selectedAreaId || undefined}
        areaName={selectedAreaName}
        temaId={selectedTemaId || undefined}
        temaName={selectedTemaName}
      />
    );
  }

  if (currentScreen === 'miniproyectos') {
    return <MiniproyectoManagementScreen onBack={goBack} />;
  }

  if (currentScreen === 'ejercicios') {
    return <ExerciseManagementScreen onBack={goBack} />;
  }

  if (currentScreen === 'chatbot') {
    return <ChatbotManagementScreen onBack={goBack} />;
  }

  if (currentScreen === 'docentes') {
    return <DocenteManagementScreen onBack={goBack} />;
  }

  if (currentScreen === 'administradores') {
    return <AdminManagementScreen onBack={goBack} />;
  }

  if (currentScreen === 'contents') {
    if (selectedSubtemaId && selectedTemaId) {
      return (
        <SequenceManagementScreen
          onBack={() => {
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            goBack();
          }}
          onHome={goHome}
          onGoToContentManagement={() => {
            navigateTo('content-management');
          }}
          subtemaId={selectedSubtemaId}
          temaId={selectedTemaId}
          areaId={selectedAreaId || undefined}
          areaName={selectedAreaName}
          temaName={selectedTemaName}
          subtemaNombre={selectedSubtemaNombre}
        />
      );
    }

    return (
      <ContentManagementScreen
        onBack={goBack}
        onHome={goHome}
        scopeMode={hasAreaContext || hasTemaContext || hasSubtemaContext ? 'flow' : 'catalog'}
        initialAreaId={selectedAreaId || undefined}
        initialAreaName={selectedAreaName || undefined}
        initialTemaId={selectedTemaId || undefined}
        initialTemaName={selectedTemaName || undefined}
        initialSubtemaId={selectedSubtemaId || undefined}
        initialSubtemaName={selectedSubtemaNombre || undefined}
      />
    );
  }

  if (currentScreen === 'content-management') {
    return (
      <ContentManagementScreen
        onBack={goBack}
        onHome={goHome}
        scopeMode={isContentManagementFlowScoped ? 'flow' : 'catalog'}
        initialAreaId={isContentManagementFlowScoped ? selectedAreaId || undefined : undefined}
        initialAreaName={isContentManagementFlowScoped ? selectedAreaName || undefined : undefined}
        initialTemaId={isContentManagementFlowScoped ? selectedTemaId || undefined : undefined}
        initialTemaName={isContentManagementFlowScoped ? selectedTemaName || undefined : undefined}
        initialSubtemaId={isContentManagementFlowScoped ? selectedSubtemaId || undefined : undefined}
        initialSubtemaName={isContentManagementFlowScoped ? selectedSubtemaNombre || undefined : undefined}
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
                <h1 className="text-[#3A4A5B]">Panel de Administrador</h1>
                <p className="text-gray-500 text-sm">Acceso a los módulos del rol administrador.</p>
              </div>
            </div>

            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p>Admin Usuario</p>
                <p>Coordinador Académico</p>
              </div>
              <div className="app-user-avatar">
                <span className="text-xl">A</span>
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
            <h2 className="app-section-title">Módulos del administrador</h2>
            <p className="app-section-description">Panel principal con acceso a los módulos del rol administrador.</p>
          </div>
        </div>

        <AdminFlowGuide
          eyebrow="Flujo de gestión"
          title="Orden de gestión académica"
          description="Referencia del orden de acceso para áreas, temas, subtemas y secuencias."
          breadcrumbs={[
            { label: 'Panel admin' },
            { label: currentFlowLabel, current: true }
          ]}
          steps={[
            { label: 'Áreas', helper: 'Definición de la estructura base.', status: hasAreaContext ? 'complete' : 'current' },
            { label: 'Temas', helper: 'Organización temática por área.', status: hasTemaContext ? 'complete' : hasAreaContext ? 'current' : 'upcoming' },
            { label: 'Subtemas', helper: 'Detalle de la estructura académica.', status: hasSubtemaContext ? 'complete' : hasTemaContext ? 'current' : 'upcoming' },
            { label: 'Secuencias y contenidos', helper: 'Orden y gestión del contenido final.', status: hasSubtemaContext ? 'current' : 'upcoming' }
          ]}
        />

        <div className="app-metric-grid mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="app-metric-card">
                <div className="app-metric-icon" style={{ backgroundColor: `${stat.color}16`, color: stat.color }}>
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="app-metric-value" style={{ color: stat.color }}>
                    {isLoadingStats ? '...' : stat.value}
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
              <p className="app-section-description">Módulos para áreas, contenidos, ejercicios y miniproyectos.</p>
            </div>
          </div>

          <div className="app-card-grid">
            {academicActions.map(renderActionCard)}
          </div>
        </section>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Administración y soporte</h3>
              <p className="app-section-description">Módulos para usuarios, informes, carga masiva y servicios del sistema.</p>
            </div>
          </div>

          <div className="app-card-grid">
            {supportActions.map(renderActionCard)}
          </div>
        </section>
      </main>
    </div>
  );
}