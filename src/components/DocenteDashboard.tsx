import { LogOut, MapPinned } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

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

          <button
            type="button"
            onClick={onManageArea}
            className="flex items-center gap-3 px-6 py-4 bg-[#14B8A6] text-white rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <MapPinned className="w-5 h-5" />
            <span>Gestionar area</span>
          </button>
        </div>
      </main>
    </div>
  );
}
