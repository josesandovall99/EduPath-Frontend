import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Edit, Loader } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { TIPO_ACTIVIDAD_EJERCICIO_ID } from '../utils/constants';

interface ExerciseManagementScreenProps {
  onBack: () => void;
}

interface EjercicioItem {
  id: number;
  contenido_id: number;
  puntos: number;
  resultado_ejercicio: string;
  actividad?: {
    id: number;
    titulo: string;
    descripcion?: string;
    nivel_dificultad?: 'facil' | 'medio' | 'dificil';
    fecha_creacion?: string;
    tipo_actividad_id?: number;
  };
  Contenido?: {
    id: number;
    titulo?: string;
  };
}

interface ExerciseFormData {
  actividad: {
    titulo: string;
    descripcion: string;
    nivel_dificultad: 'facil' | 'medio' | 'dificil';
    tipo_actividad_id: number | '';
  };
  ejercicio: {
    contenido_id: number | '';
    puntos: number | '';
    resultado_ejercicio: string;
  };
}

export function ExerciseManagementScreen({ onBack }: ExerciseManagementScreenProps) {
  const [ejercicios, setEjercicios] = useState<EjercicioItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEjercicio, setSelectedEjercicio] = useState<EjercicioItem | null>(null);

  type ContenidoOption = { id: number; titulo: string };
  const [contenidosOptions, setContenidosOptions] = useState<ContenidoOption[]>([]);
  const [isLoadingContenidos, setIsLoadingContenidos] = useState(false);

  const [formData, setFormData] = useState<ExerciseFormData>({
    actividad: {
      titulo: '',
      descripcion: '',
      nivel_dificultad: 'medio',
      tipo_actividad_id: TIPO_ACTIVIDAD_EJERCICIO_ID
    },
    ejercicio: {
      contenido_id: '',
      puntos: '',
      resultado_ejercicio: ''
    }
  });

  useEffect(() => {
    loadEjercicios();
    loadContenidos();
  }, []);

  const loadEjercicios = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('http://localhost:4000/ejercicios');
      if (!res.ok) throw new Error('No se pudieron cargar los ejercicios');
      const data = await res.json();
      setEjercicios(data as EjercicioItem[]);
    } catch (err) {
      console.error(err);
      toast.error('Error', { description: 'No se pudieron cargar los ejercicios' });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadContenidos = async () => {
    setIsLoadingContenidos(true);
    try {
      const res = await fetch('http://localhost:4000/contenidos');
      if (!res.ok) throw new Error('No se pudieron cargar los contenidos');
      const data = await res.json();
      const mapped: ContenidoOption[] = (data || []).map((c: any) => ({ id: Number(c.id), titulo: c.titulo }));
      setContenidosOptions(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Error', { description: 'No se pudieron cargar los contenidos para el selector' });
    } finally {
      setIsLoadingContenidos(false);
    }
  };

  const openCreate = () => {
    setIsEditMode(false);
    setSelectedEjercicio(null);
    setFormData({
      actividad: {
        titulo: '',
        descripcion: '',
        nivel_dificultad: 'medio',
        tipo_actividad_id: TIPO_ACTIVIDAD_EJERCICIO_ID
      },
      ejercicio: {
        contenido_id: '',
        puntos: '',
        resultado_ejercicio: ''
      }
    });
    setShowModal(true);
  };

  const openEdit = (item: EjercicioItem) => {
    setIsEditMode(true);
    setSelectedEjercicio(item);
    setFormData({
      actividad: {
        titulo: item.actividad?.titulo || '',
        descripcion: item.actividad?.descripcion || '',
        nivel_dificultad: (item.actividad?.nivel_dificultad as any) || 'medio',
        // Forzamos el tipo de actividad a 'Ejercicio'
        tipo_actividad_id: TIPO_ACTIVIDAD_EJERCICIO_ID
      },
      ejercicio: {
        contenido_id: item.contenido_id || '',
        puntos: item.puntos || '',
        resultado_ejercicio: item.resultado_ejercicio || ''
      }
    });
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name.startsWith('actividad.')) {
      const key = name.replace('actividad.', '') as keyof ExerciseFormData['actividad'];
      setFormData((prev) => ({
        ...prev,
        actividad: {
          ...prev.actividad,
          [key]: key === 'tipo_actividad_id' ? TIPO_ACTIVIDAD_EJERCICIO_ID : value
        }
      }));
    } else if (name.startsWith('ejercicio.')) {
      const key = name.replace('ejercicio.', '') as keyof ExerciseFormData['ejercicio'];
      setFormData((prev) => ({
        ...prev,
        ejercicio: {
          ...prev.ejercicio,
          [key]: key === 'contenido_id' || key === 'puntos' ? (value === '' ? '' : Number(value)) : value
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones básicas
    if (!formData.actividad.titulo || !formData.ejercicio.contenido_id || !formData.ejercicio.puntos || !formData.ejercicio.resultado_ejercicio) {
      toast.error('Campos requeridos', { description: 'Completa título, contenido, puntos y respuesta correcta.' });
      return;
    }

    setIsSaving(true);
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode && selectedEjercicio
        ? `http://localhost:4000/ejercicios/${selectedEjercicio.id}`
        : 'http://localhost:4000/ejercicios';

      const body = JSON.stringify({
        actividad: {
          titulo: formData.actividad.titulo,
          descripcion: formData.actividad.descripcion,
          nivel_dificultad: formData.actividad.nivel_dificultad,
          // Aseguramos que siempre sea el tipo de 'Ejercicio'
          tipo_actividad_id: TIPO_ACTIVIDAD_EJERCICIO_ID
        },
        ejercicio: {
          contenido_id: formData.ejercicio.contenido_id,
          puntos: formData.ejercicio.puntos,
          resultado_ejercicio: formData.ejercicio.resultado_ejercicio
        }
      });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!res.ok) {
        // Try to extract detailed error info
        let serverMessage = '';
        try {
          const asJson = await res.json();
          serverMessage = asJson?.message || JSON.stringify(asJson);
        } catch {
          try {
            serverMessage = await res.text();
          } catch {
            serverMessage = '';
          }
        }
        const statusInfo = `HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`;
        throw new Error(serverMessage ? `${statusInfo}: ${serverMessage}` : statusInfo);
      }

      // Refrescar lista y cerrar modal
      await loadEjercicios();
      setShowModal(false);
      setIsEditMode(false);
      setSelectedEjercicio(null);
      toast.success(isEditMode ? 'Ejercicio actualizado' : 'Ejercicio creado');
    } catch (err) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setIsSaving(false);
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
                <h1 className="text-[#3A4A5B]">Gestión de Ejercicios</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Ejercicio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {/* Loading */}
        {isLoadingData ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />
              <p className="text-gray-600">Cargando ejercicios...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Título</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Contenido</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Puntos</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Dificultad</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ejercicios.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[#3A4A5B]">{e.actividad?.titulo || `Ejercicio #${e.id}`}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.Contenido?.titulo || `Contenido ID ${e.contenido_id}`}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.puntos}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.actividad?.nivel_dificultad || '-'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[1200px] max-w-[95%] max-h-[90vh] overflow-auto relative">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: 'linear-gradient(90deg, rgba(74,144,226,0.12), rgba(74,144,226,0.06))' }} />
            <div className="flex items-center justify-between mb-6 pt-2">
              <h2 className="text-2xl font-bold text-[#3A4A5B]">{isEditMode ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-[#4A90E2] text-2xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Actividad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Título *</label>
                  <input
                    type="text"
                    name="actividad.titulo"
                    value={formData.actividad.titulo}
                    onChange={handleChange}
                    placeholder="Ingrese el título"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Nivel de dificultad *</label>
                  <select
                    name="actividad.nivel_dificultad"
                    value={formData.actividad.nivel_dificultad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Medio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Descripción *</label>
                <textarea
                  name="actividad.descripcion"
                  value={formData.actividad.descripcion}
                  onChange={handleChange}
                  placeholder="Ingrese la descripción"
                  className="w-full min-h-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                />
              </div>

              {/* Tipo de actividad forzado en el código; no se muestra al usuario */}

              {/* Ejercicio */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Contenido *</label>
                  <select
                    name="ejercicio.contenido_id"
                    value={formData.ejercicio.contenido_id === '' ? '' : String(formData.ejercicio.contenido_id)}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    required
                    disabled={isLoadingContenidos}
                  >
                    <option value="" disabled>
                      {isLoadingContenidos ? 'Cargando contenidos...' : 'Seleccione un contenido'}
                    </option>
                    {contenidosOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.titulo} (ID {c.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Puntos *</label>
                  <input
                    type="number"
                    name="ejercicio.puntos"
                    value={formData.ejercicio.puntos}
                    onChange={handleChange}
                    min={0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Respuesta correcta *</label>
                  <textarea
                    name="ejercicio.resultado_ejercicio"
                    value={formData.ejercicio.resultado_ejercicio}
                    onChange={handleChange}
                    placeholder="Ejemplo: for i in range(10): print(i)"
                    className="w-full min-h-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (<><Loader className="w-4 h-4 animate-spin" /> Guardando...</>) : (<><Plus className="w-4 h-4" /> {isEditMode ? 'Actualizar' : 'Crear'} Ejercicio</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExerciseManagementScreen;
