import { ClipboardList, Code2, GitBranchPlus, Grip, ListChecks, MessagesSquare, Plus, Shapes, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CompilerCase,
  ConfigurableExerciseType,
  EmbeddedExercise,
  EmbeddedQuestion,
  createDefaultCompilerConfig,
  createEmptyEmbeddedExercise,
  formatJavaLikeTemplate,
  parseMethodTemplate,
} from './configurableEmbeddedExercises';

interface ConfigurableEmbeddedExerciseEditorProps {
  exercises: EmbeddedExercise[];
  onChange: (exercises: EmbeddedExercise[]) => void;
}

const EXERCISE_TYPES: ConfigurableExerciseType[] = ['Compilador', 'Diagramas UML', 'Preguntas', 'Opción única', 'Ordenar', 'Relacionar'];

const EXERCISE_TYPE_META: Record<ConfigurableExerciseType, { icon: typeof Code2; accent: string; soft: string; label: string }> = {
  Compilador: { icon: Code2, accent: 'text-sky-700', soft: 'bg-sky-50 border-sky-200', label: 'Código' },
  'Diagramas UML': { icon: GitBranchPlus, accent: 'text-emerald-700', soft: 'bg-emerald-50 border-emerald-200', label: 'Modelado' },
  Preguntas: { icon: MessagesSquare, accent: 'text-amber-700', soft: 'bg-amber-50 border-amber-200', label: 'Cuestionario' },
  'Opción única': { icon: ListChecks, accent: 'text-violet-700', soft: 'bg-violet-50 border-violet-200', label: 'Selección' },
  Ordenar: { icon: Grip, accent: 'text-cyan-700', soft: 'bg-cyan-50 border-cyan-200', label: 'Secuencia' },
  Relacionar: { icon: Shapes, accent: 'text-rose-700', soft: 'bg-rose-50 border-rose-200', label: 'Asociación' },
};

function updateExerciseAt(exercises: EmbeddedExercise[], index: number, updater: (current: EmbeddedExercise) => EmbeddedExercise) {
  return exercises.map((exercise, exerciseIndex) => exerciseIndex === index ? updater(exercise) : exercise);
}

