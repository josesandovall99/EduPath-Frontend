import { ClipboardList, Code2, GitBranchPlus, Grip, ListChecks, Lock, MessagesSquare, Plus, Shapes, Trash2 } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ConfigurableExerciseType,
  EmbeddedExercise,
  EmbeddedQuestion,
  createEmptyEmbeddedExercise,
} from './configurableEmbeddedExercises';
import { JavaEditor } from './JavaEditor';
import { CONSOLA_IO_SOURCE } from '../utils/consolaIOSource';

interface ConfigurableEmbeddedExerciseEditorProps {
  exercises: EmbeddedExercise[];
  onChange: (exercises: EmbeddedExercise[]) => void;
  supportPanels?: ReactNode;
}

// CONSOLA_IO_SOURCE is imported — full official source, single source of truth

const SYNTAX_GROUPS = [
  {
    group: 'Condicionales',
    color: 'violet',
    items: [
      { key: 'if',      label: 'if / else' },
      { key: 'else if', label: 'else if' },
      { key: 'switch',  label: 'switch / case' },
      { key: 'ternary', label: 'Ternario (? :)' },
    ],
  },
  {
    group: 'Bucles',
    color: 'sky',
    items: [
      { key: 'for',      label: 'for' },
      { key: 'for each', label: 'for-each' },
      { key: 'while',    label: 'while' },
      { key: 'do while', label: 'do-while' },
    ],
  },
  {
    group: 'Excepciones',
    color: 'rose',
    items: [
      { key: 'try',   label: 'try / catch' },
      { key: 'throw', label: 'throw' },
    ],
  },
  {
    group: 'Control',
    color: 'amber',
    items: [
      { key: 'return',   label: 'return' },
      { key: 'break',    label: 'break' },
      { key: 'continue', label: 'continue' },
    ],
  },
] as const;

const GROUP_BADGE: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  sky:    'bg-sky-100 text-sky-700 border-sky-200',
  rose:   'bg-rose-100 text-rose-700 border-rose-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
};

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

function buildSingleChoiceExerciseUpdate(exercise: EmbeddedExercise, updates: Record<string, unknown>): Partial<EmbeddedExercise> {
  const nextConfig = {
    ...(exercise.configuracion || {}),
    ...updates,
  };

  const nextCorrectAnswer = typeof nextConfig.respuestaCorrecta === 'string' ? nextConfig.respuestaCorrecta : '';

  return {
    configuracion: nextConfig,
    resultado_ejercicio: nextCorrectAnswer,
  };
}

