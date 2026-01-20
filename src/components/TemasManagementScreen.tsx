import { useState, useEffect } from 'react';
import { ArrowLeft, Loader } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface Tema {
  id: number;
  nombre: string;
  descripcion?: string;
  area_id: number;
}

interface TemasManagementScreenProps {
  areaId: number;
  areaName: string;
  onBack: () => void;
  onSelectTema: (temaId: number, temaName: string) => void;
}

export function TemasManagementScreen({ areaId, areaName, onBack, onSelectTema }: TemasManagementScreenProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemas();
  }, [areaId]);

  const loadTemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:4000/temas/por-area/${areaId}`);
      if (!response.ok) throw new Error('Error cargando temas');
      const data = await response.json();
      setTemas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar temas');
      setTemas([]);
    } finally {
      setLoading(false);
    }
  };

  // Colores de gradiente para las tarjetas
  const colors = [
    { bg: 'from-[#4A90E2] to-[#5B9FED]', text: 'text-blue-600' },
    { bg: 'from-[#7ED6A7] to-[#90E0B7]', text: 'text-green-600' },
    { bg: 'from-[#F5A97F] to-[#F7B98F]', text: 'text-orange-600' },
    { bg: 'from-[#A78BFA] to-[#B79BFA]', text: 'text-purple-600' },
    { bg: 'from-[#8B5CF6] to-[#A78BFA]', text: 'text-indigo-600' },
    { bg: 'from-[#F472B6] to-[#FB87C6]', text: 'text-pink-600' },
  ];

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
                <h1 className="text-[#3A4A5B]">Seleccionar Tema</h1>
                <p className="text-gray-500 text-sm">Área: {areaName}</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando temas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadTemas}
              className="mt-4 px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : temas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No hay temas disponibles en esta área.</p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Volver a Áreas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {temas.map((tema, index) => {
              const colorStyle = colors[index % colors.length];
              return (
                <button
                  key={tema.id}
                  onClick={() => onSelectTema(tema.id, tema.nombre)}
                  className={`bg-gradient-to-br ${colorStyle.bg} rounded-xl p-8 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left`}
                >
                  <div className="flex flex-col h-full">
                    <h3 className="text-xl font-bold mb-2">{tema.nombre}</h3>
                    {tema.descripcion && (
                      <p className="text-sm opacity-90 flex-grow">{tema.descripcion}</p>
                    )}
                    <div className="text-xs opacity-75 mt-4">
                      Haz clic para seleccionar este tema
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
