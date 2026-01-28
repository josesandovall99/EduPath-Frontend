import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, RefreshCw, Save, Search, Play, Trash2 } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { useCompiler } from '../Hooks/useCompiler';

interface MiniproyectoManagementScreenProps {
  onBack: () => void;
}

interface AreaInfo {
  id: number;
  nombre: string;
}

interface TipoActividadInfo {
  id: number;
  nombre?: string;
}

interface ActividadInfo {
  id?: number;
  titulo?: string;
  descripcion?: string;
  nivel_dificultad?: string;
  fecha_creacion?: string;
  tipo?: TipoActividadInfo;
}

interface MiniproyectoItem {
  id: number;
  actividad_id?: number;
  entregable?: string;
  respuesta_miniproyecto?: string;
  Area?: AreaInfo;
  Actividad?: ActividadInfo;
}

interface EditFormData {
  titulo: string;
  descripcion: string;
  nivel_dificultad: string;
  entregable: string;
  respuesta_miniproyecto: string;
}

export function MiniproyectoManagementScreen({ onBack }: MiniproyectoManagementScreenProps) {
  const [miniproyectos, setMiniproyectos] = useState<MiniproyectoItem[]>([]);
  const [selected, setSelected] = useState<MiniproyectoItem | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    titulo: '',
    descripcion: '',
    nivel_dificultad: '',
    entregable: '',
    respuesta_miniproyecto: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('# Escribe tu código aquí\nprint("Hola Mundo")');
  const [lastRunOutput, setLastRunOutput] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const [lastRunHasError, setLastRunHasError] = useState(false);

  const { runCode, output, isLoading: isRunning, setOutput } = useCompiler();
  const isProgrammingMiniproyecto = selected ? Number(selected.id) === 2 : false;

  useEffect(() => {
    loadMiniproyectos();
  }, []);

  const loadMiniproyectos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:4000/miniproyectos');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los miniproyectos');
      }
      const data = await response.json();
      setMiniproyectos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en loadMiniproyectos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar miniproyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMiniproyectos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return miniproyectos;
    return miniproyectos.filter((item) => {
      const titulo = item.Actividad?.titulo?.toLowerCase() || '';
      const area = item.Area?.nombre?.toLowerCase() || '';
      const nivel = item.Actividad?.nivel_dificultad?.toLowerCase() || '';
      return titulo.includes(term) || area.includes(term) || nivel.includes(term);
    });
  }, [miniproyectos, query]);

  const handleSelect = (item: MiniproyectoItem) => {
    setSelected(item);
    setFormData({
      titulo: item.Actividad?.titulo || '',
      descripcion: item.Actividad?.descripcion || '',
      nivel_dificultad: item.Actividad?.nivel_dificultad || '',
      entregable: item.entregable || '',
      respuesta_miniproyecto: item.respuesta_miniproyecto || ''
    });
    setCode('# Escribe tu código aquí\nprint("Hola Mundo")');
    setLastRunOutput('');
    setHasRun(false);
    setLastRunHasError(false);
    setOutput('');
  };

  const handleChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!isRunning && output) {
      setLastRunOutput(output);
      const outputHasError = output.toLowerCase().includes('error');
      setLastRunHasError(outputHasError);
      setHasRun(true);
      setFormData((prev) => ({ ...prev, respuesta_miniproyecto: output }));
    }
  }, [isRunning, output, setOutput]);

  const handleExecute = async () => {
    setError(null);
    try {
      await runCode(code, 71, 1, 1);
    } catch (err) {
      console.error('Error al ejecutar código:', err);
      setError('Error al ejecutar el código.');
    }
  };

  const handleClear = () => {
    setCode('');
    setOutput('');
    setLastRunOutput('');
    setHasRun(false);
    setLastRunHasError(false);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    if (isProgrammingMiniproyecto) {
      if (!hasRun) {
        setError('Ejecuta el código antes de guardar el miniproyecto.');
        return;
      }
      if (lastRunHasError) {
        setError('Corrige los errores del compilador antes de guardar.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:4000/miniproyectos/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          nivel_dificultad: formData.nivel_dificultad,
          entregable: formData.entregable,
          respuesta_miniproyecto: isProgrammingMiniproyecto ? lastRunOutput : formData.respuesta_miniproyecto
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar el miniproyecto');
      }

      setMiniproyectos((prev) =>
        prev.map((item) => {
          if (item.id !== selected.id) return item;
          return {
            ...item,
            entregable: formData.entregable,
            respuesta_miniproyecto: isProgrammingMiniproyecto ? lastRunOutput : formData.respuesta_miniproyecto,
            Actividad: {
              ...(item.Actividad || {}),
              titulo: formData.titulo,
              descripcion: formData.descripcion,
              nivel_dificultad: formData.nivel_dificultad
            }
          };
        })
      );
    } catch (err) {
      console.error('Error actualizando miniproyecto:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el miniproyecto');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Miniproyectos</h1>
                <p className="text-gray-500 text-sm">Selecciona y edita miniproyectos existentes</p>
              </div>
            </div>
            <button
              onClick={loadMiniproyectos}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[#3A4A5B] text-lg">Listado de Miniproyectos</h2>
                <p className="text-sm text-gray-500">Selecciona un miniproyecto para editarlo.</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título, área o nivel"
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-gray-500">Cargando miniproyectos...</div>
            ) : error ? (
              <div className="py-10 text-center text-red-600">{error}</div>
            ) : filteredMiniproyectos.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No hay miniproyectos que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMiniproyectos.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left border rounded-2xl p-5 transition-all hover:shadow-md ${
                      selected?.id === item.id ? 'border-[#4A90E2] bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[#3A4A5B] text-lg">
                          {item.Actividad?.titulo || 'Sin título'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Área: {item.Area?.nombre || 'Sin área'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Nivel: {item.Actividad?.nivel_dificultad || 'No definido'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[#4A90E2]">
                        <ClipboardList className="w-5 h-5" />
                        <span className="text-sm">Editar</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-[#3A4A5B] text-lg mb-4">Editar Miniproyecto</h2>
            {!selected ? (
              <div className="py-12 text-center text-gray-500">
                Selecciona un miniproyecto para editar sus datos.
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Título</label>
                  <input
                    value={formData.titulo}
                    onChange={(event) => handleChange('titulo', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(event) => handleChange('descripcion', event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Nivel de dificultad</label>
                  <input
                    value={formData.nivel_dificultad}
                    onChange={(event) => handleChange('nivel_dificultad', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Entregable</label>
                  <input
                    value={formData.entregable}
                    onChange={(event) => handleChange('entregable', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                {isProgrammingMiniproyecto ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Código del miniproyecto</label>
                      <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">script.py</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleClear}
                              className="text-xs px-3 py-1 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100"
                            >
                              <Trash2 className="inline w-3 h-3 mr-1" />
                              Limpiar
                            </button>
                            <button
                              type="button"
                              onClick={handleExecute}
                              disabled={isRunning}
                              className="text-xs px-3 py-1 rounded-md text-white"
                              style={{ backgroundColor: isRunning ? '#94a3b8' : '#4A90E2' }}
                            >
                              <Play className={`inline w-3 h-3 mr-1 ${isRunning ? 'animate-spin' : ''}`} />
                              {isRunning ? 'Ejecutando...' : 'Ejecutar'}
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          rows={8}
                          className="w-full p-3 font-mono text-sm bg-[#1E1E1E] text-gray-100 outline-none"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-600">Salida del compilador (se guarda como respuesta)</label>
                      <textarea
                        value={lastRunOutput}
                        readOnly
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-700"
                      />
                      {!hasRun && (
                        <p className="text-xs text-gray-500 mt-1">Ejecuta el código para generar la respuesta.</p>
                      )}
                      {lastRunHasError && (
                        <p className="text-xs text-red-600 mt-1">El compilador reportó errores. Corrige y vuelve a ejecutar.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-gray-600">Respuesta del miniproyecto</label>
                    <textarea
                      value={formData.respuesta_miniproyecto}
                      onChange={(event) => handleChange('respuesta_miniproyecto', event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSaving || (isProgrammingMiniproyecto && (isRunning || !hasRun || lastRunHasError))}
                  className="w-full flex items-center justify-center gap-2 bg-[#4A90E2] text-white py-2 rounded-lg hover:bg-[#357ABD] transition-all disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