export function ConfigurableEmbeddedExerciseEditor({ exercises, onChange, supportPanels }: ConfigurableEmbeddedExerciseEditorProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(exercises[0]?.id || null);
  const [editingTypeExerciseId, setEditingTypeExerciseId] = useState<string | null>(null);
  const [activeCompilerTab, setActiveCompilerTab] = useState<'main' | 'modelo' | 'consolaIO'>('main');

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

  const MAX_EXERCISES = 8;
  const isAtLimit = exercises.length >= MAX_EXERCISES;

  const builderActionsPanel = (
    <section className="app-miniproyecto-builder-panel app-miniproyecto-builder-panel--actions">
      <div className="app-miniproyecto-builder-panel__intro">
        <div>
          <div className="text-sm font-semibold text-[#243447]">Agregar ejercicio</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Bloques disponibles para extender el flujo activo.</p>
        </div>
      </div>

      {isAtLimit ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          Límite de {MAX_EXERCISES} ejercicios alcanzado. Elimina uno para agregar otro.
        </div>
      ) : null}

      <div className="app-miniproyecto-builder-actions-menu">
        {ADDABLE_EXERCISE_TYPES.map((type) => {
          const meta = EXERCISE_TYPE_META[type];
          const Icon = meta.icon;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleAddExercise(type)}
              disabled={isAtLimit}
              className="app-miniproyecto-builder-type-button disabled:pointer-events-none disabled:opacity-40"
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
                  const compilerConfig = exercise.tipo_ejercicio === 'Compilador' ? { ...(exercise.configuracion || {}) } : null;
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
                                <h4 className="app-miniproyecto-visualizer-section__title">Estructura MVC · Java</h4>
                              </div>
                              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">Java · MVC</span>
                            </div>
                            <div className="app-miniproyecto-visualizer-section__body space-y-4">

                              {/* Nombre del modelo */}
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la clase Modelo</label>
                                <input
                                  type="text"
                                  value={compilerConfig?.nombreModelo || ''}
                                  onChange={(e) => handleUpdateConfig(index, { tipo: 'mvc', nombreModelo: e.target.value })}
                                  placeholder="Ej: SeguridadBancaria"
                                  className="app-form-input font-mono max-w-xs"
                                />
                              </div>

                              {/* Tab editor */}
                              <div className="rounded-xl overflow-hidden border border-gray-700">
                                {/* Tab bar */}
                                <div className="flex bg-[#1E1E1E] border-b border-gray-700">
                                  {(
                                    [
                                      { id: 'main' as const, label: 'Main.java' },
                                      { id: 'modelo' as const, label: `${compilerConfig?.nombreModelo || 'Modelo'}.java` },
                                      { id: 'consolaIO' as const, label: 'ConsolaIO.java' },
                                    ] as const
                                  ).map((tab) => (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      onClick={() => setActiveCompilerTab(tab.id)}
                                      className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono border-r border-gray-700 transition-colors ${
                                        activeCompilerTab === tab.id
                                          ? 'bg-[#2D2D2D] text-white border-t-2 border-t-sky-400'
                                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#252525]'
                                      }`}
                                    >
                                      {tab.id === 'consolaIO' && <Lock className="w-3 h-3 text-yellow-400" />}
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Monaco — renderizado condicional para que el editor monte con el valor correcto */}
                                <div className="min-h-[260px]">
                                  {activeCompilerTab === 'main' && (
                                    <JavaEditor key={`cfg-main-${exercise.id}`} value={compilerConfig?.templateMain || ''} readOnly={false} onChange={(v) => handleUpdateConfig(index, { tipo: 'mvc', templateMain: v })} height={260} />
                                  )}
                                  {activeCompilerTab === 'modelo' && (
                                    <JavaEditor key={`cfg-modelo-${exercise.id}`} value={compilerConfig?.templateModelo || ''} readOnly={false} onChange={(v) => handleUpdateConfig(index, { tipo: 'mvc', templateModelo: v })} height={260} />
                                  )}
                                  {activeCompilerTab === 'consolaIO' && (
                                    <JavaEditor key="cfg-consolaIO" value={CONSOLA_IO_SOURCE} readOnly readOnlyLabel="ConsolaIO.java — solo lectura, clase fija del sistema" height={260} />
                                  )}
                                </div>
                                <p className="bg-[#1E1E1E] border-t border-gray-700 px-3 py-1.5 text-gray-500 text-[10px] font-mono">
                                  {activeCompilerTab === 'consolaIO'
                                    ? 'ConsolaIO.java es fija — no se edita y siempre se compila junto con los demás archivos.'
                                    : 'Este contenido es la plantilla de inicio que verá el estudiante en esta pestaña.'}
                                </p>
                              </div>

                              {/* Estructuras obligatorias */}
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-[#3A4A5B]">Estructuras obligatorias</label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      El alumno debe usar estas estructuras en su código real — los comentarios (<code className="font-mono">// for</code>) no cuentan.
                                    </p>
                                  </div>
                                  {(Array.isArray(compilerConfig?.sintaxis) && compilerConfig.sintaxis.length > 0) && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateConfig(index, { tipo: 'mvc', sintaxis: [] })}
                                      className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                                    >
                                      Limpiar todo
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                  {SYNTAX_GROUPS.map((group) => {
                                    const sintaxis: string[] = Array.isArray(compilerConfig?.sintaxis) ? compilerConfig.sintaxis : [];
                                    return (
                                      <div key={group.group} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.group}</div>
                                        {group.items.map((item) => {
                                          const checked = sintaxis.includes(item.key);
                                          return (
                                            <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {
                                                  const next = checked
                                                    ? sintaxis.filter((s) => s !== item.key)
                                                    : [...sintaxis, item.key];
                                                  handleUpdateConfig(index, { tipo: 'mvc', sintaxis: next });
                                                }}
                                                className="h-3.5 w-3.5 rounded text-[#4A90E2] border-slate-300 cursor-pointer"
                                              />
                                              <span className={`text-[11px] font-mono transition-colors ${checked ? 'text-[#3A4A5B] font-semibold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                {item.label}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>

                                {(Array.isArray(compilerConfig?.sintaxis) && compilerConfig.sintaxis.length > 0) && (
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {(compilerConfig.sintaxis as string[]).map((s) => {
                                      const group = SYNTAX_GROUPS.find((g) => g.items.some((i) => i.key === s));
                                      const badgeClass = group ? GROUP_BADGE[group.color] : 'bg-slate-100 text-slate-700 border-slate-200';
                                      return (
                                        <span key={s} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-semibold ${badgeClass}`}>
                                          {s}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const sintaxis: string[] = Array.isArray(compilerConfig?.sintaxis) ? compilerConfig.sintaxis : [];
                                              handleUpdateConfig(index, { tipo: 'mvc', sintaxis: sintaxis.filter((x) => x !== s) });
                                            }}
                                            className="ml-0.5 opacity-60 hover:opacity-100"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Casos de prueba */}
                              <div>
                                <label className="app-miniproyecto-visualizer-card__label mb-2 block">Casos de prueba *</label>
                                <p className="app-form-note mb-3">Define los inputs (stdin) y el output esperado para cada caso. El sistema ejecuta el programa completo con cada input y compara el resultado.</p>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  {([0, 1, 2] as const).map((caseIndex) => {
                                    const casos: { inputs: string; output: string }[] = Array.isArray(compilerConfig?.casos_prueba) ? compilerConfig.casos_prueba : [];
                                    const caseItem = casos[caseIndex] || { inputs: '', output: '' };
                                    const updateCase = (field: 'inputs' | 'output', value: string) => {
                                      const next = [0, 1, 2].map((i) => ({ ...(casos[i] || { inputs: '', output: '' }), ...(i === caseIndex ? { [field]: value } : {}) }));
                                      handleUpdateConfig(index, { tipo: 'mvc', casos_prueba: next });
                                    };
                                    return (
                                      <div key={caseIndex} className="app-miniproyecto-visualizer-mini-card space-y-2">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Caso {caseIndex + 1}</div>
                                        <div>
                                          <label className="block text-[11px] text-slate-500 mb-1">Inputs (stdin)</label>
                                          <input value={caseItem.inputs} onChange={(e) => updateCase('inputs', e.target.value)} placeholder="Ej: 4,12000,10" className="app-form-input font-mono text-xs" />
                                          <p className="mt-0.5 text-[10px] text-slate-400 font-mono">valores separados por coma</p>
                                        </div>
                                        <div>
                                          <label className="block text-[11px] text-slate-500 mb-1">Output esperado *</label>
                                          <textarea
                                            rows={3}
                                            value={caseItem.output}
                                            onChange={(e) => updateCase('output', e.target.value)}
                                            placeholder={"Total: 48000.0\nDescuento: 4800.0\nTotal a pagar: 43200.0"}
                                            className="app-form-textarea font-mono text-xs resize-none"
                                          />
                                          <p className="mt-0.5 text-[10px] text-slate-400 font-mono">una línea por cada println</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
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
                              <input value={exercise.configuracion?.enunciado || ''} onChange={(event) => handleUpdateExercise(index, buildSingleChoiceExerciseUpdate(exercise, { enunciado: event.target.value }))} placeholder="Enunciado" className="app-form-input" />
                              <div className="space-y-3">
                                {options.map((option, optionIndex) => (
                                  <label key={`${exercise.id}-option-${optionIndex}`} className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`single-choice-${exercise.id}`}
                                      checked={exercise.configuracion?.respuestaCorrecta === option}
                                      onChange={() => handleUpdateExercise(index, buildSingleChoiceExerciseUpdate(exercise, { respuestaCorrecta: option }))}
                                      className="h-4 w-4 border-gray-300 text-[#4A90E2] focus:ring-[#4A90E2]"
                                    />
                                    <input
                                      value={option}
                                      onChange={(event) => {
                                        const nextOptions = options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item);
                                        const updates: Record<string, unknown> = { opciones: nextOptions };

                                        if (exercise.configuracion?.respuestaCorrecta === option) {
                                          updates.respuestaCorrecta = event.target.value;
                                        }

                                        handleUpdateExercise(index, buildSingleChoiceExerciseUpdate(exercise, updates));
                                      }}
                                      placeholder={`Opción ${optionIndex + 1}`}
                                      className="app-form-input"
                                    />
                                  </label>
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
                                <div key={`${exercise.id}-item-${itemIndex}`} className="flex items-center gap-2">
                                  <span className="w-6 text-sm text-slate-500">{itemIndex + 1}.</span>
                                  <input
                                    value={item}
                                    onChange={(event) => {
                                      const nextItems = orderingItems.map((currentItem, currentIndex) => currentIndex === itemIndex ? event.target.value : currentItem);
                                      handleUpdateConfig(index, { items: nextItems });
                                    }}
                                    placeholder={`Ítem ${itemIndex + 1}`}
                                    className="app-form-input"
                                  />
                                  <button
                                    type="button"
                                    className="app-btn app-btn-secondary app-btn-sm"
                                    onClick={() => {
                                      const nextIndex = itemIndex - 1;
                                      if (nextIndex < 0) return;
                                      const nextItems = [...orderingItems];
                                      const [currentItem] = nextItems.splice(itemIndex, 1);
                                      nextItems.splice(nextIndex, 0, currentItem);
                                      handleUpdateConfig(index, { items: nextItems });
                                    }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="app-btn app-btn-secondary app-btn-sm"
                                    onClick={() => {
                                      const nextIndex = itemIndex + 1;
                                      if (nextIndex >= orderingItems.length) return;
                                      const nextItems = [...orderingItems];
                                      const [currentItem] = nextItems.splice(itemIndex, 1);
                                      nextItems.splice(nextIndex, 0, currentItem);
                                      handleUpdateConfig(index, { items: nextItems });
                                    }}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="app-btn app-btn-danger app-btn-sm"
                                    onClick={() => {
                                      const nextItems = orderingItems.filter((_, currentIndex) => currentIndex !== itemIndex);
                                      handleUpdateConfig(index, { items: nextItems });
                                    }}
                                  >
                                    X
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="app-btn app-btn-success app-btn-sm mt-2"
                                onClick={() => handleUpdateConfig(index, { items: [...orderingItems, `Ítem ${orderingItems.length + 1}`] })}
                              >
                                Agregar ítem
                              </button>
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
                                <div key={`${exercise.id}-pair-${pairIndex}`} className="app-miniproyecto-visualizer-mini-card grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
                                  <button
                                    type="button"
                                    className="app-btn app-btn-danger app-btn-sm"
                                    onClick={() => handleUpdateConfig(index, { pares: matchingPairs.filter((_, currentIndex) => currentIndex !== pairIndex) })}
                                  >
                                    X
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="app-btn app-btn-success app-btn-sm mt-2"
                                onClick={() => handleUpdateConfig(index, { pares: [...matchingPairs, { concepto: '', definicion: '' }] })}
                              >
                                Agregar par
                              </button>
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
