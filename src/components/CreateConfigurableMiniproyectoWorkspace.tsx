import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { ConfigurableEmbeddedExerciseEditor } from './ConfigurableEmbeddedExerciseEditor';
import { EmbeddedExercise } from './configurableEmbeddedExercises';
import { InlineChatbotCreator } from './InlineChatbotCreator';

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
  availableAreas: AreaOption[];
  eligibleChatbots: ChatbotOption[];
  error: string | null;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onUpdate: (updater: (prev: CreateConfigurableFormData) => CreateConfigurableFormData) => void;
  onChatbotCreated: (chatbot: { id: number; nombre: string }) => void;
  apiFetch: (path: string, init?: RequestInit, areaIdOverride?: number | null) => Promise<Response>;
}

export function CreateConfigurableMiniproyectoWorkspace({
  formData,
  availableAreas,
  eligibleChatbots,
  error,
  isCreating,
  onClose,
  onSubmit,
  onUpdate,
  onChatbotCreated,
  apiFetch,
}: CreateConfigurableMiniproyectoWorkspaceProps) {
  const [showChatbotCreator, setShowChatbotCreator] = useState(false);
  
  const exerciseCount = formData.exercises.length;
  const selectedAreaName = availableAreas.find((area) => String(area.id) === formData.areaId)?.nombre || 'Sin área seleccionada';
  const selectedChatbotName = eligibleChatbots.find((chatbot) => String(chatbot.id) === formData.chatbotId)?.nombre || 'Sin chatbot asignado';
  const isReadyToCreate = Boolean(formData.titulo.trim() && formData.areaId && exerciseCount > 0 && (!formData.useChatbot || formData.chatbotId));
  const selectedAreaId = Number(formData.areaId);
  const canCreateChatbot = formData.useChatbot && Number.isInteger(selectedAreaId) && selectedAreaId > 0;

  const handleChatbotCreated = (chatbot: { id: number; nombre: string }) => {
    // Actualizar el formulario para seleccionar el chatbot recién creado
    onUpdate((prev) => ({ ...prev, chatbotId: String(chatbot.id) }));
    // Notificar al padre para refrescar la lista de chatbots
    onChatbotCreated(chatbot);
    setShowChatbotCreator(false);
  };

  return (
    <div className="app-modal-overlay app-modal-overlay--top z-50">
      <div className="app-modal-card" style={{ width: 'min(100%, 82rem)', height: 'min(900px, calc(100vh - 2rem))' }}>
        <div className="app-modal-header">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="app-modal-kicker">Gestión docente</div>
              <h3 className="app-modal-title">Crear miniproyecto configurable</h3>
              <p className="app-modal-description">Completa la base del miniproyecto, define si usará chatbot y construye los ejercicios desde un flujo contenido.</p>
            </div>
            <button type="button" onClick={onClose} className="app-modal-close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="contents">
          <div className="app-modal-scroll">
            <div className="app-form-layout app-form-layout--with-aside lg:px-8 lg:py-7">
              <div className="app-form-main app-form-stack">
                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : null}

                <section className="app-form-section app-form-section--muted">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Información base</h4>
                    <p className="app-form-section-description">Define el título, el área destino y el entregable esperado del nuevo miniproyecto.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Título</label>
                      <input value={formData.titulo} onChange={(event) => onUpdate((prev) => ({ ...prev, titulo: event.target.value }))} className="app-form-input" />
                    </div>

                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Área</label>
                      <select
                        value={formData.areaId}
                        onChange={(event) => onUpdate((prev) => ({ ...prev, areaId: event.target.value, exercises: [], useChatbot: false, chatbotId: '' }))}
                        className="app-form-select"
                      >
                        <option value="">Selecciona un área</option>
                        {availableAreas.map((area) => (
                          <option key={area.id} value={String(area.id)}>{area.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="app-form-field">
                      <label className="app-form-label">Nivel</label>
                      <input value={formData.nivel_dificultad} onChange={(event) => onUpdate((prev) => ({ ...prev, nivel_dificultad: event.target.value }))} className="app-form-input" />
                    </div>

                    <div className="app-form-field">
                      <label className="app-form-label">Entregable</label>
                      <input value={formData.entregable} onChange={(event) => onUpdate((prev) => ({ ...prev, entregable: event.target.value }))} className="app-form-input" />
                    </div>
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Narrativa del miniproyecto</h4>
                    <p className="app-form-section-description">Explica el contexto del reto y qué debe resolver el estudiante.</p>
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(event) => onUpdate((prev) => ({ ...prev, descripcion: event.target.value }))}
                      rows={4}
                      className="app-form-textarea"
                    />
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Simulación del cliente</h4>
                    <p className="app-form-section-description">Activa esta opción si el miniproyecto necesita un chatbot.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center gap-3 text-sm font-medium text-[#3A4A5B]">
                      <input
                        type="checkbox"
                        checked={formData.useChatbot}
                        onChange={(event) => onUpdate((prev) => ({ ...prev, useChatbot: event.target.checked, chatbotId: event.target.checked ? prev.chatbotId : '' }))}
                        className="h-4 w-4"
                      />
                      Usar chatbot como cliente simulado
                    </label>

                    {formData.useChatbot ? (
                      <div className="space-y-3">
                        <div className="app-form-field">
                          <label className="app-form-label">Chatbot disponible</label>
                          <select value={formData.chatbotId} onChange={(event) => onUpdate((prev) => ({ ...prev, chatbotId: event.target.value }))} className="app-form-select">
                            <option value="">Selecciona un chatbot</option>
                            {eligibleChatbots.map((chatbot) => (
                              <option key={chatbot.id} value={String(chatbot.id)}>{chatbot.nombre}</option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setShowChatbotCreator(true)}
                          disabled={!canCreateChatbot}
                          className="flex items-center gap-2 text-sm font-medium text-[#4A90E2] hover:text-[#357ABD] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Crear nuevo chatbot para esta área</span>
                        </button>

                        {!canCreateChatbot && formData.useChatbot && (
                          <p className="text-xs text-slate-500">
                            Selecciona un área primero para poder crear un chatbot.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="app-form-section">
                  <div className="mb-4 space-y-1.5">
                    <h4 className="app-form-section-title">Constructor de ejercicios</h4>
                    <p className="app-form-section-description">Registro de ejercicios internos para el miniproyecto.</p>
                  </div>

                  {!formData.areaId ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                      La selección de un área habilita el constructor.
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
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Área</div>
                      <div className="app-form-summary-value">{selectedAreaName}</div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Secuencia creada</div>
                      <div className="app-form-summary-value">{exerciseCount} ejercicios</div>
                    </div>
                    <div className="app-form-note">
                      <div className="app-form-summary-label">Chatbot</div>
                      <div className="app-form-summary-value">{formData.useChatbot ? selectedChatbotName : 'No se usará chatbot'}</div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <div className="app-form-footer">
            <button type="button" onClick={onClose} disabled={isCreating} className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isCreating || !isReadyToCreate} className="app-btn rounded-xl px-6 py-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: '#4A90E2' }}>
              {isCreating ? 'Creando...' : 'Crear miniproyecto'}
            </button>
          </div>
        </form>
      </div>

      {showChatbotCreator && canCreateChatbot && (
        <InlineChatbotCreator
          areaId={selectedAreaId}
          onClose={() => setShowChatbotCreator(false)}
          onChatbotCreated={handleChatbotCreated}
          apiFetch={apiFetch}
        />
      )}
    </div>
  );
}