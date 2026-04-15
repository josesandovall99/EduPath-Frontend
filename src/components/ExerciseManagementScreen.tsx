import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Edit, Eye, EyeOff, Search, Loader, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

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
  codigoEstructura?: string;
  tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar';
  configuracion?: any;
  actividad?: {
    id: number;
    titulo: string;
    descripcion?: string;
    nivel_dificultad?: 'facil' | 'medio' | 'dificil';
    fecha_creacion?: string;
    tipo_actividad_id?: number;
    estado?: boolean;
  };
  Contenido?: {
    id: number;
    titulo?: string;
    estado?: boolean;
  };
  contenido?: {
    id: number;
    titulo?: string;
    estado?: boolean;
  };
}

interface Pregunta {
  id: string;
  enunciado: string;
  tipo: 'opcion-unica' | 'abierta';
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
    codigoEstructura: string;
    tipo_ejercicio: 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar';
    configuracion: any;
  };
}

type MetodoDerivado = {
  nombre: string;
  retorno: string;
  parametros: Array<{ nombre: string; tipo: string }>;
};

const emptyCompilerCase = () => ({ inputs: '', output: '' });

const createDefaultCompilerConfig = () => ({
  tipo: 'programacion',
  lenguajesPermitidos: [62],
  sintaxis: [],
  casos_prueba: [emptyCompilerCase(), emptyCompilerCase(), emptyCompilerCase()],
  metodo: null,
});

const createDefaultUmlConfig = () => ({
  opciones: {
    minClasses: 2,
    requireRelationships: false,
    requireMultiplicities: false,
  }
});

function parseMethodTemplate(template: string): MetodoDerivado | null {
  const match = template.match(/(?:public|private|protected)?\s*(?:static\s+)?([A-Za-z_][A-Za-z0-9_<>\[\],\s?]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
  if (!match) return null;

  const parametros = match[3].trim()
    ? match[3].split(',').map((parametro) => parametro.trim()).filter(Boolean).map((parametro, index) => {
        const partes = parametro.split(/\s+/).filter(Boolean);
        if (partes.length < 2) {
          return { tipo: partes[0] || 'String', nombre: `arg${index}` };
        }
        const nombre = partes.pop() || `arg${index}`;
        return { tipo: partes.join(' '), nombre };
      })
    : [];

  return {
    retorno: match[1].trim(),
    nombre: match[2].trim(),
    parametros,
  };
}

function formatJavaLikeTemplate(input: string) {
  const lines = input.split('\n');
  let indentLevel = 0;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      const leadingClosers = (trimmed.match(/^\}+/) || [''])[0].length;
      indentLevel = Math.max(0, indentLevel - leadingClosers);

      const formatted = `${'    '.repeat(indentLevel)}${trimmed}`;

      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      indentLevel = Math.max(0, indentLevel + openBraces - closeBraces + leadingClosers);

      return formatted;
    })
    .join('\n');
}