export function ConfigurableEmbeddedExerciseEditor({ exercises, onChange }: ConfigurableEmbeddedExerciseEditorProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exercises[0]?.id || null);
  const [editingTypeExerciseId, setEditingTypeExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (exercises.length === 0) {
      setSelectedExerciseId(null);
      setEditingTypeExerciseId(null);
      return;
    }
    if (!selectedExerciseId || !exercises.some((exercise) => exercise.id === selectedExerciseId)) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

  const selectedIndex = useMemo(() => exercises.findIndex((exercise) => exercise.id === selectedExerciseId), [exercises, selectedExerciseId]);
  const selectedExercise = selectedIndex >= 0 ? exercises[selectedIndex] : null;

  const handleAddExercise = (type: ConfigurableExerciseType) => {
    const nextExercise = createEmptyEmbeddedExercise(type);
    onChange([...exercises, nextExercise]);
    setSelectedExerciseId(nextExercise.id);
    setEditingTypeExerciseId(null);
  };

  const handleUpdateExercise = (index: number, updates: Partial<EmbeddedExercise>) => {
    onChange(updateExerciseAt(exercises, index, (current) => ({ ...current, ...updates })));
  };

  const handleUpdateConfig = (index: number, updates: Record<string, unknown>) => {
    onChange(updateExerciseAt(exercises, index, (current) => ({
      ...current,
      configuracion: {
        ...(current.configuracion || {}),
        ...updates,
      },
    })));
  };

  const handleRemoveExercise = (index: number) => {
    const targetId = exercises[index]?.id;
    const nextExercises = exercises.filter((_, exerciseIndex) => exerciseIndex !== index);
    onChange(nextExercises);
    if (editingTypeExerciseId === targetId) setEditingTypeExerciseId(null);
    if (selectedExerciseId === targetId) setSelectedExerciseId(nextExercises[0]?.id || null);
  };

  const handleChangeExerciseType = (index: number, nextType: ConfigurableExerciseType) => {
    onChange(updateExerciseAt(exercises, index, (current) => {
      const nextExercise = createEmptyEmbeddedExercise(nextType);
      return {
        ...nextExercise,
        id: current.id,
        titulo: current.titulo,
        descripcion: current.descripcion,
        puntos: current.puntos,
      };
    }));
    setEditingTypeExerciseId(null);
  };

  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(58,74,91,0.08)]">
      <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            <ClipboardList className="h-3.5 w-3.5" />
            Constructor del miniproyecto
          </div>
          <h3 className="text-sm font-semibold text-[#243447] md:text-base">Ejercicios embebidos del miniproyecto</h3>
          <p className="max-w-2xl text-xs leading-5 text-slate-500">Configura la secuencia del estudiante y edita un ejercicio a la vez.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">{exercises.length} ejercicios</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">Activo: {selectedExercise ? selectedExercise.titulo : 'Sin selección'}</span>
        </div>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-[#243447]">Agregar ejercicio</div>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => handleAddExercise(type)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium text-[#243447] transition-all hover:-translate-y-0.5 ${EXERCISE_TYPE_META[type].soft}`}>
              <Plus className="h-4 w-4" />
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          Agrega al menos un ejercicio para este miniproyecto.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[216px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)]">
          <aside className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:h-fit">
            <div className="mb-2 text-sm font-semibold text-[#243447]">Mapa del miniproyecto</div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {exercises.map((exercise, index) => {
                const isActive = exercise.id === selectedExerciseId;
                const meta = EXERCISE_TYPE_META[exercise.tipo_ejercicio];
                const Icon = meta.icon;
                return (
                  <button key={exercise.id} type="button" onClick={() => setSelectedExerciseId(exercise.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${isActive ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ejercicio {index + 1}</div>
                    <div className="mt-1 truncate text-xs font-semibold text-[#243447]">{exercise.titulo || `Ejercicio ${index + 1}`}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      <Icon className={`h-3.5 w-3.5 ${meta.accent}`} />
                      {meta.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            {selectedExercise ? (() => {
              const exercise = selectedExercise;
              const index = selectedIndex;
              const compilerConfig = exercise.tipo_ejercicio === 'Compilador' ? { ...createDefaultCompilerConfig(), ...(exercise.configuracion || {}) } : null;
              const methodTemplate = exercise.codigoEstructura || compilerConfig?.metodo?.plantilla || '';
              const derivedMethod = compilerConfig ? parseMethodTemplate(methodTemplate) : null;
              const compilerCases: CompilerCase[] = compilerConfig?.casos_prueba || [];
              const questions: EmbeddedQuestion[] = Array.isArray(exercise.configuracion?.preguntas) ? exercise.configuracion.preguntas : [];
              const options: string[] = Array.isArray(exercise.configuracion?.opciones) ? exercise.configuracion.opciones : [];
              const orderingItems: string[] = Array.isArray(exercise.configuracion?.items) ? exercise.configuracion.items : [];
              const matchingPairs: Array<{ concepto: string; definicion: string }> = Array.isArray(exercise.configuracion?.pares) ? exercise.configuracion.pares : [];

              return (
                <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ejercicio {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-[#243447]">{exercise.titulo || `Ejercicio ${index + 1}`}</div>
                    </div>
                    <button type="button" onClick={() => handleRemoveExercise(index)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100">
                      <Trash2 className="h-4 w-4" />
                      <span>Eliminar ejercicio</span>
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-600">Título del ejercicio</label>
                      <input value={exercise.titulo} onChange={(event) => handleUpdateExercise(index, { titulo: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium text-slate-600">Tipo elegido</label>
                        <button type="button" onClick={() => setEditingTypeExerciseId((current) => current === exercise.id ? null : exercise.id)} className="text-xs font-semibold text-sky-700 transition-colors hover:text-sky-800">
                          {editingTypeExerciseId === exercise.id ? 'Cancelar' : 'Cambiar tipo'}
                        </button>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{exercise.tipo_ejercicio}</span>
                      {editingTypeExerciseId === exercise.id ? (
                        <select value={exercise.tipo_ejercicio} onChange={(event) => handleChangeExerciseType(index, event.target.value as ConfigurableExerciseType)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                          {EXERCISE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-600">Puntos</label>
                      <input type="number" min={1} value={exercise.puntos} onChange={(event) => handleUpdateExercise(index, { puntos: Number(event.target.value) || 1 })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" />
                    </div>
                    <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <label className="mb-1.5 block text-sm font-medium text-slate-600">Descripción</label>
                      <textarea value={exercise.descripcion} onChange={(event) => handleUpdateExercise(index, { descripcion: event.target.value })} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {exercise.tipo_ejercicio === 'Compilador' ? (
                      <div className="space-y-4 rounded-[20px] border border-sky-100 bg-sky-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="block text-sm font-semibold text-[#243447]">Plantilla Java</label>
                          <button type="button" onClick={() => handleUpdateExercise(index, { codigoEstructura: formatJavaLikeTemplate(methodTemplate) })} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">Dar formato</button>
                        </div>
                        <textarea
                          value={methodTemplate}
                          onChange={(event) => {
                            const plantilla = event.target.value;
                            const metodo = parseMethodTemplate(plantilla);
                            handleUpdateExercise(index, { codigoEstructura: plantilla, configuracion: { ...compilerConfig, metodo: metodo ? { ...metodo, plantilla } : null } });
                          }}
                          rows={8}
                          className="w-full rounded-[18px] border border-sky-100 bg-white px-4 py-3 font-mono text-sm leading-6"
                        />
                        <div className="text-xs text-slate-500">Método derivado: {derivedMethod ? `${derivedMethod.retorno} ${derivedMethod.nombre}(${derivedMethod.parametros.map((param) => `${param.tipo} ${param.nombre}`).join(', ')})` : 'Firma pendiente de detectar'}</div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          {(compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((caseItem, caseIndex) => (
                            <div key={`${exercise.id}-case-${caseIndex}`} className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Caso {caseIndex + 1}</div>
                              <input value={caseItem.inputs || ''} onChange={(event) => {
                                const nextCases = (compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((item, itemIndex) => itemIndex === caseIndex ? { ...item, inputs: event.target.value } : item);
                                handleUpdateConfig(index, { casos_prueba: nextCases });
                              }} placeholder="Inputs" className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                              <input value={caseItem.output || ''} onChange={(event) => {
                                const nextCases = (compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((item, itemIndex) => itemIndex === caseIndex ? { ...item, output: event.target.value } : item);
                                handleUpdateExercise(index, { resultado_ejercicio: nextCases[0]?.output || '', configuracion: { ...compilerConfig, casos_prueba: nextCases } });
                              }} placeholder="Output esperado" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {exercise.tipo_ejercicio === 'Opción única' ? (
                      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:p-5">
                        <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                        <div className="grid gap-3 md:grid-cols-2">
                          {options.map((option, optionIndex) => (
                            <input key={`${exercise.id}-option-${optionIndex}`} value={option} onChange={(event) => {
                              const nextOptions = options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item);
                              handleUpdateConfig(index, { opciones: nextOptions });
                            }} placeholder={`Opción ${optionIndex + 1}`} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {exercise.tipo_ejercicio === 'Ordenar' ? (
                      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:p-5">
                        <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                        {orderingItems.map((item, itemIndex) => (
                          <input key={`${exercise.id}-item-${itemIndex}`} value={item} onChange={(event) => {
                            const nextItems = orderingItems.map((currentItem, currentIndex) => currentIndex === itemIndex ? event.target.value : currentItem);
                            handleUpdateConfig(index, { items: nextItems });
                          }} placeholder={`Ítem ${itemIndex + 1}`} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                        ))}
                      </div>
                    ) : null}

                    {exercise.tipo_ejercicio === 'Relacionar' ? (
                      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:p-5">
                        <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                        {matchingPairs.map((pair, pairIndex) => (
                          <div key={`${exercise.id}-pair-${pairIndex}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2">
                            <input value={pair.concepto} onChange={(event) => {
                              const nextPairs = matchingPairs.map((currentPair, currentIndex) => currentIndex === pairIndex ? { ...currentPair, concepto: event.target.value } : currentPair);
                              handleUpdateConfig(index, { pares: nextPairs });
                            }} placeholder="Concepto" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                            <input value={pair.definicion} onChange={(event) => {
                              const nextPairs = matchingPairs.map((currentPair, currentIndex) => currentIndex === pairIndex ? { ...currentPair, definicion: event.target.value } : currentPair);
                              handleUpdateConfig(index, { pares: nextPairs });
                            }} placeholder="Definición" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {exercise.tipo_ejercicio === 'Diagramas UML' ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <label className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-[#243447]">
                          <span className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Clases mínimas</span>
                          <input type="number" min={1} value={exercise.configuracion?.opciones?.minClasses ?? 2} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), minClasses: Number(event.target.value) || 1 } })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
                        </label>
                        <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-[#243447]">
                          <input type="checkbox" checked={Boolean(exercise.configuracion?.opciones?.requireRelationships)} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), requireRelationships: event.target.checked } })} className="h-4 w-4" />
                          Exigir relaciones
                        </label>
                        <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-[#243447]">
                          <input type="checkbox" checked={Boolean(exercise.configuracion?.opciones?.requireMultiplicities)} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), requireMultiplicities: event.target.checked } })} className="h-4 w-4" />
                          Exigir multiplicidades
                        </label>
                      </div>
                    ) : null}

                    {exercise.tipo_ejercicio === 'Preguntas' ? (
                      <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:p-5">
                        {questions.map((question, questionIndex) => (
                          <div key={question.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex flex-col gap-3 md:flex-row">
                              <input value={question.enunciado} onChange={(event) => {
                                const nextQuestions = questions.map((currentQuestion, currentIndex) => currentIndex === questionIndex ? { ...currentQuestion, enunciado: event.target.value } : currentQuestion);
                                handleUpdateConfig(index, { preguntas: nextQuestions });
                              }} placeholder={`Pregunta ${questionIndex + 1}`} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                              <select value={question.tipo} onChange={(event) => {
                                const nextQuestions = questions.map((currentQuestion, currentIndex) => currentIndex === questionIndex ? { ...currentQuestion, tipo: event.target.value as EmbeddedQuestion['tipo'], opciones: event.target.value === 'abierta' ? [] : (currentQuestion.opciones && currentQuestion.opciones.length > 0 ? currentQuestion.opciones : ['Opción 1', 'Opción 2']), respuesta_correcta: event.target.value === 'abierta' ? '' : (currentQuestion.opciones?.[0] || '') } : currentQuestion);
                                handleUpdateConfig(index, { preguntas: nextQuestions });
                              }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                                <option value="opcion-multiple">Opción múltiple</option>
                                <option value="abierta">Abierta</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })() : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigurableEmbeddedExerciseEditor;