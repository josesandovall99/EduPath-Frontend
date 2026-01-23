import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Area {
  id: number;
  nombre: string;
}

interface AreasManagementScreenProps {
  onBack: () => void;
  onSelectArea: (areaId: number, areaName: string) => void;
}

export function AreasManagementScreen({ onBack, onSelectArea }: AreasManagementScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/areas');
      if (!response.ok) {
        throw new Error('Error al cargar áreas');
      }
      const data = await response.json();
      setAreas(data);
    } catch (err) {
      console.error('Error en loadAreas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar áreas');
    } finally {
      setIsLoading(false);
    }
  };

  const getColorForArea = (index: number) => {
    const colors = [
      'from-[#4A90E2] to-[#5B9FED]',
      'from-[#7ED6A7] to-[#90E0B7]',
      'from-[#F5A97F] to-[#F7B98F]',
      'from-[#A78BFA] to-[#B79BFA]',
      'from-[#06B6D4] to-[#14B8A6]',
      'from-[#8B5CF6] to-[#A78BFA]',
    ];
    return colors[index % colors.length];
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
                <h1 className="text-[#3A4A5B]">Gestión de Áreas - Subtemas - Contenidos</h1>
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

        {/* Informational Message */}
        <div className="mb-8 p-6 bg-gradient-to-r from-[#4A90E2] to-[#357abd] text-white rounded-xl shadow-lg">
          <h2 className="text-lg font-bold mb-2">Gestión de Contenido Educativo</h2>
          <p className="text-sm opacity-95">
            Selecciona un área para gestionar sus subtemas y contenidos. Desde aquí podrás organizar la estructura completa 
            de aprendizaje, definir el orden de los temas y asignar materiales educativos a cada subtema.
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando áreas...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : areas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4A90E2] to-[#357abd] rounded-full flex items-center justify-center opacity-10"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay áreas disponibles</h3>
            <p className="text-gray-600 mb-4">
              No se encontraron áreas en el sistema. Crea una nueva área para comenzar a organizar contenidos.
            </p>
            <p className="text-sm text-gray-500">
              🎓 Las áreas son las categorías principales de aprendizaje en la plataforma educativa.
            </p>
          </div>
        ) : (
          <>
            {/* Areas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {areas.map((area, index) => {
                const gradient = getColorForArea(index);
                return (
                  <button
                    key={area.id}
                    onClick={() => onSelectArea(area.id, area.nombre)}
                    className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left group hover:scale-[1.05] cursor-pointer`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-white text-2xl font-bold group-hover:text-gray-100 transition-colors mb-2">
                          {area.nombre}
                        </h2>
                        <p className="text-white text-opacity-90 text-sm">
                          Click para gestionar subtemas y contenidos
                        </p>
                      </div>
                      <div className="text-white text-opacity-80 group-hover:text-opacity-100 transition-opacity mt-2">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
        </div>
      </main>
    </div>
  );
}
