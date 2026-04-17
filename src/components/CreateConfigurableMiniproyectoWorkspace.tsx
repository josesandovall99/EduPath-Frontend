import { Bot, ClipboardList, LayoutPanelLeft, Sparkles, X } from 'lucide-react';
import { ConfigurableEmbeddedExerciseEditor } from './ConfigurableEmbeddedExerciseEditor';
import { EmbeddedExercise } from './configurableEmbeddedExercises';

export interface CreateConfigurableFormData {
  titulo: string;
  descripcion: string;
  nivel_dificultad: string;
  entregable: string;
  areaId: string;
  exercises: EmbeddedExercise[];
  useChatbot: boolean;
  chatbotId: string;
}

interface AreaOption {
  id: number;
  nombre: string;
}

interface ChatbotOption {
  id: number;
  nombre: string;
  tipo: 'GENERAL' | 'MINIPROYECTO';
}

interface CreateConfigurableMiniproyectoWorkspaceProps {
  formData: CreateConfigurableFormData;
  freeAreas: AreaOption[];
  eligibleChatbots: ChatbotOption[];
  error: string | null;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onUpdate: (updater: (prev: CreateConfigurableFormData) => CreateConfigurableFormData) => void;
}

export function CreateConfigurableMiniproyectoWorkspace({
  formData,
  freeAreas,
  eligibleChatbots,
  error,
  isCreating,
  onClose,
  onSubmit,
  onUpdate,
}: CreateConfigurableMiniproyectoWorkspaceProps) {
  const exerciseCount = formData.exercises.length;
  const hasEligibleChatbots = eligibleChatbots.length > 0;
  const selectedAreaName = freeAreas.find((area) => String(area.id) === formData.areaId)?.nombre || 'Sin área seleccionada';
  const selectedChatbotName = eligibleChatbots.find((chatbot) => String(chatbot.id) === formData.chatbotId)?.nombre || 'Sin chatbot asignado';
  const isReadyToCreate = Boolean(formData.titulo.trim() && formData.areaId && exerciseCount > 0 && (!formData.useChatbot || formData.chatbotId));

  return (
    <div className="app-modal-overlay app-modal-overlay--top z-50">
      <div
        className="app-modal-card"
        style={{
          width: 'min(100%, 82rem)',
          height: 'min(900px, calc(100vh - 2rem))',
        }}
      >
        <div className="app-modal-header">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="app-modal-kicker">
                Gestión docente
              </div>
              <h3 className="app-modal-title">Crear miniproyecto configurable</h3>
              <p className="app-modal-description">Completa la base del miniproyecto, define si usará chatbot y construye los ejercicios desde un flujo contenido, similar al alta de docentes.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="app-modal-meta hidden sm:block">
                <div className="app-modal-meta-label">Estado</div>
                <div className="app-modal-meta-value">Nuevo registro</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="app-modal-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="contents">
          <div className="app-modal-scroll">
            <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
              <div className="app-form-main app-form-stack">
                <div className="app-form-note">
                  Usa este flujo para crear un miniproyecto desde cero sin reciclar ejercicios existentes. Primero define el contexto y luego arma la secuencia completa en el constructor.
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <section className="app-form-section app-form-section--muted">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Información base</h4>
                    <p className="app-form-section-description">Define el título, el área libre disponible y el entregable esperado del nuevo miniproyecto.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Título</label>
                      <input
                        value={formData.titulo}
                        onChange={(event) => onUpdate((prev) => ({ ...prev, titulo: event.target.value }))}
                        className="app-form-input"
                        placeholder="Ej: Taller integrador de soporte"
                      />
                    </div>

                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Área libre</label>
                      <select
                        value={formData.areaId}
                        onChange={(event) => onUpdate((prev) => ({
                          ...prev,
                          areaId: event.target.value,
                          exercises: [],
                          useChatbot: false,
                          chatbotId: '',
                        }))}
                        className="app-form-select"
                      >
                        <option value="">Selecciona un área</option>
                        {freeAreas.map((area) => (
                          <option key={area.id} value={String(area.id)}>{area.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="app-form-field">
                      <label className="app-form-label">Nivel</label>
                      <input
                        value={formData.nivel_dificultad}
                        onChange={(event) => onUpdate((prev) => ({ ...prev, nivel_dificultad: event.target.value }))}
                        className="app-form-input"
                        placeholder="media"
                      />
                    </div>

                    <div className="app-form-field">
                      <label className="app-form-label">Entregable</label>
                      <input
                        value={formData.entregable}
                        onChange={(event) => onUpdate((prev) => ({ ...prev, entregable: event.target.value }))}
                        className="app-form-input"
                        placeholder="Entrega final esperada"
                      />
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Narrativa del miniproyecto</h4>
                    <p className="app-form-section-description">Explica el contexto del reto y qué debe resolver el estudiante antes de entrar al constructor.</p>
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(event) => onUpdate((prev) => ({ ...prev, descripcion: event.target.value }))}
                      rows={4}
                      className="app-form-textarea"
                      placeholder="Describe el propósito del miniproyecto, el contexto del problema y qué debe lograr el estudiante al completarlo."
                    />
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Simulación del cliente</h4>
                    <p className="app-form-section-description">Activa esta opción solo si el miniproyecto necesita un chatbot como cliente simulado durante la experiencia.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-[#3A4A5B]">
                      <input
                        type="checkbox"
                        checked={formData.useChatbot}
                        onChange={(event) => onUpdate((prev) => ({
                          ...prev,
                          useChatbot: event.target.checked,
                          chatbotId: event.target.checked ? prev.chatbotId : '',
                        }))}
                        className="h-4 w-4"
                      />
                      Usar chatbot como cliente simulado
                    </label>

                    {formData.useChatbot ? (
                      <div className="space-y-3">
                        <div className="app-form-field">
                          <label className="app-form-label">Chatbot disponible en esta área</label>
                          <select
                            value={formData.chatbotId}
                            onChange={(event) => onUpdate((prev) => ({ ...prev, chatbotId: event.target.value }))}
                            disabled={!hasEligibleChatbots}
                            className="app-form-select disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            <option value="">
                              {hasEligibleChatbots ? 'Selecciona un chatbot' : 'No hay chatbots disponibles para esta área'}
                            </option>
                            {eligibleChatbots.map((chatbot) => (
                              <option key={chatbot.id} value={String(chatbot.id)}>
                                {chatbot.nombre} {chatbot.tipo === 'GENERAL' ? '(general)' : '(miniproyecto)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {!hasEligibleChatbots ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            No hay chatbots creados para esta área. Debes crear uno nuevo en la gestión de chatbots antes de activar esta simulación.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="app-form-note">
                        Déjalo apagado si el miniproyecto no necesita interacción con un cliente simulado.
                      </div>
                    )}
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Constructor de ejercicios</h4>
                    <p className="app-form-section-description">Crea varios ejercicios internos desde cero. El constructor mantiene la edición detallada, pero ahora dentro de un lienzo contenido.</p>
                  </div>

                  {!formData.areaId ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                      Selecciona primero un área libre para habilitar el constructor y empezar a crear los ejercicios del miniproyecto.
                    </div>
                  ) : (
                    <ConfigurableEmbeddedExerciseEditor
                      exercises={formData.exercises}
                      onChange={(nextExercises) => onUpdate((prev) => ({ ...prev, exercises: nextExercises }))}
                    />
                  )}
                </section>
              </div>

              <aside className="app-form-aside app-form-stack md:self-start">
                <section className="app-form-section app-form-section--accent">
                  <h4 className="app-form-section-title">Resumen del registro</h4>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Miniproyecto</div>
                      <div className="app-form-summary-value">{formData.titulo.trim() || 'Sin título definido'}</div>
                      <div className="app-form-summary-help">{formData.descripcion.trim() ? 'Descripción cargada' : 'Descripción pendiente'}</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Área</div>
                        <div className="app-form-summary-value">{selectedAreaName}</div>
                      </div>
                      <div className="app-form-summary-card">
                        <div className="app-form-summary-label">Nivel</div>
                        <div className="app-form-summary-value">{formData.nivel_dificultad.trim() || 'Pendiente'}</div>
                      </div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Secuencia creada</div>
                      <div className="app-form-summary-value">{exerciseCount} ejercicios</div>
                      <div className="app-form-summary-help">{exerciseCount > 0 ? 'El constructor ya tiene contenido' : 'Aún no agregas ejercicios'}</div>
                    </div>
                    <div className="app-form-note">
                      <div className="app-form-summary-label">Chatbot</div>
                      <div className="app-form-summary-value">{formData.useChatbot ? selectedChatbotName : 'No se usará chatbot'}</div>
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <h4 className="app-form-section-title">Antes de crear</h4>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>Verifica que el área esté libre, porque al crear el miniproyecto quedará ocupada por este flujo.</p>
                    <p>Agrega al menos un ejercicio real antes de guardar para que el estudiante vea una secuencia completa.</p>
                    <p>Si activas chatbot, confirma que corresponde al área y que no está asociado a otro miniproyecto.</p>
                  </div>
                </section>

                <section className="app-form-section app-form-section--muted">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="app-form-section-title">Checklist rápido</h4>
                      <p className="app-form-section-description">El botón de creación quedará listo cuando completes los campos mínimos del flujo.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div>Título: {formData.titulo.trim() ? 'listo' : 'pendiente'}</div>
                    <div>Área: {formData.areaId ? 'lista' : 'pendiente'}</div>
                    <div>Ejercicios: {exerciseCount > 0 ? 'listos' : 'pendientes'}</div>
                    <div>Chatbot: {formData.useChatbot ? (formData.chatbotId ? 'listo' : 'pendiente') : 'no aplica'}</div>
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <div className="app-form-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !isReadyToCreate}
              className="app-btn rounded-xl px-6 py-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: '#4A90E2' }}
            >
              <Sparkles className="h-4 w-4" />
              {isCreating ? 'Creando...' : 'Crear miniproyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateConfigurableMiniproyectoWorkspace;