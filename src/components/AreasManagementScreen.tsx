import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
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
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });

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

  const handleOpenCreate = () => {
    setFormError(null);
    setSuccessMessage(null);
    setFormData({ nombre: '', descripcion: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleCreateArea = async () => {
    if (!formData.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('http://localhost:4000/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Error al crear el area');
      }

      const createdArea = await response.json();
      setAreas((prev) => [createdArea, ...prev]);
      setShowModal(false);
      setSuccessMessage('Area creada correctamente.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear el area');
    } finally {
      setSubmitting(false);
    }
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

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#3A4A5B] text-xl">Areas académicas</h2>
            <p className="text-gray-500 text-sm">Crea nuevas areas para organizar los contenidos.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: '#4A90E2' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva area</span>
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-green-700 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

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
            onClick={handleOpenCreate}
            className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all"
            style={{ backgroundColor: '#4A90E2' }}
          >
            Crear area
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-[#3A4A5B]">Crear Nueva Area</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                  placeholder="Ej: Programacion"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripcion</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all resize-none"
                  placeholder="Descripcion breve del area"
                  rows={4}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateArea}
                disabled={submitting || !formData.nombre.trim()}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: '#4A90E2' }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Crear area</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
