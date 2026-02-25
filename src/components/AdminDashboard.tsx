import { useEffect, useState } from 'react';
import { LogOut, BookOpen, FileEdit, BarChart3, Users, TrendingUp, Clock, GitBranch, ClipboardList, Shield } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ContentManagementScreen } from './ContentManagementScreen';
import { SequenceManagementScreen } from './SequenceManagementScreen';
import { SubtemaSequenceManagementScreen } from './SubtemaSequenceManagementScreen';
import { AreasManagementScreen } from './AreasManagementScreen';
import { TemasManagementScreen } from './TemasManagementScreen';
import { SubThemeManagementScreen } from './SubThemeManagementScreen';
import { MiniproyectoManagementScreen } from './MiniproyectoManagementScreen';
import { ExerciseManagementScreen } from './ExerciseManagementScreen';
import { Upload } from "lucide-react";
import { ChatbotManagementScreen } from './ChatbotManagementScreen';
import { Bot } from 'lucide-react';
import { DocenteManagementScreen } from './DocenteManagementScreen';
import { AdminManagementScreen } from './AdminManagementScreen';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate: (section: 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes') => void;
}

type AdminScreen = 'dashboard' | 'areas' | 'temas' | 'subtema-sequences' | 'contents' | 'content-management' | 'subthemes' | 'miniproyectos' | 'ejercicios' | 'chatbot' | 'docentes' | 'administradores';

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
  const stats = [
    { label: 'Materias activas', value: '3', icon: BookOpen, color: '#4A90E2', trend: '+0%' },
    { label: 'Temas disponibles', value: '12', icon: FileEdit, color: '#7ED6A7', trend: '+2' },
    { label: 'Estudiantes activos', value: '45', icon: Users, color: '#F5A97F', trend: '+5' },
    { label: 'Contenidos publicados', value: '87', icon: TrendingUp, color: '#A78BFA', trend: '+12' }
  ];

  const actions = [
    {
      id: 'areas',
      title: 'Gestión de Áreas',
      description: 'Crear, editar y eliminar áreas académicas. Define el nombre y la descripción del área.',
      icon: BookOpen,
      color: '#4A90E2',
      gradient: 'from-[#4A90E2] to-[#5B9FED]',
      onClick: () => navigateTo('areas')
    },
    {
      id: 'contents',
      title: 'Gestión de Contenidos',
      description: 'Crea, edita y administra contenidos educativos asociados a subtemas y secuencias.',
      icon: TrendingUp,
      color: '#A78BFA',
      gradient: 'from-[#A78BFA] to-[#C4B5FD]',
      onClick: () => navigateTo('content-management')
    },
    {
      id: 'ejercicios',
      title: 'Gestión de Ejercicios',
      description: 'Crear y editar ejercicios asociados a contenidos específicos.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      onClick: () => navigateTo('ejercicios')
    },
    {
      id: 'miniproyectos',
      title: 'Gestión de Miniproyectos',
      description: 'Selecciona y edita miniproyectos existentes y su actividad asociada.',
      icon: ClipboardList,
      color: '#0EA5E9',
      gradient: 'from-[#0EA5E9] to-[#38BDF8]',
      onClick: () => navigateTo('miniproyectos')
    },
    {
      id: 'reports',
      title: 'Generación de Informes',
      description: 'Genera informes de progreso por estudiante, materia o estado de avance. Exporta datos y estadísticas.',
      icon: BarChart3,
      color: '#F5A97F',
      gradient: 'from-[#F5A97F] to-[#F7B98F]'
    },
    {
      id: 'docentes',
      title: 'Gestión de Docentes',
      description: 'Crear, editar y eliminar docentes del sistema. Administra su especialidad y área asignada.',
      icon: Users,
      color: '#14B8A6',
      gradient: 'from-[#14B8A6] to-[#2DD4BF]',
      onClick: () => navigateTo('docentes')
    },
    {
      id: 'administradores',
      title: 'Gestión de Administradores',
      description: 'Crear administradores con cargo y nivel de acceso. Controla credenciales del sistema.',
      icon: Shield,
      color: '#2563EB',
      gradient: 'from-[#2563EB] to-[#3B82F6]',
      onClick: () => navigateTo('administradores')
    },
    {
      id: 'upload',
      title: 'Carga Masiva de Estudiantes',
      description: 'Importa múltiples estudiantes desde un archivo Excel. Crea usuarios automáticamente y envía credenciales.',
      icon: Upload,
      color: '#F472B6',
      gradient: 'from-[#F472B6] to-[#FB87C6]'
    },
    {
      id: 'chatbot',
      title: 'Gestión del Chatbot',
      description: 'Administra los documentos del chatbot. Sube PDFs, recarga la base de conocimiento y prueba las respuestas.',
      icon: Bot,
      color: '#6366F1',
      gradient: 'from-[#6366F1] to-[#818CF8]',
      onClick: () => navigateTo('chatbot')
    }
  ];

  // Renderizar la pantalla actual
  if (currentScreen === 'subthemes') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={(areaId, areaName) => {
            setSelectedAreaId(areaId);
            setSelectedAreaName(areaName);
            navigateTo('temas');
          }}
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
          onSelectTema={(temaId, temaName) => {
            setSelectedTemaId(temaId);
            setSelectedTemaName(temaName);
            navigateTo('subthemes');
          }}
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
          navigateTo('subtema-sequences');
        }}
      />
    );
  }

  if (currentScreen === 'areas') {
    return <AreasManagementScreen 
      onBack={goBack}
      onHome={goHome}
      onSelectArea={(areaId, areaName) => {
        setSelectedAreaId(areaId);
        setSelectedAreaName(areaName);
        navigateTo('temas');
      }}
    />;
  }

  if (currentScreen === 'temas') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={(areaId, areaName) => {
            setSelectedAreaId(areaId);
            setSelectedAreaName(areaName);
            navigateTo('temas');
          }}
        />
      );
    }

    return <TemasManagementScreen 
      areaId={selectedAreaId!}
      areaName={selectedAreaName}
      onBack={goBack}
      onHome={goHome}
      onSelectTema={(temaId, temaName) => {
        setSelectedTemaId(temaId);
        setSelectedTemaName(temaName);
        navigateTo('subthemes');
      }}
    />;
  }

  if (currentScreen === 'subtema-sequences') {
    if (!selectedAreaId) {
      return (
        <AreasManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectArea={(areaId, areaName) => {
            setSelectedAreaId(areaId);
            setSelectedAreaName(areaName);
            navigateTo('temas');
          }}
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
          onSelectTema={(temaId, temaName) => {
            setSelectedTemaId(temaId);
            setSelectedTemaName(temaName);
            navigateTo('subthemes');
          }}
        />
      );
    }

    return <SubtemaSequenceManagementScreen 
      onBack={goBack}
      onHome={goHome}
      onSelectSubtema={(subtemaId, temaId, subtemaNombre) => {
        setSelectedSubtemaId(subtemaId);
        setSelectedSubtemaNombre(subtemaNombre);
        navigateTo('contents');
      }}
      areaId={selectedAreaId || undefined}
      areaName={selectedAreaName}
      temaId={selectedTemaId || undefined}
      temaName={selectedTemaName}
    />;
  }

  if (currentScreen === 'miniproyectos') {
    return (
      <MiniproyectoManagementScreen
        onBack={goBack}
      />
    );
  }

  if (currentScreen === 'ejercicios') {
    return (
      <ExerciseManagementScreen
        onBack={goBack}
      />
    );
  }

  if (currentScreen === 'chatbot') {
    return (
      <ChatbotManagementScreen
        onBack={goBack}
      />
    );
  }

  if (currentScreen === 'docentes') {
    return (
      <DocenteManagementScreen
        onBack={goBack}
      />
    );
  }

  if (currentScreen === 'administradores') {
    return (
      <AdminManagementScreen
        onBack={goBack}
      />
    );
  }

  if (currentScreen === 'contents') {
    // Si viene de un subtema, mostrar SequenceManagementScreen con filtro
    if (selectedSubtemaId && selectedTemaId) {
      return <SequenceManagementScreen 
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
      />;
    }
    // Fallback: si no hay subtema seleccionado, ir a gestión de contenidos
    return <ContentManagementScreen onBack={goBack} onHome={goHome} />;
  }

  if (currentScreen === 'content-management') {
    return <ContentManagementScreen onBack={goBack} onHome={goHome} />;
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#7ED6A7] rounded-xl flex items-center justify-center p-2 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Panel de Administrador</h1>
                <p className="text-gray-500 text-sm">Sistema de Gestión Académica - EduPath</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[#3A4A5B]">Admin Usuario</p>
                <p className="text-gray-500 text-sm">Coordinador Académico</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#F5A97F] to-[#F7B98F] rounded-full flex items-center justify-center text-white shadow-md">
                <span className="text-xl">👨‍💼</span>
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

      {/* Main Content */}
      <main className="app-main">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
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

        {/* Main Actions Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => action.onClick ? action.onClick() : onNavigate(action.id as 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes')}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                      className={`p-4 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}
                      style={{ backgroundColor: action.color }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-gray-400 group-hover:text-[#4A90E2] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
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

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-md">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-[#3A4A5B] text-xl">Actividad Reciente</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileEdit className="w-5 h-5 text-[#4A90E2]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#3A4A5B]">Nuevo contenido agregado en Fundamentos de Programación</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500 text-sm">Hace 2 horas</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#7ED6A7]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#3A4A5B]">15 estudiantes completaron el taller de Análisis de Sistemas</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500 text-sm">Hace 5 horas</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-[#F5A97F]" />
                </div>
                <div className="flex-1">
                  <p className="text-[#3A4A5B]">Tema deshabilitado en Alcance, Tiempo y Costo</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500 text-sm">Ayer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}