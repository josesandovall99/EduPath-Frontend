import { useState } from 'react';
import { ChevronRight, ClipboardList, GitBranch, LogOut, MapPinned } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ExerciseManagementScreen } from './ExerciseManagementScreen';
import { MiniproyectoManagementScreen } from './MiniproyectoManagementScreen';

interface DocenteDashboardProps {
  onLogout: () => void;
  onManageArea: () => void;
  docente?: {
    nombre?: string;
    email?: string;
    especialidad?: string;
    areaNombre?: string;
  } | null;
}

export function DocenteDashboard({ onLogout, onManageArea, docente }: DocenteDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'ejercicios' | 'miniproyectos'>('dashboard');

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
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#14B8A6] to-[#2DD4BF] rounded-xl flex items-center justify-center p-2 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Panel de Docente</h1>
                <p className="text-gray-500 text-sm">Gestione su area y contenidos asignados</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[#3A4A5B]">{docente?.nombre || 'Docente'}</p>
                <p className="text-gray-500 text-sm">{docente?.especialidad || 'Especialidad no definida'}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#14B8A6] to-[#2DD4BF] rounded-full flex items-center justify-center text-white shadow-md">
                <span className="text-xl">👩‍🏫</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-[#14B8A6] hover:bg-emerald-50 rounded-lg transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl text-[#3A4A5B]">Bienvenido, {docente?.nombre || 'Docente'}</h2>
              <p className="text-gray-500 text-sm">
                Area asignada: {docente?.areaNombre || 'Por confirmar'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <button
              type="button"
              onClick={onManageArea}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02] border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#2DD4BF] shadow-md">
                  <MapPinned className="w-8 h-8 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#14B8A6] transition-colors" />
              </div>
              <h3 className="text-[#3A4A5B] text-xl mb-2 group-hover:text-[#14B8A6] transition-colors">
                Gestión de Área
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Administra el área asignada y sus contenidos disponibles.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('ejercicios')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02] border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] shadow-md">
                  <ClipboardList className="w-8 h-8 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#0EA5E9] transition-colors" />
              </div>
              <h3 className="text-[#3A4A5B] text-xl mb-2 group-hover:text-[#0EA5E9] transition-colors">
                Gestión de Ejercicios
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Crear y editar ejercicios asociados a contenidos específicos.
              </p>
            </button>

            <button
              type="button"
              onClick={onManageArea}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02] border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] shadow-md">
                  <GitBranch className="w-8 h-8 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#8B5CF6] transition-colors" />
              </div>
              <h3 className="text-[#3A4A5B] text-xl mb-2 group-hover:text-[#8B5CF6] transition-colors">
                Gestión de Subtemas
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Accede al módulo para administrar subtemas y sus contenidos por tema.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('miniproyectos')}
              className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group hover:transform hover:scale-[1.02] border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] shadow-md">
                  <ClipboardList className="w-8 h-8 text-white" />
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#0EA5E9] transition-colors" />
              </div>
              <h3 className="text-[#3A4A5B] text-xl mb-2 group-hover:text-[#0EA5E9] transition-colors">
                Gestión de Miniproyectos
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Selecciona y edita miniproyectos existentes y su actividad asociada.
              </p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