// Componente para configuración de Compilador
function CompiladorConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const compilerConfig = {
    ...createDefaultCompilerConfig(),
    ...(formData.ejercicio.configuracion || {}),
  };
  const casosPrueba = Array.isArray(compilerConfig.casos_prueba) && compilerConfig.casos_prueba.length === 3
    ? compilerConfig.casos_prueba
    : [emptyCompilerCase(), emptyCompilerCase(), emptyCompilerCase()];
  const plantillaMetodo = formData.ejercicio.codigoEstructura || compilerConfig.metodo?.plantilla || '';
  const metodoDerivado = parseMethodTemplate(plantillaMetodo);

  const updateCompilerConfig = (updates: Record<string, any>, extraEjercicio: Partial<ExerciseFormData['ejercicio']> = {}) => {
    setFormData((prev) => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        ...extraEjercicio,
        configuracion: {
          ...createDefaultCompilerConfig(),
          ...prev.ejercicio.configuracion,
          ...updates,
        }
      }
    }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const plantilla = e.target.value;
    const metodo = parseMethodTemplate(plantilla);

    updateCompilerConfig({
      metodo: metodo ? { ...metodo, plantilla } : null,
      lenguajesPermitidos: [62],
      casos_prueba: casosPrueba,
    }, {
      codigoEstructura: plantilla,
    });
  };

  const handleFormatTemplate = () => {
    const plantillaFormateada = formatJavaLikeTemplate(plantillaMetodo || '');
    const metodo = parseMethodTemplate(plantillaFormateada);

    updateCompilerConfig({
      metodo: metodo ? { ...metodo, plantilla: plantillaFormateada } : null,
      lenguajesPermitidos: [62],
      casos_prueba: casosPrueba,
    }, {
      codigoEstructura: plantillaFormateada,
    });

    toast.success('Plantilla formateada');
  };

  const handleSintaxisChange = (sintaxis: string) => {
    const currentSintaxis = compilerConfig?.sintaxis || [];
    const newSintaxis = currentSintaxis.includes(sintaxis)
      ? currentSintaxis.filter((s: string) => s !== sintaxis)
      : [...currentSintaxis, sintaxis];

    updateCompilerConfig({ sintaxis: newSintaxis, casos_prueba: casosPrueba });
  };

  const handleCaseChange = (index: number, field: 'inputs' | 'output', value: string) => {
    const nuevosCasos = casosPrueba.map((caso: any, caseIndex: number) =>
      caseIndex === index ? { ...caso, [field]: value } : caso
    );

    updateCompilerConfig({
      casos_prueba: nuevosCasos,
      metodo: metodoDerivado ? { ...metodoDerivado, plantilla: plantillaMetodo } : compilerConfig.metodo,
    }, {
      resultado_ejercicio: nuevosCasos[0]?.output || 'Ejercicio con 3 casos de prueba'
    });
  };

  const sintaxisDisponibles = ['while', 'for', 'if', 'switch'];
  const sintaxisSeleccionadas = compilerConfig?.sintaxis || [];

  return (
    <div className="space-y-4 p-4 lg:p-5 bg-blue-50 rounded-xl border border-blue-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración de Compilador</h3>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-[#3A4A5B]">Plantilla del método *</label>
              <button
                type="button"
                onClick={handleFormatTemplate}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              >
                Dar formato
              </button>
            </div>
            <textarea
              value={plantillaMetodo}
              onChange={handleTemplateChange}
              placeholder={"public static int sumar(int a, int b) {\n    // TODO\n}"}
              rows={12}
              className="w-full min-h-64 lg:min-h-72 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent font-mono text-sm leading-7 bg-white resize-y"
              required
            />
            <p className="text-xs text-gray-500 mt-2">La plantilla del método es el campo principal. El backend encapsulará este método dentro de una clase Main y ejecutará los 3 casos automáticamente.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Método derivado</div>
              <div className="text-sm font-semibold text-[#3A4A5B]">{metodoDerivado?.nombre || 'Pendiente de derivar'}</div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Retorno</div>
              <div className="text-sm font-semibold text-[#3A4A5B]">{metodoDerivado?.retorno || 'Pendiente de derivar'}</div>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">Parámetros</div>
              <div className="text-sm font-semibold text-[#3A4A5B] break-words">
                {metodoDerivado?.parametros?.length
                  ? metodoDerivado.parametros.map((param) => `${param.tipo} ${param.nombre}`).join(', ')
                  : 'Pendiente de derivar'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-br from-white via-[#F8FBFF] to-[#EEF6FF] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-[#3A4A5B]">Restricciones técnicas (opcionales)</label>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                {sintaxisSeleccionadas.length} activas
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sintaxisDisponibles.map(sintaxis => {
                const active = sintaxisSeleccionadas.includes(sintaxis);
                return (
                  <label
                    key={sintaxis}
                    className={`group flex items-center gap-3.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-all ${
                      active
                        ? 'border-blue-300 bg-blue-50 shadow-[0_6px_16px_rgba(74,144,226,0.12)]'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleSintaxisChange(sintaxis)}
                      className="h-4 w-4 rounded border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2]"
                    />
                    <span className={`ml-2 text-sm font-mono ${active ? 'text-blue-800 font-semibold' : 'text-[#3A4A5B]'}`}>
                      {sintaxis}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">Solo se validan si el ejercicio las define. Si quedan vacías, el backend evaluará únicamente los 3 casos de prueba.</p>
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          <div>
            <label className="block text-sm font-medium text-[#3A4A5B] mb-2">Casos de prueba obligatorios *</label>
            <p className="text-xs text-gray-500 mb-3">Los inputs aceptan valores separados por comas, por ejemplo: 5,3</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {casosPrueba.map((caso: any, index: number) => (
              <div key={index} className="space-y-3 bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#3A4A5B]">Caso {index + 1}</div>
                <div>
                  <label className="block text-xs font-medium text-[#3A4A5B] mb-1">Inputs *</label>
                  <input
                    type="text"
                    value={caso.inputs || ''}
                    onChange={(e) => handleCaseChange(index, 'inputs', e.target.value)}
                    placeholder="Ej: 5,3"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3A4A5B] mb-1">Output esperado *</label>
                  <input
                    type="text"
                    value={caso.output || ''}
                    onChange={(e) => handleCaseChange(index, 'output', e.target.value)}
                    placeholder="Resultado esperado"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent text-sm font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuración: Opción única
function MultipleChoiceConfig({ formData, setFormData }: { formData: ExerciseFormData; setFormData: React.Dispatch<React.SetStateAction<ExerciseFormData>> }) {
  const cfg = formData.ejercicio.configuracion || { enunciado: '', opciones: ['', '', '', ''], respuestaCorrecta: '' };

  const setCfg = (update: any) => {
    const newCfg = { ...cfg, ...update };
    // Sincronizar resultado_ejercicio con respuestaCorrecta
    let resultado = formData.ejercicio.resultado_ejercicio;
    if ('respuestaCorrecta' in update) {
      resultado = update.respuestaCorrecta || '';
    }
    setFormData(prev => ({
      ...prev,
      ejercicio: { ...prev.ejercicio, configuracion: newCfg, resultado_ejercicio: resultado }
    }));
  };

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Configuración: Opción única</h3>
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
              checked={cfg.respuestaCorrecta === op}
              onChange={() => setCfg({ respuestaCorrecta: op })}
              className="w-4 h-4 text-[#4A90E2] border-gray-300 focus:ring-[#4A90E2]"
            />
            <input
              type="text"
              value={op}
              onChange={(e) => {
                const opciones = [...(cfg.opciones || [])];
                const oldValue = opciones[idx];
                opciones[idx] = e.target.value;
                // Si esta era la correcta, actualizar respuestaCorrecta
                const updates: any = { opciones };
                if (cfg.respuestaCorrecta === oldValue) {
                  updates.respuestaCorrecta = e.target.value;
                }
                setCfg(updates);
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
  const umlConfig = {
    ...createDefaultUmlConfig(),
    ...(formData.ejercicio.configuracion || {}),
    opciones: {
      ...createDefaultUmlConfig().opciones,
      ...(formData.ejercicio.configuracion?.opciones || {})
    }
  };

  const handleOpcionChange = (campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      ejercicio: {
        ...prev.ejercicio,
        configuracion: {
          ...umlConfig,
          opciones: {
            ...umlConfig.opciones,
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
            value={umlConfig.opciones.minClasses}
            onChange={(e) => handleOpcionChange('minClasses', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
            placeholder="Ej: 3"
          />
        </div>
        
        <div className="flex items-center gap-2 pt-7">
          <input
            type="checkbox"
            id="requireRelationships"
            checked={umlConfig.opciones.requireRelationships}
            onChange={(e) => handleOpcionChange('requireRelationships', e.target.checked)}
            className="w-4 h-4 text-[#4A90E2] border-gray-300 rounded focus:ring-[#4A90E2]"
          />
          <label htmlFor="requireRelationships" className="text-sm text-[#3A4A5B]">Requerir relaciones</label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="requireMultiplicities"
            checked={umlConfig.opciones.requireMultiplicities}
            onChange={(e) => handleOpcionChange('requireMultiplicities', e.target.checked)}
            className="w-4 h-4 text-[#4A90E2] border-gray-300 rounded focus:ring-[#4A90E2]"
          />
          <label htmlFor="requireMultiplicities" className="text-sm text-[#3A4A5B]">Requerir multiplicidades</label>
        </div>
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
      tipo: 'opcion-unica',
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
                      const nuevoTipo = e.target.value as 'opcion-unica' | 'abierta';
                      const cambios: Partial<Pregunta> = { tipo: nuevoTipo };
                      if (nuevoTipo === 'opcion-unica') {
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
                    <option value="opcion-unica">Opción Única</option>
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

              {pregunta.tipo === 'opcion-unica' && pregunta.opciones && (
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
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
        codigoEstructura: '',
      tipo_ejercicio: 'Compilador',
      configuracion: {}
    }
  });

  const getAuthHeaders = () => {
    const authToken = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    };
  };

  const isEjercicioActivo = (ejercicio: EjercicioItem) =>
    ejercicio.actividad?.estado !== false &&
    ejercicio.contenido?.estado !== false &&
    ejercicio.Contenido?.estado !== false;

  useEffect(() => {
    loadEjercicios();
    loadContenidos();
    loadTiposActividad();
  }, []);

  const loadEjercicios = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ejercicios`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
      const res = await fetch(`${API_BASE_URL}/contenidos`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
      const res = await fetch(`${API_BASE_URL}/tipoactividad`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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

  const handleToggleEstado = async (item: EjercicioItem) => {
    const currentlyActive = isEjercicioActivo(item);
    const actionLabel = currentlyActive ? 'inhabilitar' : 'habilitar';

    if (!window.confirm(`Deseas ${actionLabel} el ejercicio "${item.actividad?.titulo || `#${item.id}`}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/ejercicios/${item.id}/toggle-estado`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!res.ok) {
        let serverMessage = '';
        try {
          const asJson = await res.json();
          serverMessage = asJson?.message || JSON.stringify(asJson);
        } catch {
          serverMessage = await res.text().catch(() => '');
        }
        throw new Error(serverMessage || `No se pudo ${actionLabel} el ejercicio`);
      }

      const data = await res.json().catch(() => null);
      const updatedEstado = data?.estado ?? !currentlyActive;

      setEjercicios((prev) => prev.map((ejercicio) => (
        ejercicio.id === item.id
          ? {
              ...ejercicio,
              actividad: {
                ...ejercicio.actividad,
                id: ejercicio.actividad?.id || ejercicio.id,
                titulo: ejercicio.actividad?.titulo || `Ejercicio #${ejercicio.id}`,
                estado: updatedEstado,
              }
            }
          : ejercicio
      )));

      toast.success(`Ejercicio ${updatedEstado ? 'habilitado' : 'inhabilitado'}`, {
        description: `"${item.actividad?.titulo || `Ejercicio #${item.id}`}" cambió de estado correctamente.`
      });
    } catch (err) {
      toast.error('Error al cambiar estado', {
        description: err instanceof Error ? err.message : 'No se pudo actualizar el ejercicio'
      });
    }
  };

  const filteredEjercicios = useMemo(() => {
    return ejercicios.filter((ejercicio) => {
      const matchesState =
        stateFilter === 'all' ||
        (stateFilter === 'active' ? isEjercicioActivo(ejercicio) : !isEjercicioActivo(ejercicio));

      const searchableText = [
        ejercicio.actividad?.titulo,
        ejercicio.actividad?.descripcion,
        ejercicio.tipo_ejercicio,
        ejercicio.contenido?.titulo,
        ejercicio.Contenido?.titulo,
        String(ejercicio.puntos),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !searchTerm.trim() || searchableText.includes(searchTerm.trim().toLowerCase());

      return matchesState && matchesSearch;
    });
  }, [ejercicios, searchTerm, stateFilter]);

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
        codigoEstructura: '',
        tipo_ejercicio: 'Compilador',
        configuracion: createDefaultCompilerConfig()
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
      if (configuracion.tipo === 'opcion-unica') tipoReal = 'Opción única';
      else if (configuracion.tipo === 'ordenar') tipoReal = 'Ordenar';
      else if (configuracion.tipo === 'relacionar') tipoReal = 'Relacionar';
      else if (configuracion.tipo === 'cuestionario') tipoReal = 'Preguntas';
    }

    if (!item.tipo_ejercicio || item.tipo_ejercicio === 'Compilador') {
      const casos = Array.isArray(configuracion.casos_prueba) && configuracion.casos_prueba.length === 3
        ? configuracion.casos_prueba
        : [
            { inputs: '', output: configuracion.esperado || item.resultado_ejercicio || '' },
            emptyCompilerCase(),
            emptyCompilerCase()
          ];
      configuracion = {
        ...createDefaultCompilerConfig(),
        ...configuracion,
        casos_prueba: casos,
        metodo: configuracion.metodo || (item.codigoEstructura ? {
          ...(parseMethodTemplate(item.codigoEstructura) || {}),
          plantilla: item.codigoEstructura,
        } : null),
        lenguajesPermitidos: [62]
      };
    } else if (item.tipo_ejercicio === 'Diagramas UML') {
      configuracion = {
        ...createDefaultUmlConfig(),
        ...configuracion,
        opciones: {
          ...createDefaultUmlConfig().opciones,
          ...(configuracion.opciones || {})
        }
      };
    } else if (tipoReal === 'Preguntas') {
      configuracion = {
        tipo: 'cuestionario',
        preguntas: configuracion.preguntas || []
      };
    } else if (tipoReal === 'Opción única') {
      configuracion = {
        tipo: 'opcion-unica',
        enunciado: configuracion.enunciado || '',
        opciones: configuracion.opciones || ['', '', '', ''],
        respuestaCorrecta: configuracion.respuestaCorrecta || '',
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
        codigoEstructura: item.codigoEstructura || configuracion?.metodo?.plantilla || '',
        tipo_ejercicio: tipoReal as ExerciseFormData['ejercicio']['tipo_ejercicio'],
        configuracion
      }
    });
    setShowModal(true);
  };

  const selectedContenido = contenidosOptions.find(
    (contenido) => String(contenido.id) === String(formData.ejercicio.contenido_id)
  );
  const selectedTipoActividad = tiposActividad.find(
    (tipo) => String(tipo.id) === String(formData.actividad.tipo_actividad_id)
  );
  const exerciseTypeDescription =
    formData.ejercicio.tipo_ejercicio === 'Compilador'
      ? 'Ejercicio de programación con ejecución de código.'
      : formData.ejercicio.tipo_ejercicio === 'Diagramas UML'
        ? 'Ejercicio de construcción y validación de diagramas UML.'
        : formData.ejercicio.tipo_ejercicio === 'Preguntas'
          ? 'Cuestionario estructurado con preguntas y respuestas.'
          : formData.ejercicio.tipo_ejercicio === 'Opción única'
            ? 'Pregunta con una sola respuesta correcta.'
            : formData.ejercicio.tipo_ejercicio === 'Ordenar'
              ? 'Actividad para organizar elementos en el orden correcto.'
              : 'Actividad para relacionar conceptos entre sí.';
  const exerciseCompletion = [
    formData.actividad.titulo.trim(),
    formData.actividad.descripcion.trim(),
    formData.actividad.tipo_actividad_id,
    formData.ejercicio.tipo_ejercicio,
    formData.ejercicio.contenido_id,
    formData.ejercicio.puntos
  ].filter(Boolean).length;

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
          nuevaConfiguracion = createDefaultCompilerConfig();
        } else if (value === 'Diagramas UML') {
          nuevaConfiguracion = createDefaultUmlConfig();
        } else if (value === 'Preguntas') {
          nuevaConfiguracion = { tipo: 'cuestionario', preguntas: [] };
        } else if (value === 'Opción única') {
          nuevaConfiguracion = { tipo: 'opcion-unica', enunciado: '', opciones: ['', '', '', ''], respuestaCorrecta: '' };
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
            codigoEstructura: value === 'Compilador' ? prev.ejercicio.codigoEstructura : '',
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
    let compilerConfigForSubmit: any = null;
    let compilerResultForSubmit = formData.ejercicio.resultado_ejercicio;
    
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
      const plantilla = formData.ejercicio.codigoEstructura.trim();
      const metodoDerivado = parseMethodTemplate(plantilla);
      const casosPrueba = formData.ejercicio.configuracion?.casos_prueba || [];

      if (!plantilla || !metodoDerivado) {
        toast.error('Plantilla inválida', { description: 'La plantilla del método es obligatoria y debe incluir una firma Java válida.' });
        return;
      }
      if (!Array.isArray(casosPrueba) || casosPrueba.length !== 3) {
        toast.error('Casos de prueba requeridos', { description: 'Debes definir exactamente 3 casos de prueba.' });
        return;
      }
      for (let i = 0; i < casosPrueba.length; i += 1) {
        const caso = casosPrueba[i];
        if (!caso.output?.trim()) {
          toast.error('Caso de prueba incompleto', { description: `El caso ${i + 1} debe tener output esperado.` });
          return;
        }
      }

      const normalizedConfig = {
        ...createDefaultCompilerConfig(),
        ...formData.ejercicio.configuracion,
        lenguajesPermitidos: [62],
        metodo: { ...metodoDerivado, plantilla },
        casos_prueba: casosPrueba.map((caso: any) => ({
          inputs: (caso.inputs || '').toString().trim(),
          output: (caso.output || '').toString().trim(),
        }))
      };
      compilerConfigForSubmit = normalizedConfig;
      compilerResultForSubmit = normalizedConfig.casos_prueba[0]?.output || 'Ejercicio con 3 casos de prueba';
    } else if (formData.ejercicio.tipo_ejercicio === 'Opción única') {
      const cfg = formData.ejercicio.configuracion;
      if (!cfg?.enunciado || !Array.isArray(cfg.opciones) || cfg.opciones.some((o: string) => !o) || !cfg?.respuestaCorrecta) {
        toast.error('Opción única incompleta', { description: 'Define enunciado, todas las opciones y marca la correcta.' });
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
        ? `${API_BASE_URL}/ejercicios/${selectedEjercicio.id}`
        : `${API_BASE_URL}/ejercicios`;

      // Preparar configuración según tipo
      let configuracionFinal = formData.ejercicio.configuracion;
      let resultadoFinal = formData.ejercicio.resultado_ejercicio;
      
      // Para Compilador, sincronizar esperado con resultado_ejercicio
      if (formData.ejercicio.tipo_ejercicio === 'Compilador') {
        configuracionFinal = compilerConfigForSubmit;
        resultadoFinal = compilerResultForSubmit;
      }
      
      // Para Opción única, asegurar que resultado_ejercicio sea la respuesta correcta
      if (formData.ejercicio.tipo_ejercicio === 'Opción única') {
        resultadoFinal = configuracionFinal.respuestaCorrecta || '';
      }

      // Mapear tipo_ejercicio para el backend
      // El backend acepta: "Compilador", "Diagramas UML", "Preguntas", "Opción única", "Ordenar", "Relacionar"
      let tipoEjercicioBackend = formData.ejercicio.tipo_ejercicio;

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
          resultado_ejercicio: resultadoFinal,
          codigoEstructura: formData.ejercicio.codigoEstructura,
          tipo_ejercicio: tipoEjercicioBackend,
          configuracion: configuracionFinal
        }
      });

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
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

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_320px]">
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado del ejercicio</p>
                  <p className="mt-1 text-sm text-slate-600">Muestra ejercicios activos, inactivos o todos los registros.</p>
                </div>
                <div className="app-filter-row">
                  <button
                    onClick={() => setStateFilter('all')}
                    className={`app-filter-chip ${
                      stateFilter === 'all'
                        ? 'app-filter-chip--blue'
                        : ''
                    }`}
                  >
                    <span>Todos ({ejercicios.length})</span>
                  </button>
                  <button
                    onClick={() => setStateFilter('active')}
                    className={`app-filter-chip ${
                      stateFilter === 'active'
                        ? 'app-filter-chip--green'
                        : ''
                    }`}
                  >
                    <Eye className="h-4 w-4 shrink-0" />
                    <span>Activos ({ejercicios.filter((ejercicio) => isEjercicioActivo(ejercicio)).length})</span>
                  </button>
                  <button
                    onClick={() => setStateFilter('inactive')}
                    className={`app-filter-chip ${
                      stateFilter === 'inactive'
                        ? 'app-filter-chip--amber'
                        : ''
                    }`}
                  >
                    <EyeOff className="h-4 w-4 shrink-0" />
                    <span>Inactivos ({ejercicios.filter((ejercicio) => !isEjercicioActivo(ejercicio)).length})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 lg:border-l lg:border-t-0">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda rápida</p>
                <h3 className="mt-2 text-lg font-semibold text-[#3A4A5B]">Buscar ejercicio</h3>
                <p className="mt-1 text-sm text-slate-600">Busca por título, contenido, tipo o puntaje.</p>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ej: compilador, UML, 10 puntos"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/25"
                />
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resultados visibles</p>
                <p className="mt-2 text-2xl font-semibold text-[#3A4A5B]">{filteredEjercicios.length}</p>
              </div>
            </div>
          </div>
        </div>

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
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
                    <th className="px-6 py-4 text-center text-[#3A4A5B]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEjercicios.map((e) => {
                    const ejercicioActivo = isEjercicioActivo(e);

                    return (
                    <tr key={e.id} className={`transition-colors ${ejercicioActivo ? 'hover:bg-gray-50' : 'bg-slate-50/70 text-slate-500'}`}>
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
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.contenido?.titulo || e.Contenido?.titulo || `Contenido ID ${e.contenido_id}`}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.puntos}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{e.actividad?.nivel_dificultad || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          ejercicioActivo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ejercicioActivo ? 'Activo' : 'Inhabilitado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => openEdit(e)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(e)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              ejercicioActivo
                                ? 'text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={ejercicioActivo ? 'Inhabilitar ejercicio' : 'Habilitar ejercicio'}
                          >
                            {ejercicioActivo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span>{ejercicioActivo ? 'Inhabilitar' : 'Habilitar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div
            className="app-modal-card app-modal-card--xl"
            style={{ height: 'min(900px, calc(100vh - 1.5rem))', maxWidth: 'min(1800px, 99vw)' }}
          >
            <div className="app-modal-header">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="app-modal-kicker">Ejercicios</div>
                  <h2 className="app-modal-title">{isEditMode ? 'Editar ejercicio' : 'Crear nuevo ejercicio'}</h2>
                  <p className="app-modal-description">Configura la actividad base y luego completa la estructura específica según el tipo de ejercicio seleccionado.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="app-modal-meta hidden sm:block">
                    <div className="app-modal-meta-label">Tipo actual</div>
                    <div className="app-modal-meta-value">{formData.ejercicio.tipo_ejercicio}</div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="app-modal-close"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="app-modal-scroll">
              <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
                <form id="exercise-form" onSubmit={handleSubmit} className="app-form-main app-form-stack">
                  {!isEditMode && (
                    <div className="app-form-note">
                      Primero define los datos comunes del ejercicio. Después podrás completar la configuración específica del tipo seleccionado en este mismo flujo.
                    </div>
                  )}

                  <section className="app-form-section app-form-section--muted">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Actividad base</h4>
                      <p className="app-form-section-description">Estos datos identifican la actividad dentro del catálogo general del panel administrativo.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label">Título *</label>
                        <input
                          type="text"
                          name="actividad.titulo"
                          value={formData.actividad.titulo}
                          onChange={handleChange}
                          placeholder="Ingrese el título"
                          className="app-form-input"
                          required
                        />
                      </div>
                      <div className="app-form-field">
                        <label className="app-form-label">Nivel de dificultad *</label>
                        <select
                          name="actividad.nivel_dificultad"
                          value={formData.actividad.nivel_dificultad}
                          onChange={handleChange}
                          className="app-form-select"
                        >
                          <option value="facil">Fácil</option>
                          <option value="medio">Medio</option>
                          <option value="dificil">Difícil</option>
                        </select>
                      </div>
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Descripción *</label>
                        <textarea
                          name="actividad.descripcion"
                          value={formData.actividad.descripcion}
                          onChange={handleChange}
                          placeholder="Ingrese la descripción"
                          className="app-form-textarea"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Configuración general</h4>
                      <p className="app-form-section-description">Selecciona el tipo de actividad, el contenido asociado y la mecánica general del ejercicio.</p>
                    </div>

                    <div className="app-form-grid app-form-grid-2">
                      <div className="app-form-field">
                        <label className="app-form-label">Tipo de actividad *</label>
                        <select
                          name="actividad.tipo_actividad_id"
                          value={formData.actividad.tipo_actividad_id}
                          onChange={handleChange}
                          className={`app-form-select ${validationErrors['actividad.tipo_actividad_id'] ? 'border-red-500' : ''}`}
                          required
                          disabled={isLoadingTipos}
                        >
                          <option value="">-- Seleccione un tipo de actividad --</option>
                          {tiposActividad.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>
                              {tipo.nombre}
                            </option>
                          ))}
                        </select>
                        {validationErrors['actividad.tipo_actividad_id'] && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors['actividad.tipo_actividad_id']}
                          </p>
                        )}
                        {isLoadingTipos && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Loader className="w-3 h-3 animate-spin" />
                            Cargando tipos de actividad...
                          </p>
                        )}
                        {!isLoadingTipos && tiposActividad.length === 0 && (
                          <p className="text-xs text-amber-600">No se pudieron cargar los tipos de actividad. Recarga la página.</p>
                        )}
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Tipo de ejercicio *</label>
                        <select
                          name="ejercicio.tipo_ejercicio"
                          value={formData.ejercicio.tipo_ejercicio}
                          onChange={handleChange}
                          className="app-form-select"
                          required
                        >
                          <option value="Compilador">Compilador</option>
                          <option value="Diagramas UML">Diagramas UML</option>
                          <option value="Preguntas">Preguntas</option>
                          <option value="Opción única">Opción única</option>
                          <option value="Ordenar">Ordenar</option>
                          <option value="Relacionar">Relacionar</option>
                        </select>
                        <p className="text-xs text-gray-500">{exerciseTypeDescription}</p>
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Contenido *</label>
                        <select
                          name="ejercicio.contenido_id"
                          value={formData.ejercicio.contenido_id === '' ? '' : String(formData.ejercicio.contenido_id)}
                          onChange={handleChange}
                          className={`app-form-select ${validationErrors['ejercicio.contenido_id'] ? 'border-red-500' : ''}`}
                          required
                          disabled={isLoadingContenidos}
                        >
                          <option value="" disabled>
                            {isLoadingContenidos ? 'Cargando contenidos...' : 'Seleccione un contenido'}
                          </option>
                          {contenidosOptions.map((contenido) => (
                            <option key={contenido.id} value={String(contenido.id)}>
                              {contenido.titulo} (ID {contenido.id})
                            </option>
                          ))}
                        </select>
                        {validationErrors['ejercicio.contenido_id'] && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors['ejercicio.contenido_id']}
                          </p>
                        )}
                      </div>

                      <div className="app-form-field">
                        <label className="app-form-label">Puntos *</label>
                        <input
                          type="number"
                          name="ejercicio.puntos"
                          value={formData.ejercicio.puntos}
                          onChange={handleChange}
                          min={0}
                          className="app-form-input"
                          required
                        />
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <div className="mb-4 space-y-1.5">
                      <h4 className="app-form-section-title">Configuración específica</h4>
                      <p className="app-form-section-description">Completa los parámetros que solo aplican al tipo de ejercicio seleccionado actualmente.</p>
                    </div>

                    <div className="space-y-4">
                      {formData.ejercicio.tipo_ejercicio === 'Compilador' && (
                        <CompiladorConfig formData={formData} setFormData={setFormData} />
                      )}

                      {formData.ejercicio.tipo_ejercicio === 'Diagramas UML' && (
                        <UMLConfig formData={formData} setFormData={setFormData} />
                      )}

                      {formData.ejercicio.tipo_ejercicio === 'Preguntas' && (
                        <PreguntasConfig formData={formData} setFormData={setFormData} />
                      )}

                      {formData.ejercicio.tipo_ejercicio === 'Opción única' && (
                        <MultipleChoiceConfig formData={formData} setFormData={setFormData} />
                      )}

                      {formData.ejercicio.tipo_ejercicio === 'Ordenar' && (
                        <OrderingConfig formData={formData} setFormData={setFormData} />
                      )}

                      {formData.ejercicio.tipo_ejercicio === 'Relacionar' && (
                        <MatchingConfig formData={formData} setFormData={setFormData} />
                      )}
                    </div>
                  </section>
                </form>

                <aside className="app-form-aside app-form-stack md:self-start">
                  <section className="app-form-section app-form-section--accent">
                    <h4 className="app-form-section-title">Resumen del ejercicio</h4>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Actividad</div>
                        <div className="app-form-summary-value">{formData.actividad.titulo.trim() || 'Sin título definido'}</div>
                        <div className="app-form-summary-help">{formData.actividad.descripcion.trim() || 'Descripción pendiente'}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Tipo</div>
                          <div className="app-form-summary-value">{formData.ejercicio.tipo_ejercicio}</div>
                          <div className="app-form-summary-help">{selectedTipoActividad?.nombre || 'Tipo de actividad pendiente'}</div>
                        </div>
                        <div className="app-form-summary-card">
                          <div className="app-form-summary-label">Puntaje</div>
                          <div className="app-form-summary-value">{formData.ejercicio.puntos || 'Pendiente'}</div>
                          <div className="app-form-summary-help">Dificultad: {formData.actividad.nivel_dificultad}</div>
                        </div>
                      </div>
                      <div className="app-form-note">
                        <div className="app-form-summary-label">Contenido vinculado</div>
                        <div className="app-form-summary-value">{selectedContenido?.titulo || 'Selecciona un contenido'}</div>
                        <div className="app-form-summary-help">Avance del formulario: {exerciseCompletion}/6 campos generales completos.</div>
                      </div>
                    </div>
                  </section>

                  <section className="app-form-section">
                    <h4 className="app-form-section-title">Antes de guardar</h4>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                      <p>Verifica que el tipo de ejercicio sí coincida con la interacción esperada para el estudiante.</p>
                      <p>Comprueba que el contenido asociado sea correcto, porque desde ahí se contextualiza la actividad.</p>
                      <p>Completa la configuración específica antes de guardar para evitar ejercicios incompletos en producción.</p>
                    </div>
                  </section>
                </aside>
              </div>
            </div>

            <div className="app-form-footer">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
                className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="exercise-form"
                disabled={isSaving}
                className="app-btn app-btn-success rounded-xl px-6 py-3 text-white disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{isEditMode ? 'Actualizar Ejercicio' : 'Crear Ejercicio'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExerciseManagementScreen;
