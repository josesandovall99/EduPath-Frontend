import { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { ConfigurableEmbeddedExerciseEditor } from './ConfigurableEmbeddedExerciseEditor';
import { EmbeddedExercise } from './configurableEmbeddedExercises';
import { InlineChatbotCreator } from './InlineChatbotCreator';
import { createQuillModules, loadQuill } from '../utils/quill';

export interface CreateConfigurableFormData {
  titulo: string;
  descripcion: string;
  nivel_dificultad: string;
  entregable: string;
  asignaturaId: string;
  exercises: EmbeddedExercise[];
  useChatbot: boolean;
  chatbotId: string;
}

interface AsignaturaOption {
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
  availableAsignaturas: AsignaturaOption[];
  eligibleChatbots: ChatbotOption[];
  error: string | null;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onUpdate: (updater: (prev: CreateConfigurableFormData) => CreateConfigurableFormData) => void;
  onChatbotCreated: (chatbot: { id: number; nombre: string }) => void;
  apiFetch: (path: string, init?: RequestInit, asignaturaIdOverride?: number | null) => Promise<Response>;
}

export function CreateConfigurableMiniproyectoWorkspace({
  formData,
  availableAsignaturas,
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

  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeQuill = async () => {
      if (!editorRef.current) return;
      // Evitar doble inicialización (React Strict Mode)
      if (editorRef.current.querySelector('.ql-container')) return;
      const Quill = await loadQuill();
      if (cancelled || !editorRef.current) return;
      if (editorRef.current.querySelector('.ql-container')) return;
      editorRef.current.innerHTML = '';
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: 'Explica el contexto del reto y qué debe resolver el estudiante',
        modules: createQuillModules()
      });
      quillRef.current.root.innerHTML = formData.descripcion || '';
      quillRef.current.on('text-change', () => {
        const html = quillRef.current.root.innerHTML;
        onUpdate((prev) => ({ ...prev, descripcion: html }));
      });
    };

    initializeQuill();

    return () => {
      cancelled = true;
      if (editorRef.current) editorRef.current.innerHTML = '';
      quillRef.current = null;
    };
  }, []);

  const exerciseCount = formData.exercises.length;
  const selectedAsignaturaName = availableAsignaturas.find((Asignatura) => String(Asignatura.id) === formData.asignaturaId)?.nombre || 'Sin asignatura seleccionada';
  const selectedChatbotName = eligibleChatbots.find((chatbot) => String(chatbot.id) === formData.chatbotId)?.nombre || 'Sin chatbot asignado';
  const isReadyToCreate = Boolean(formData.titulo.trim() && formData.asignaturaId && exerciseCount > 0 && (!formData.useChatbot || formData.chatbotId));
  const selectedAsignaturaId = Number(formData.asignaturaId);
  const canCreateChatbot = formData.useChatbot && Number.isInteger(selectedAsignaturaId) && selectedAsignaturaId > 0;

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
        <div className="app-modal-header flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="app-modal-kicker">Gestión docente</div>
            <h3 className="app-modal-title">Crear miniproyecto configurable</h3>
            <p className="app-modal-description">Completa la base del miniproyecto, define si usará chatbot y construye los ejercicios desde un flujo contenido.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close flex-shrink-0 self-start"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
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
                    <p className="app-form-section-description">Define el título, el asignatura destino y el entregable esperado del nuevo miniproyecto.</p>
                  </div>

                  <div className="app-form-grid app-form-grid-2">
                    <div className="app-form-field md:col-span-2">
                      <label className="app-form-label">Título</label>
                      <input value={formData.titulo} onChange={(event) => onUpdate((prev) => ({ ...prev, titulo: event.target.value }))} className="app-form-input" />
                    </div>

                    {/* Si solo hay una asignatura en contexto, mostrarla fija sin selector */}
                    {availableAsignaturas.length > 1 ? (
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Asignatura</label>
                        <select
                          value={formData.asignaturaId}
                          onChange={(event) => onUpdate((prev) => ({ ...prev, asignaturaId: event.target.value, exercises: [], useChatbot: false, chatbotId: '' }))}
                          className="app-form-select"
                        >
                          <option value="">Selecciona un asignatura</option>
                          {availableAsignaturas.map((Asignatura) => (
                            <option key={Asignatura.id} value={String(Asignatura.id)}>{Asignatura.nombre}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="app-form-field md:col-span-2">
                        <label className="app-form-label">Asignatura</label>
                        <div style={{ background: '#f0f5ff', border: '1.5px solid #bfd3f5', color: '#1a56db', borderRadius: '0.875rem', padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>
                          {selectedAsignaturaName}
                        </div>
                      </div>
                    )}

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
                    <div className="quill-editor-container app-rich-text-editor">
                      <div
                        ref={editorRef}
                        className="w-full"
                        data-placeholder="Explica el contexto del reto y qué debe resolver el estudiante"
                      />
                    </div>
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
                          <span>Crear nuevo chatbot para esta asignatura</span>
                        </button>

                        {!canCreateChatbot && formData.useChatbot && (
                          <p className="text-xs text-slate-500">
                            Selecciona un asignatura primero para poder crear un chatbot.
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

                  {!formData.asignaturaId ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                      La selección de un asignatura habilita el constructor.
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
                      <div className="app-form-summary-help">{formData.descripcion.replace(/<[^>]*>/g, '').trim() ? 'Descripción cargada' : 'Descripción pendiente'}</div>
                    </div>
                    <div className="app-form-summary-card">
                      <div className="app-form-summary-label">Asignatura</div>
                      <div className="app-form-summary-value">{selectedAsignaturaName}</div>
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
          asignaturaId={selectedAsignaturaId}
          onClose={() => setShowChatbotCreator(false)}
          onChatbotCreated={handleChatbotCreated}
          apiFetch={apiFetch}
        />
      )}
    </div>
  );
}