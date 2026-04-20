import { ClipboardList, Code2, GitBranchPlus, Grip, ListChecks, MessagesSquare, Plus, Shapes, Trash2 } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
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
  supportPanels?: ReactNode;
}

const EXERCISE_TYPES: ConfigurableExerciseType[] = ['Compilador', 'Diagramas UML', 'Preguntas', 'Opción única', 'Ordenar', 'Relacionar'];
const ADDABLE_EXERCISE_TYPES: ConfigurableExerciseType[] = EXERCISE_TYPES.filter((type) => type !== 'Preguntas');

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

export function ConfigurableEmbeddedExerciseEditor({ exercises, onChange, supportPanels }: ConfigurableEmbeddedExerciseEditorProps) {
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
  const selectedLabel = selectedExercise ? selectedExercise.titulo || `Ejercicio ${selectedIndex + 1}` : 'Sin selección';

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

    if (editingTypeExerciseId === targetId) {
      setEditingTypeExerciseId(null);
    }

    if (selectedExerciseId === targetId) {
      setSelectedExerciseId(nextExercises[0]?.id || null);
    }
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

  const builderHeader = (
    <header className="app-miniproyecto-builder-header">
      <div className="app-miniproyecto-builder-header__copy">
        <div className="app-miniproyecto-builder-header__eyebrow">
          <ClipboardList className="h-3.5 w-3.5" />
          Constructor del miniproyecto
        </div>
        <h3 className="app-miniproyecto-builder-header__title">Ejercicios embebidos del miniproyecto</h3>
        <p className="app-miniproyecto-builder-header__description">Selecciona un bloque en la franja superior, agrega nuevos ejercicios desde la banda lateral y edita el activo en el visualizador inferior.</p>
      </div>

      <div className="app-miniproyecto-builder-header__chips">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          {exercises.length} ejercicios
        </span>
        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm">
          Activo: {selectedLabel}
        </span>
      </div>
    </header>
  );

  const builderActionsPanel = (
    <section className="app-miniproyecto-builder-panel app-miniproyecto-builder-panel--actions">
      <div className="app-miniproyecto-builder-panel__intro">
        <div>
          <div className="text-sm font-semibold text-[#243447]">Agregar ejercicio</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Bloques disponibles para extender el flujo activo.</p>
        </div>
      </div>

      <div className="app-miniproyecto-builder-actions-menu">
        {ADDABLE_EXERCISE_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          const Icon = meta.icon;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleAddExercise(type)}
              className="app-miniproyecto-builder-type-button"
            >
              <span className="app-miniproyecto-builder-type-button__content">
                <span className={`app-miniproyecto-builder-type-button__icon ${meta.soft}`}>
                  <Icon className={`h-4 w-4 ${meta.accent}`} />
                  <Plus className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <span className="app-miniproyecto-builder-type-button__text">
                  <span className="app-miniproyecto-builder-type-button__title">{type}</span>
                  <span className="app-miniproyecto-builder-type-button__meta">{meta.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const exerciseSelectorPanel = (
    <section className="app-miniproyecto-builder-panel app-miniproyecto-builder-panel--selector">
      <div className="app-miniproyecto-builder-panel__intro">
        <div>
          <div className="text-sm font-semibold text-[#243447]">Flujo de ejercicios</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Navega entre ejercicios antes de editar el bloque activo.</p>
        </div>
        <div className="app-miniproyecto-builder-panel__status">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
            Flujo actual
          </span>
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Aún no hay ejercicios en el flujo. Agrégalos desde el submenú lateral.
        </div>
      ) : (
        <div className="app-miniproyecto-embedded-map-grid app-miniproyecto-embedded-map-grid--selector mt-4">
          {exercises.map((exercise, index) => {
            const isActive = exercise.id === selectedExerciseId;
            const meta = EXERCISE_TYPE_META[exercise.tipo_ejercicio];
            const Icon = meta.icon;

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => setSelectedExerciseId(exercise.id)}
                className={`app-miniproyecto-flow-card ${isActive ? 'app-miniproyecto-flow-card--active' : ''}`}
              >
                <div className="app-miniproyecto-flow-card__head">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ejercicio {index + 1}</div>
                    <div className="app-miniproyecto-flow-card__title">{exercise.titulo || `Ejercicio ${index + 1}`}</div>
                  </div>
                  <span className={`app-miniproyecto-flow-card__icon ${meta.soft}`}>
                    <Icon className={`h-4 w-4 ${meta.accent}`} />
                  </span>
                </div>
                <div className="app-miniproyecto-flow-card__chips">
                  <span className="app-miniproyecto-flow-card__chip">{exercise.tipo_ejercicio}</span>
                  <span className="app-miniproyecto-flow-card__chip app-miniproyecto-flow-card__chip--muted">{exercise.puntos} pts</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="app-miniproyecto-embedded-editor space-y-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(58,74,91,0.07)]">
      <div className="app-miniproyecto-builder-stack">
        {builderHeader}

        <div className="app-miniproyecto-builder-layout">
          <div className="app-miniproyecto-builder-main min-w-0">
            <div className="app-miniproyecto-builder-control-band">
              {exerciseSelectorPanel}
              {builderActionsPanel}
            </div>

            {exercises.length === 0 ? (
              <div className="app-miniproyecto-builder-panel app-miniproyecto-builder-panel--empty">
                <div className="max-w-lg">
                  <div className="text-sm font-semibold text-[#243447]">El visualizador aparecerá aquí</div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Agrega al menos un ejercicio desde la banda superior para empezar a construir el flujo del miniproyecto.</p>
                </div>
              </div>
            ) : (
              <div className="app-miniproyecto-builder-panel app-miniproyecto-builder-panel--editor min-w-0">
                <div className="app-miniproyecto-builder-editor-kicker">Visualizador del ejercicio activo</div>
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
                  const selectedMeta = EXERCISE_TYPE_META[exercise.tipo_ejercicio];
                  const SelectedIcon = selectedMeta.icon;

                  return (
                    <div className="app-miniproyecto-visualizer">
                      <section className="app-miniproyecto-visualizer__hero">
                        <div className="app-miniproyecto-visualizer__hero-main">
                          <span className={`app-miniproyecto-visualizer__hero-icon ${selectedMeta.soft}`}>
                            <SelectedIcon className={`h-5 w-5 ${selectedMeta.accent}`} />
                          </span>
                          <div className="min-w-0">
                            <div className="app-miniproyecto-visualizer__kicker">Ejercicio {index + 1}</div>
                            <h3 className="app-miniproyecto-visualizer__title">{exercise.titulo || `Ejercicio ${index + 1}`}</h3>
                            <p className="app-miniproyecto-visualizer__subtitle">{exercise.tipo_ejercicio}</p>
                          </div>
                        </div>

                        <div className="app-miniproyecto-visualizer__hero-side">
                          <span className="app-miniproyecto-visualizer__chip">{selectedMeta.label}</span>
                          <span className="app-miniproyecto-visualizer__chip">{exercise.puntos} pts</span>
                          <button type="button" onClick={() => handleRemoveExercise(index)} className="app-btn app-btn-danger app-btn-sm app-miniproyecto-visualizer__danger-action">
                            <Trash2 className="h-4 w-4" />
                            <span>Eliminar ejercicio</span>
                          </button>
                        </div>
                      </section>

                      <div className="app-miniproyecto-visualizer__grid">
                        <section className="app-miniproyecto-visualizer-card app-miniproyecto-visualizer-card--wide">
                          <div className="app-miniproyecto-visualizer-card__head">
                            <label className="app-miniproyecto-visualizer-card__label">Título del ejercicio</label>
                            <span className="app-miniproyecto-visualizer-card__help">Nombre visible dentro del flujo</span>
                          </div>
                          <input value={exercise.titulo} onChange={(event) => handleUpdateExercise(index, { titulo: event.target.value })} className="app-form-input" />
                        </section>

                        <section className="app-miniproyecto-visualizer-card">
                          <div className="app-miniproyecto-visualizer-card__head">
                            <label className="app-miniproyecto-visualizer-card__label">Tipo elegido</label>
                            <button type="button" onClick={() => setEditingTypeExerciseId((current) => current === exercise.id ? null : exercise.id)} className="app-miniproyecto-visualizer-card__action">
                              {editingTypeExerciseId === exercise.id ? 'Cancelar' : 'Cambiar tipo'}
                            </button>
                          </div>
                          <span className="app-miniproyecto-visualizer__chip app-miniproyecto-visualizer__chip--soft">{exercise.tipo_ejercicio}</span>
                          {editingTypeExerciseId === exercise.id ? (
                            <select value={exercise.tipo_ejercicio} onChange={(event) => handleChangeExerciseType(index, event.target.value as ConfigurableExerciseType)} className="app-form-select mt-3">
                              {EXERCISE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          ) : null}
                        </section>

                        <section className="app-miniproyecto-visualizer-card">
                          <div className="app-miniproyecto-visualizer-card__head">
                            <label className="app-miniproyecto-visualizer-card__label">Puntos</label>
                            <span className="app-miniproyecto-visualizer-card__help">Valor del ejercicio</span>
                          </div>
                          <input type="number" min={1} value={exercise.puntos} onChange={(event) => handleUpdateExercise(index, { puntos: Number(event.target.value) || 1 })} className="app-form-input" />
                        </section>

                        <section className="app-miniproyecto-visualizer-card app-miniproyecto-visualizer-card--full">
                          <div className="app-miniproyecto-visualizer-card__head">
                            <label className="app-miniproyecto-visualizer-card__label">Descripción</label>
                            <span className="app-miniproyecto-visualizer-card__help">Contexto breve para el estudiante</span>
                          </div>
                          <textarea value={exercise.descripcion} onChange={(event) => handleUpdateExercise(index, { descripcion: event.target.value })} rows={3} className="app-form-textarea" />
                        </section>
                      </div>

                      <div className="app-miniproyecto-visualizer__sections">
                        {exercise.tipo_ejercicio === 'Compilador' ? (
                          <section className="app-miniproyecto-visualizer-section app-miniproyecto-visualizer-section--accent">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Plantilla Java</h4>
                              </div>
                              <button type="button" onClick={() => handleUpdateExercise(index, { codigoEstructura: formatJavaLikeTemplate(methodTemplate) })} className="app-btn app-btn-secondary app-btn-sm">Dar formato</button>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body">
                              <textarea
                                value={methodTemplate}
                                onChange={(event) => {
                                  const plantilla = event.target.value;
                                  const metodo = parseMethodTemplate(plantilla);
                                  handleUpdateExercise(index, { codigoEstructura: plantilla, configuracion: { ...compilerConfig, metodo: metodo ? { ...metodo, plantilla } : null } });
                                }}
                                rows={7}
                                className="app-form-textarea font-mono text-sm leading-6"
                              />
                              <div className="app-form-note">Método derivado: {derivedMethod ? `${derivedMethod.retorno} ${derivedMethod.nombre}(${derivedMethod.parametros.map((param) => `${param.tipo} ${param.nombre}`).join(', ')})` : 'Firma pendiente de detectar'}</div>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                {(compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((caseItem, caseIndex) => (
                                  <div key={`${exercise.id}-case-${caseIndex}`} className="app-miniproyecto-visualizer-mini-card">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Caso {caseIndex + 1}</div>
                                    <input
                                      value={caseItem.inputs || ''}
                                      onChange={(event) => {
                                        const nextCases = (compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((item, itemIndex) => itemIndex === caseIndex ? { ...item, inputs: event.target.value } : item);
                                        handleUpdateConfig(index, { casos_prueba: nextCases });
                                      }}
                                      placeholder="Inputs"
                                      className="app-form-input mb-2"
                                    />
                                    <input
                                      value={caseItem.output || ''}
                                      onChange={(event) => {
                                        const nextCases = (compilerCases.length ? compilerCases : createDefaultCompilerConfig().casos_prueba).map((item, itemIndex) => itemIndex === caseIndex ? { ...item, output: event.target.value } : item);
                                        handleUpdateExercise(index, { resultado_ejercicio: nextCases[0]?.output || '', configuracion: { ...compilerConfig, casos_prueba: nextCases } });
                                      }}
                                      placeholder="Output esperado"
                                      className="app-form-input"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </section>
                        ) : null}

                        {exercise.tipo_ejercicio === 'Opción única' ? (
                          <section className="app-miniproyecto-visualizer-section">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Selección única</h4>
                              </div>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body">
                              <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="app-form-input" />
                              <div className="grid gap-3 md:grid-cols-2">
                                {options.map((option, optionIndex) => (
                                  <input
                                    key={`${exercise.id}-option-${optionIndex}`}
                                    value={option}
                                    onChange={(event) => {
                                      const nextOptions = options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item);
                                      handleUpdateConfig(index, { opciones: nextOptions });
                                    }}
                                    placeholder={`Opción ${optionIndex + 1}`}
                                    className="app-form-input"
                                  />
                                ))}
                              </div>
                            </div>
                          </section>
                        ) : null}

                        {exercise.tipo_ejercicio === 'Ordenar' ? (
                          <section className="app-miniproyecto-visualizer-section">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Secuencia de orden</h4>
                              </div>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body">
                              <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="app-form-input" />
                              {orderingItems.map((item, itemIndex) => (
                                <input
                                  key={`${exercise.id}-item-${itemIndex}`}
                                  value={item}
                                  onChange={(event) => {
                                    const nextItems = orderingItems.map((currentItem, currentIndex) => currentIndex === itemIndex ? event.target.value : currentItem);
                                    handleUpdateConfig(index, { items: nextItems });
                                  }}
                                  placeholder={`Ítem ${itemIndex + 1}`}
                                  className="app-form-input"
                                />
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {exercise.tipo_ejercicio === 'Relacionar' ? (
                          <section className="app-miniproyecto-visualizer-section">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Pares de relación</h4>
                              </div>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body">
                              <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateConfig(index, { enunciado: event.target.value })} placeholder="Enunciado" className="app-form-input" />
                              {matchingPairs.map((pair, pairIndex) => (
                                <div key={`${exercise.id}-pair-${pairIndex}`} className="app-miniproyecto-visualizer-mini-card grid gap-3 md:grid-cols-2">
                                  <input
                                    value={pair.concepto}
                                    onChange={(event) => {
                                      const nextPairs = matchingPairs.map((currentPair, currentIndex) => currentIndex === pairIndex ? { ...currentPair, concepto: event.target.value } : currentPair);
                                      handleUpdateConfig(index, { pares: nextPairs });
                                    }}
                                    placeholder="Concepto"
                                    className="app-form-input"
                                  />
                                  <input
                                    value={pair.definicion}
                                    onChange={(event) => {
                                      const nextPairs = matchingPairs.map((currentPair, currentIndex) => currentIndex === pairIndex ? { ...currentPair, definicion: event.target.value } : currentPair);
                                      handleUpdateConfig(index, { pares: nextPairs });
                                    }}
                                    placeholder="Definición"
                                    className="app-form-input"
                                  />
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}

                        {exercise.tipo_ejercicio === 'Diagramas UML' ? (
                          <section className="app-miniproyecto-visualizer-section">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Reglas UML</h4>
                              </div>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body grid grid-cols-1 gap-4 md:grid-cols-3">
                              <label className="app-miniproyecto-visualizer-mini-card text-sm text-[#243447]">
                                <span className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Clases mínimas</span>
                                <input type="number" min={1} value={exercise.configuracion?.opciones?.minClasses ?? 2} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), minClasses: Number(event.target.value) || 1 } })} className="app-form-input" />
                              </label>
                              <label className="app-miniproyecto-visualizer-mini-card flex items-center gap-3 text-sm text-[#243447]">
                                <input type="checkbox" checked={Boolean(exercise.configuracion?.opciones?.requireRelationships)} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), requireRelationships: event.target.checked } })} className="h-4 w-4" />
                                Exigir relaciones
                              </label>
                              <label className="app-miniproyecto-visualizer-mini-card flex items-center gap-3 text-sm text-[#243447]">
                                <input type="checkbox" checked={Boolean(exercise.configuracion?.opciones?.requireMultiplicities)} onChange={(event) => handleUpdateConfig(index, { opciones: { ...(exercise.configuracion?.opciones || {}), requireMultiplicities: event.target.checked } })} className="h-4 w-4" />
                                Exigir multiplicidades
                              </label>
                            </div>
                          </section>
                        ) : null}

                        {exercise.tipo_ejercicio === 'Preguntas' ? (
                          <section className="app-miniproyecto-visualizer-section">
                            <div className="app-miniproyecto-visualizer-section__head">
                              <div>
                                <div className="app-miniproyecto-visualizer-section__eyebrow">Configuración</div>
                                <h4 className="app-miniproyecto-visualizer-section__title">Banco de preguntas</h4>
                              </div>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body">
                              {questions.map((question, questionIndex) => (
                                <div key={question.id} className="app-miniproyecto-visualizer-mini-card">
                                  <div className="mb-3 flex flex-col gap-3 md:flex-row">
                                    <input
                                      value={question.enunciado}
                                      onChange={(event) => {
                                        const nextQuestions = questions.map((currentQuestion, currentIndex) => currentIndex === questionIndex ? { ...currentQuestion, enunciado: event.target.value } : currentQuestion);
                                        handleUpdateConfig(index, { preguntas: nextQuestions });
                                      }}
                                      placeholder={`Pregunta ${questionIndex + 1}`}
                                      className="app-form-input flex-1"
                                    />
                                    <select
                                      value={question.tipo}
                                      onChange={(event) => {
                                        const nextQuestions = questions.map((currentQuestion, currentIndex) => currentIndex === questionIndex ? { ...currentQuestion, tipo: event.target.value as EmbeddedQuestion['tipo'], opciones: event.target.value === 'abierta' ? [] : (currentQuestion.opciones && currentQuestion.opciones.length > 0 ? currentQuestion.opciones : ['Opción 1', 'Opción 2']), respuesta_correcta: event.target.value === 'abierta' ? '' : (currentQuestion.opciones?.[0] || '') } : currentQuestion);
                                        handleUpdateConfig(index, { preguntas: nextQuestions });
                                      }}
                                      className="app-form-select"
                                    >
                                      <option value="opcion-multiple">Opción múltiple</option>
                                      <option value="abierta">Abierta</option>
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </div>
                    </div>
                  );
                })() : null}
              </div>
            )}
          </div>

          {supportPanels ? (
            <section className="app-miniproyecto-builder-support-band">
              <div className="app-miniproyecto-builder-support-stack app-miniproyecto-builder-support-stack--horizontal">
                {supportPanels}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ConfigurableEmbeddedExerciseEditor;
