import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Edit, Loader, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ExerciseManagementScreenProps {
  onBack: () => void;
}

interface TipoActividad {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface EjercicioItem {
  id: number;
  contenido_id: number;
  puntos: number;
  resultado_ejercicio: string;
  tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción multiple' | 'Ordenar' | 'Relacionar';
  configuracion?: any;
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

interface Pregunta {
  id: string;
  enunciado: string;
  tipo: 'opcion-multiple' | 'abierta';
  opciones?: string[];
  respuesta_correcta: string | number;
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
    tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción multiple' | 'Ordenar' | 'Relacionar';
    configuracion: any;
  };
}

// Componente para configuración de Compilador
function CompiladorConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const handleEsperadoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const valor = e.target.value;
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        resultado_ejercicio: valor,
        configuracion: {
          ...prev.ejercicio.configuracion,
          esperado: valor
        }
      }
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración de Compilador</h3>
      
      <div>
        <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Código Esperado / Respuesta Correcta *</label>
        <textarea
          value={formData.ejercicio.resultado_ejercicio}
          onChange={handleEsperadoChange}
          placeholder="Ejemplo: print('Hola Mundo')"
          className="w-full min-h-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent font-mono text-sm"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Este código se usará para validar la respuesta del estudiante</p>
      </div>
    </div>
  );
}

// Configuración: Opción múltiple
function MultipleChoiceConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const cfg = formData.ejercicio.configuracion || { enunciado: '', opciones: ['', '', '', ''], correctaIndex: 0 };

  const setCfg = (update: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: { ...prev.ejercicio, configuracion: { ...cfg, ...update } }
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración: Opción múltiple</h3>
      <div>
        <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Enunciado *</label>
        <input
          type="text"
          value={cfg.enunciado}
          onChange={(e) => setCfg({ enunciado: e.target.value })}
          placeholder="Escribe la pregunta"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#3A4A5B]">Opciones * (marca la correcta)</label>
        {(cfg.opciones || []).map((op: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="radio"
              name="mc-correcta"
              checked={cfg.correctaIndex === idx}
              onChange={() => setCfg({ correctaIndex: idx })}
              className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
            />
            <input
              type="text"
              value={op}
              onChange={(e) => {
                const opciones = [...(cfg.opciones || [])];
                opciones[idx] = e.target.value;
                setCfg({ opciones });
              }}
              placeholder={`Opción ${idx + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Configuración: Ordenar
function OrderingConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const cfg = formData.ejercicio.configuracion || { enunciado: '', items: ['Item 1', 'Item 2', 'Item 3'] };

  const setCfg = (update: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: { ...prev.ejercicio, configuracion: { ...cfg, ...update } }
    }));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const items = [...(cfg.items || [])];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(newIndex, 0, item);
    setCfg({ items });
  };

  const addItem = () => {
    setCfg({ items: [...(cfg.items || []), `Item ${((cfg.items || []).length + 1)}`] });
  };

  const removeItem = (index: number) => {
    const items = [...(cfg.items || [])];
    items.splice(index, 1);
    setCfg({ items });
  };

  return (
    <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración: Ordenar</h3>
      <div>
        <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Enunciado *</label>
        <input
          type="text"
          value={cfg.enunciado}
          onChange={(e) => setCfg({ enunciado: e.target.value })}
          placeholder="Describe la tarea a ordenar"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#3A4A5B]">Ítems (en orden correcto) *</label>
        {(cfg.items || []).map((it: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 text-gray-500 text-sm">{idx + 1}.</span>
            <input
              type="text"
              value={it}
              onChange={(e) => {
                const items = [...(cfg.items || [])];
                items[idx] = e.target.value;
                setCfg({ items });
              }}
              placeholder={`Ítem ${idx + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
            />
            <button type="button" className="px-2 py-1 border rounded" onClick={() => moveItem(idx, -1)}>↑</button>
            <button type="button" className="px-2 py-1 border rounded" onClick={() => moveItem(idx, 1)}>↓</button>
            <button type="button" className="px-2 py-1 text-red-600 border rounded" onClick={() => removeItem(idx)}>✕</button>
          </div>
        ))}
        <button type="button" className="mt-2 px-3 py-1 bg-[#7ED6A7] text-white rounded" onClick={addItem}>Agregar ítem</button>
      </div>
    </div>
  );
}

// Configuración: Relacionar
function MatchingConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const cfg = formData.ejercicio.configuracion || { enunciado: '', pares: [{ concepto: '', definicion: '' }] };

  const setCfg = (update: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: { ...prev.ejercicio, configuracion: { ...cfg, ...update } }
    }));
  };

  const addPair = () => setCfg({ pares: [...(cfg.pares || []), { concepto: '', definicion: '' }] });
  const removePair = (idx: number) => {
    const pares = [...(cfg.pares || [])];
    pares.splice(idx, 1);
    setCfg({ pares });
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración: Relacionar</h3>
      <div>
        <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Enunciado *</label>
        <input
          type="text"
          value={cfg.enunciado}
          onChange={(e) => setCfg({ enunciado: e.target.value })}
          placeholder="Indica cómo deben relacionarse los conceptos"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#3A4A5B]">Pares concepto/definición *</label>
        {(cfg.pares || []).map((p: any, idx: number) => (
          <div key={idx} className="grid grid-cols-2 gap-2 items-center">
            <input
              type="text"
              value={p.concepto}
              onChange={(e) => {
                const pares = [...(cfg.pares || [])];
                pares[idx] = { ...pares[idx], concepto: e.target.value };
                setCfg({ pares });
              }}
              placeholder={`Concepto ${idx + 1}`}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={p.definicion}
                onChange={(e) => {
                  const pares = [...(cfg.pares || [])];
                  pares[idx] = { ...pares[idx], definicion: e.target.value };
                  setCfg({ pares });
                }}
                placeholder={`Definición ${idx + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
              />
              <button type="button" className="px-2 py-1 text-red-600 border rounded" onClick={() => removePair(idx)}>✕</button>
            </div>
          </div>
        ))}
        <button type="button" className="mt-2 px-3 py-1 bg-[#7ED6A7] text-white rounded" onClick={addPair}>Agregar par</button>
      </div>
    </div>
  );
}

// Componente para configuración de Diagramas UML
function UMLConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const handleOpcionChange = (campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...prev.ejercicio.configuracion,
          opciones: {
            ...prev.ejercicio.configuracion.opciones,
            [campo]: valor
          }
        }
      }
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración de Diagramas UML</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Clases Mínimas</label>
          <input
            type="number"
            min="0"
            value={formData.ejercicio.configuracion?.opciones?.minClasses || ''}
            onChange={(e) => handleOpcionChange('minClasses', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
            placeholder="Ej: 3"
          />
        </div>
        
        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            id="requireRelationships"
            checked={formData.ejercicio.configuracion?.opciones?.requireRelationships || false}
            onChange={(e) => handleOpcionChange('requireRelationships', e.target.checked)}
            className="w-4 h-4 text-[#4A90E2] border-gray-300 rounded focus:ring-[#4A90E2]"
          />
          <label htmlFor="requireRelationships" className="text-sm text-[#3A4A5B]">Requerir relaciones</label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="requireMultiplicities"
            checked={formData.ejercicio.configuracion?.opciones?.requireMultiplicities || false}
            onChange={(e) => handleOpcionChange('requireMultiplicities', e.target.checked)}
            className="w-4 h-4 text-[#4A90E2] border-gray-300 rounded focus:ring-[#4A90E2]"
          />
          <label htmlFor="requireMultiplicities" className="text-sm text-[#3A4A5B]">Requerir multiplicidades</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Diagrama Esperado (JSON)</label>
        <textarea
          value={formData.ejercicio.resultado_ejercicio}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            ejercicio: { ...prev.ejercicio, resultado_ejercicio: e.target.value }
          }))}
          placeholder='{"cells": []}'
          className="w-full min-h-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent font-mono text-xs"
        />
        <p className="text-xs text-gray-500 mt-1">Opcional: JSON del diagrama esperado para validación exacta</p>
      </div>
    </div>
  );
}

// Componente para configuración de Preguntas
function PreguntasConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const preguntas: Pregunta[] = formData.ejercicio.configuracion?.preguntas || [];

  const agregarPregunta = () => {
    const nuevaPregunta: Pregunta = {
      id: `pregunta-${Date.now()}`,
      enunciado: '',
      tipo: 'opcion-multiple',
      opciones: ['', '', '', ''],
      respuesta_correcta: 0
    };

    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...prev.ejercicio.configuracion,
          tipo: 'cuestionario',
          preguntas: [...preguntas, nuevaPregunta]
        }
      }
    }));
  };

  const eliminarPregunta = (id: string) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...prev.ejercicio.configuracion,
          preguntas: preguntas.filter(p => p.id !== id)
        }
      }
    }));
  };

  const actualizarPregunta = (id: string, campo: keyof Pregunta, valor: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...prev.ejercicio.configuracion,
          preguntas: preguntas.map(p => p.id === id ? { ...p, [campo]: valor } : p)
        }
      }
    }));
  };

  const actualizarOpcion = (preguntaId: string, indice: number, valor: string) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...prev.ejercicio.configuracion,
          preguntas: preguntas.map(p => {
            if (p.id === preguntaId && p.opciones) {
              const nuevasOpciones = [...p.opciones];
              nuevasOpciones[indice] = valor;
              return { ...p, opciones: nuevasOpciones };
            }
            return p;
          })
        }
      }
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración de Preguntas</h3>
        <button
          type="button"
          onClick={agregarPregunta}
          className="flex items-center gap-1 px-3 py-1 bg-[#7ED6A7] text-white rounded-lg hover:bg-[#6BC598] transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar Pregunta
        </button>
      </div>

      {preguntas.length === 0 ? (
        <p className="text-gray-500 text-sm italic text-center py-4">No hay preguntas. Haz clic en "Agregar Pregunta" para comenzar.</p>
      ) : (
        <div className="space-y-4">
          {preguntas.map((pregunta, idx) => (
            <div key={pregunta.id} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-[#3A4A5B]">Pregunta {idx + 1}</h4>
                <button
                  type="button"
                  onClick={() => eliminarPregunta(pregunta.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-1">Enunciado *</label>
                <input
                  type="text"
                  value={pregunta.enunciado}
                  onChange={(e) => actualizarPregunta(pregunta.id, 'enunciado', e.target.value)}
                  placeholder="Escribe la pregunta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-1">Tipo *</label>
                  <select
                    value={pregunta.tipo}
                    onChange={(e) => {
                      const nuevoTipo = e.target.value as 'opcion-multiple' | 'abierta';
                      const cambios: Partial<Pregunta> = { tipo: nuevoTipo };
                      if (nuevoTipo === 'opcion-multiple') {
                        cambios.opciones = ['', '', '', ''];
                        cambios.respuesta_correcta = 0;
                      } else {
                        cambios.opciones = undefined;
                        cambios.respuesta_correcta = '';
                      }
                      Object.entries(cambios).forEach(([campo, valor]) => {
                        actualizarPregunta(pregunta.id, campo as keyof Pregunta, valor);
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
                  >
                    <option value="opcion-multiple">Opción Múltiple</option>
                    <option value="abierta">Abierta</option>
                  </select>
                </div>

                {pregunta.tipo === 'abierta' && (
                  <div>
                    <label className="block text-sm font-medium text-[#3A4A5B] mb-1">Respuesta Correcta *</label>
                    <input
                      type="text"
                      value={pregunta.respuesta_correcta as string}
                      onChange={(e) => actualizarPregunta(pregunta.id, 'respuesta_correcta', e.target.value)}
                      placeholder="Respuesta esperada"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
                      required
                    />
                  </div>
                )}
              </div>

              {pregunta.tipo === 'opcion-multiple' && pregunta.opciones && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-[#3A4A5B]">Opciones *</label>
                  {pregunta.opciones.map((opcion, opcionIdx) => (
                    <div key={opcionIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`respuesta-${pregunta.id}`}
                        checked={pregunta.respuesta_correcta === opcionIdx}
                        onChange={() => actualizarPregunta(pregunta.id, 'respuesta_correcta', opcionIdx)}
                        className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
                      />
                      <input
                        type="text"
                        value={opcion}
                        onChange={(e) => actualizarOpcion(pregunta.id, opcionIdx, e.target.value)}
                        placeholder={`Opción ${opcionIdx + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm"
                        required
                      />
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">Selecciona el radio button de la respuesta correcta</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  
  const [tiposActividad, setTiposActividad] = useState<TipoActividad[]>([]);
  const [isLoadingTipos, setIsLoadingTipos] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ExerciseFormData>({
    actividad: {
      titulo: '',
      descripcion: '',
      nivel_dificultad: 'medio',
      tipo_actividad_id: ''
    },
    ejercicio: {
      contenido_id: '',
      puntos: '',
      resultado_ejercicio: '',
      tipo_ejercicio: 'Compilador',
      configuracion: {}
    }
  });

  useEffect(() => {
    loadEjercicios();
    loadContenidos();
    loadTiposActividad();
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

  const loadTiposActividad = async () => {
    setIsLoadingTipos(true);
    try {
      const res = await fetch('http://localhost:4000/tipoactividad');
      if (!res.ok) throw new Error('No se pudieron cargar los tipos de actividad');
      const data = await res.json();
      setTiposActividad(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error', { description: 'No se pudieron cargar los tipos de actividad' });
    } finally {
      setIsLoadingTipos(false);
    }
  };

  const openCreate = () => {
    setIsEditMode(false);
    setSelectedEjercicio(null);
    setValidationErrors({});
    setFormData({
      actividad: {
        titulo: '',
        descripcion: '',
        nivel_dificultad: 'medio',
        tipo_actividad_id: ''
      },
      ejercicio: {
        contenido_id: '',
        puntos: '',
        resultado_ejercicio: '',
        tipo_ejercicio: 'Compilador',
        configuracion: { tipo: 'programacion', esperado: '', lenguajesPermitidos: [] }
      }
    });
    setShowModal(true);
  };

  const openEdit = (item: EjercicioItem) => {
    setIsEditMode(true);
    setSelectedEjercicio(item);
    
    // Determinar configuración según tipo
    let configuracion = item.configuracion || {};
    // Detectar el subtipo real desde la configuración para ejercicios de tipo "Preguntas"
    let tipoReal = item.tipo_ejercicio;
    if (item.tipo_ejercicio === 'Preguntas' && configuracion.tipo) {
      if (configuracion.tipo === 'opcion-multiple') tipoReal = 'Opción multiple';
      else if (configuracion.tipo === 'ordenar') tipoReal = 'Ordenar';
      else if (configuracion.tipo === 'relacionar') tipoReal = 'Relacionar';
      else if (configuracion.tipo === 'cuestionario') tipoReal = 'Preguntas';
    }

    if (!item.tipo_ejercicio || item.tipo_ejercicio === 'Compilador') {
      configuracion = {
        tipo: 'programacion',
        esperado: configuracion.esperado || item.resultado_ejercicio || '',
        lenguajesPermitidos: configuracion.lenguajesPermitidos || []
      };
    } else if (item.tipo_ejercicio === 'Diagramas UML') {
      configuracion = {
        opciones: configuracion.opciones || {}
      };
    } else if (tipoReal === 'Preguntas') {
      configuracion = {
        tipo: 'cuestionario',
        preguntas: configuracion.preguntas || []
      };
    } else if (tipoReal === 'Opción multiple') {
      configuracion = {
        tipo: 'opcion-multiple',
        enunciado: configuracion.enunciado || '',
        opciones: configuracion.opciones || ['', '', '', ''],
        correctaIndex: typeof configuracion.correctaIndex === 'number' ? configuracion.correctaIndex : 0,
      };
    } else if (tipoReal === 'Ordenar') {
      configuracion = {
        tipo: 'ordenar',
        enunciado: configuracion.enunciado || '',
        items: Array.isArray(configuracion.items) ? configuracion.items : ['Item 1', 'Item 2', 'Item 3'],
      };
    } else if (tipoReal === 'Relacionar') {
      configuracion = {
        tipo: 'relacionar',
        enunciado: configuracion.enunciado || '',
        pares: Array.isArray(configuracion.pares) ? configuracion.pares : [{ concepto: '', definicion: '' }],
      };
    }

    setValidationErrors({});
    setFormData({
      actividad: {
        titulo: item.actividad?.titulo || '',
        descripcion: item.actividad?.descripcion || '',
        nivel_dificultad: (item.actividad?.nivel_dificultad as any) || 'medio',
        tipo_actividad_id: item.actividad?.tipo_actividad_id || ''
      },
      ejercicio: {
        contenido_id: item.contenido_id || '',
        puntos: item.puntos || '',
        resultado_ejercicio: item.resultado_ejercicio || '',
        tipo_ejercicio: tipoReal as ExerciseFormData['ejercicio']['tipo_ejercicio'],
        configuracion
      }
    });
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Limpiar error de validación al cambiar el campo
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (name.startsWith('actividad.')) {
      const key = name.replace('actividad.', '') as keyof ExerciseFormData['actividad'];
      setFormData((prev) => ({
        ...prev,
        actividad: {
          ...prev.actividad,
          [key]: key === 'tipo_actividad_id' ? (value ? Number(value) : '') : value
        }
      }));
    } else if (name.startsWith('ejercicio.')) {
      const key = name.replace('ejercicio.', '') as keyof ExerciseFormData['ejercicio'];
      
      // Manejar cambio de tipo de ejercicio
      if (key === 'tipo_ejercicio') {
        let nuevaConfiguracion = {};
        if (value === 'Compilador') {
          nuevaConfiguracion = { tipo: 'programacion', esperado: '', lenguajesPermitidos: [] };
        } else if (value === 'Diagramas UML') {
          nuevaConfiguracion = { opciones: {} };
        } else if (value === 'Preguntas') {
          nuevaConfiguracion = { tipo: 'cuestionario', preguntas: [] };
        } else if (value === 'Opción multiple') {
          nuevaConfiguracion = { tipo: 'opcion-multiple', enunciado: '', opciones: ['', '', '', ''], correctaIndex: 0 };
        } else if (value === 'Ordenar') {
          nuevaConfiguracion = { tipo: 'ordenar', enunciado: '', items: ['Item 1', 'Item 2', 'Item 3'] };
        } else if (value === 'Relacionar') {
          nuevaConfiguracion = { tipo: 'relacionar', enunciado: '', pares: [{ concepto: '', definicion: '' }] };
        }
        
        setFormData((prev) => ({
          ...prev,
          ejercicio: {
            ...prev.ejercicio,
            tipo_ejercicio: value as ExerciseFormData['ejercicio']['tipo_ejercicio'],
            configuracion: nuevaConfiguracion,
            resultado_ejercicio: '' // Limpiar al cambiar tipo
          }
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          ejercicio: {
            ...prev.ejercicio,
            [key]: key === 'contenido_id' || key === 'puntos' ? (value === '' ? '' : Number(value)) : value
          }
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.actividad.titulo || !formData.ejercicio.contenido_id || !formData.ejercicio.puntos) {
      toast.error('Campos requeridos', { description: 'Completa título, contenido y puntos.' });
      return;
    }

    // Validaciones específicas por tipo
    if (formData.ejercicio.tipo_ejercicio === 'Preguntas') {
      if (!formData.ejercicio.configuracion?.preguntas || formData.ejercicio.configuracion.preguntas.length === 0) {
        toast.error('Preguntas requeridas', { description: 'Agrega al menos una pregunta.' });
        return;
      }
    } else if (formData.ejercicio.tipo_ejercicio === 'Compilador') {
      if (!formData.ejercicio.configuracion?.esperado && !formData.ejercicio.resultado_ejercicio) {
        toast.error('Respuesta requerida', { description: 'Define la respuesta esperada.' });
        return;
      }
    } else if (formData.ejercicio.tipo_ejercicio === 'Opción multiple') {
      const cfg = formData.ejercicio.configuracion;
      if (!cfg?.enunciado || !Array.isArray(cfg.opciones) || cfg.opciones.some((o: string) => !o)) {
        toast.error('Opción múltiple incompleta', { description: 'Define enunciado y todas las opciones.' });
        return;
      }
    } else if (formData.ejercicio.tipo_ejercicio === 'Ordenar') {
      const cfg = formData.ejercicio.configuracion;
      if (!cfg?.enunciado || !Array.isArray(cfg.items) || cfg.items.length < 2) {
        toast.error('Ordenar incompleto', { description: 'Define enunciado y al menos dos ítems.' });
        return;
      }
    } else if (formData.ejercicio.tipo_ejercicio === 'Relacionar') {
      const cfg = formData.ejercicio.configuracion;
      if (!cfg?.enunciado || !Array.isArray(cfg.pares) || cfg.pares.some((p: any) => !p.concepto || !p.definicion)) {
        toast.error('Relacionar incompleto', { description: 'Agrega pares con concepto y definición.' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode && selectedEjercicio
        ? `http://localhost:4000/ejercicios/${selectedEjercicio.id}`
        : 'http://localhost:4000/ejercicios';

      // Preparar configuración según tipo
      let configuracionFinal = formData.ejercicio.configuracion;
      
      // Para Compilador, sincronizar esperado con resultado_ejercicio
      if (formData.ejercicio.tipo_ejercicio === 'Compilador') {
        configuracionFinal = {
          ...configuracionFinal,
          esperado: formData.ejercicio.resultado_ejercicio || configuracionFinal.esperado
        };
      }

      // Mapear tipo_ejercicio para el backend
      // El backend solo acepta: "Compilador", "Diagramas UML", "Preguntas"
      // Opción multiple, Ordenar, Relacionar son subtipos de Preguntas
      let tipoEjercicioBackend = formData.ejercicio.tipo_ejercicio;
      if (['Opción multiple', 'Ordenar', 'Relacionar'].includes(formData.ejercicio.tipo_ejercicio)) {
        tipoEjercicioBackend = 'Preguntas';
      }

      const body = JSON.stringify({
        actividad: {
          titulo: formData.actividad.titulo,
          descripcion: formData.actividad.descripcion,
          nivel_dificultad: formData.actividad.nivel_dificultad,
          tipo_actividad_id: formData.actividad.tipo_actividad_id
        },
        ejercicio: {
          contenido_id: formData.ejercicio.contenido_id,
          puntos: formData.ejercicio.puntos,
          resultado_ejercicio: formData.ejercicio.resultado_ejercicio,
          tipo_ejercicio: tipoEjercicioBackend,
          configuracion: configuracionFinal
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
      setValidationErrors({});
      toast.success(isEditMode ? 'Ejercicio actualizado' : 'Ejercicio creado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      // Resaltar campos con error según mensaje del backend
      const newErrors: Record<string, string> = {};
      if (errorMessage.includes('tipo_actividad_id')) {
        newErrors['actividad.tipo_actividad_id'] = 'Tipo de actividad es requerido';
      }
      if (errorMessage.includes('contenido_id')) {
        newErrors['ejercicio.contenido_id'] = 'Contenido es requerido y debe ser válido';
      }
      setValidationErrors(newErrors);
      
      toast.error('Error al guardar ejercicio', { 
        description: errorMessage,
        duration: 5000
      });
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
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Tipo</th>
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
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          e.tipo_ejercicio === 'Compilador' ? 'bg-blue-100 text-blue-700' :
                          e.tipo_ejercicio === 'Diagramas UML' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {e.tipo_ejercicio || 'Compilador'}
                        </span>
                      </td>
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

              {/* Tipo de actividad */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                  Tipo de Actividad *
                  {validationErrors['actividad.tipo_actividad_id'] && (
                    <span className="ml-2 text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationErrors['actividad.tipo_actividad_id']}
                    </span>
                  )}
                </label>
                <select
                  name="actividad.tipo_actividad_id"
                  value={formData.actividad.tipo_actividad_id}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent ${
                    validationErrors['actividad.tipo_actividad_id'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                  disabled={isLoadingTipos}
                >
                  <option value="">-- Seleccione un tipo de actividad --</option>
                  {tiposActividad.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
                {isLoadingTipos && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Loader className="w-3 h-3 animate-spin" />
                    Cargando tipos de actividad...
                  </p>
                )}
                {!isLoadingTipos && tiposActividad.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ No se pudieron cargar los tipos de actividad. Por favor, recarga la página.
                  </p>
                )}
              </div>

              {/* Ejercicio - Tipo */}
              <div>
                <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Tipo de Ejercicio *</label>
                <select
                  name="ejercicio.tipo_ejercicio"
                  value={formData.ejercicio.tipo_ejercicio}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                  required
                >
                  <option value="Compilador">Compilador</option>
                  <option value="Diagramas UML">Diagramas UML</option>
                  <option value="Preguntas">Preguntas</option>
                  <option value="Opción multiple">Opción múltiple</option>
                  <option value="Ordenar">Ordenar</option>
                  <option value="Relacionar">Relacionar</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.ejercicio.tipo_ejercicio === 'Compilador' && 'Ejercicio de programación con ejecución de código'}
                  {formData.ejercicio.tipo_ejercicio === 'Diagramas UML' && 'Ejercicio de creación de diagramas UML'}
                  {formData.ejercicio.tipo_ejercicio === 'Preguntas' && 'Cuestionario con preguntas y respuestas'}
                  {formData.ejercicio.tipo_ejercicio === 'Opción multiple' && 'Pregunta de opción múltiple (una correcta)'}
                  {formData.ejercicio.tipo_ejercicio === 'Ordenar' && 'Ordenar ítems para formar la secuencia correcta'}
                  {formData.ejercicio.tipo_ejercicio === 'Relacionar' && 'Relacionar conceptos con definiciones'}
                </p>
              </div>

              {/* Ejercicio - Campos comunes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3A4A5B] mb-2">
                    Contenido *
                    {validationErrors['ejercicio.contenido_id'] && (
                      <span className="ml-2 text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationErrors['ejercicio.contenido_id']}
                      </span>
                    )}
                  </label>
                  <select
                    name="ejercicio.contenido_id"
                    value={formData.ejercicio.contenido_id === '' ? '' : String(formData.ejercicio.contenido_id)}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent ${
                      validationErrors['ejercicio.contenido_id'] ? 'border-red-500' : 'border-gray-300'
                    }`}
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
              </div>

              {/* Configuración específica por tipo */}
              {formData.ejercicio.tipo_ejercicio === 'Compilador' && (
                <CompiladorConfig formData={formData} setFormData={setFormData} />
              )}

              {formData.ejercicio.tipo_ejercicio === 'Diagramas UML' && (
                <UMLConfig formData={formData} setFormData={setFormData} />
              )}

              {formData.ejercicio.tipo_ejercicio === 'Preguntas' && (
                <PreguntasConfig formData={formData} setFormData={setFormData} />
              )}

              {formData.ejercicio.tipo_ejercicio === 'Opción multiple' && (
                <MultipleChoiceConfig formData={formData} setFormData={setFormData} />
              )}

              {formData.ejercicio.tipo_ejercicio === 'Ordenar' && (
                <OrderingConfig formData={formData} setFormData={setFormData} />
              )}

              {formData.ejercicio.tipo_ejercicio === 'Relacionar' && (
                <MatchingConfig formData={formData} setFormData={setFormData} />
              )}

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
