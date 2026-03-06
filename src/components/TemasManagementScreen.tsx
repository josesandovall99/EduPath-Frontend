import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Loader, Search } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ThemeManagementScreen } from './ThemeManagementScreen';

interface Tema {
  id: number;
  nombre: string;
  descripcion?: string;
  area_id: number;
  estado?: boolean;
}

interface TemasManagementScreenProps {
  areaId: number;
  areaName: string;
  onBack: () => void;
  onHome?: () => void;
  onSelectTema: (temaId: number, temaName: string) => void;
}

export function TemasManagementScreen({ areaId, areaName, onBack, onHome, onSelectTema }: TemasManagementScreenProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTemas();
  }, [areaId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadTemas();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [areaId]);

  const loadTemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://edupath-backend-xch1.onrender.com/temas/por-area/${areaId}`);
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
    { bg: '#4A90E2', text: 'text-blue-600' },
    { bg: '#7ED6A7', text: 'text-green-600' },
    { bg: '#F5A97F', text: 'text-orange-600' },
    { bg: '#A78BFA', text: 'text-purple-600' },
    { bg: '#8B5CF6', text: 'text-indigo-600' },
    { bg: '#F472B6', text: 'text-pink-600' },
  ];

  const handleOpenThemeManager = async (tema?: Tema) => {
    if (!tema) {
      setEditingTema(null);
      setShowThemeManager(true);
      return;
    }

    let temaToEdit = tema;
    if (tema.estado === undefined) {
      try {
        const response = await fetch(`https://edupath-backend-xch1.onrender.com/temas/${tema.id}`);
        if (response.ok) {
          temaToEdit = await response.json();
        }
      } catch (err) {
        console.error('Error cargando tema para editar:', err);
      }
    }

    setEditingTema(temaToEdit);
    setShowThemeManager(true);
  };

  const handleCloseThemeManager = () => {
    setShowThemeManager(false);
    setEditingTema(null);
  };

  const filteredTemas = temas.filter((tema) =>
    tema.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  if (showThemeManager) {
    return (
      <ThemeManagementScreen
        onBack={handleCloseThemeManager}
        initialAreaId={editingTema?.area_id ?? areaId}
        initialEditTema={editingTema ?? undefined}
        backLabel="Volver a Temas"
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onHome}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Seleccionar Tema</h1>
                <p className="text-gray-500 text-sm">Área: {areaName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <button
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Informational Message */}
        <div className="app-info-banner mb-8 p-6">
          <h2 className="text-lg font-bold mb-2">Selecciona un Tema</h2>
          <p className="text-sm opacity-95">
            Elige un tema para gestionar sus subtemas y contenidos asociados. 
            Aquí podrás organizar la estructura de aprendizaje para este área.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => handleOpenThemeManager()}
            className="app-btn app-primary-btn px-5 py-2.5"
          >
            Gestionar Temas
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
            Filtrar por nombre de tema
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Escribe el nombre del tema..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
            />
          </div>
        </div>

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
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4A90E2] to-[#357abd] rounded-full flex items-center justify-center opacity-10"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay temas disponibles</h3>
            <p className="text-gray-600 mb-4">
              No se encontraron temas en esta área. Crea un nuevo tema para comenzar a organizar contenidos.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              📚 Los temas son las categorías principales de aprendizaje dentro de cada área.
            </p>
          </div>
        ) : filteredTemas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin resultados</h3>
            <p className="text-gray-600">No se encontraron temas con el nombre ingresado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemas.map((tema, index) => {
              const colorStyle = colors[index % colors.length];
              return (
                <div
                  key={tema.id}
                  onClick={() => onSelectTema(tema.id, tema.nombre)}
                  className="rounded-xl p-8 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left cursor-pointer"
                  style={{ backgroundColor: colorStyle.bg }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectTema(tema.id, tema.nombre);
                    }
                  }}
                >
                  <div className="flex items-start gap-6">
                    <div className="flex flex-col h-full flex-1">
                      <h3 className="text-xl font-bold mb-2">{tema.nombre}</h3>
                      {tema.descripcion && (
                        <p className="text-sm opacity-90 flex-grow">{tema.descripcion}</p>
                      )}
                      <div className="text-xs opacity-75 mt-4">
                        Haz clic para seleccionar este tema
                      </div>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenThemeManager(tema);
                      }}
                      className="app-btn flex-shrink-0 px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 cursor-pointer"
                      title="Editar tema"
                      aria-label="Editar tema"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Editar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
