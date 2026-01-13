import { useState } from 'react';
import { LogOut, BookOpen, FileEdit, BarChart3, Users, TrendingUp, Clock, GitBranch } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ContentManagementScreen } from './ContentManagementScreen';
import { SequenceManagementScreen } from './SequenceManagementScreen';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigate: (section: 'themes' | 'contents' | 'reports' | 'students') => void;
}

export function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'contents' | 'sequences'>('dashboard');
  const stats = [
    { label: 'Materias activas', value: '3', icon: BookOpen, color: '#4A90E2', trend: '+0%' },
    { label: 'Temas disponibles', value: '12', icon: FileEdit, color: '#7ED6A7', trend: '+2' },
    { label: 'Estudiantes activos', value: '45', icon: Users, color: '#F5A97F', trend: '+5' },
    { label: 'Contenidos publicados', value: '87', icon: TrendingUp, color: '#A78BFA', trend: '+12' }
  ];

  const actions = [
    {
      id: 'themes',
      title: 'Gestión de Temas',
      description: 'Habilitar o deshabilitar temas y subtemas por materia. Controla qué contenidos están disponibles para los estudiantes.',
      icon: BookOpen,
      color: '#4A90E2',
      gradient: 'from-[#4A90E2] to-[#5B9FED]'
    },
    {
      id: 'contents',
      title: 'Gestión de Contenidos',
      description: 'Crear, editar y eliminar contenidos teóricos. Administra videos, documentos y recursos por tema.',
      icon: FileEdit,
      color: '#7ED6A7',
      gradient: 'from-[#7ED6A7] to-[#90E0B7]',
      onClick: () => setCurrentScreen('contents')
    },
    {
      id: 'sequences',
      title: 'Gestión de Secuencias',
      description: 'Define el orden de los contenidos dentro de temas y subtemas. Visualiza y gestiona flujos de aprendizaje.',
      icon: GitBranch,
      color: '#06B6D4',
      gradient: 'from-[#06B6D4] to-[#14B8A6]',
      onClick: () => setCurrentScreen('sequences')
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
      id: 'students',
      title: 'Seguimiento de Estudiantes',
      description: 'Monitorea el progreso individual de cada estudiante, visualiza estadísticas y actividad reciente.',
      icon: Users,
      color: '#A78BFA',
      gradient: 'from-[#A78BFA] to-[#B79BFA]'
    }
  ];

  // Renderizar la pantalla actual
  if (currentScreen === 'contents') {
    return <ContentManagementScreen onBack={() => setCurrentScreen('dashboard')} />;
  }

  if (currentScreen === 'sequences') {
    return <SequenceManagementScreen onBack={() => setCurrentScreen('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
      <main className="max-w-7xl mx-auto px-8 py-8">
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
        <div className="grid grid-cols-2 gap-6 mb-8">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => action.onClick ? action.onClick() : onNavigate(action.id as 'themes' | 'contents' | 'reports' | 'students')}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className={`p-4 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}
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