import { useState } from 'react';
import { X, Save, Loader } from 'lucide-react';

const MODEL_OPTIONS = ['qwen2.5:0.5b', 'llama3.2:1b', 'llama3.2'];

interface InlineChatbotCreatorProps {
  areaId: number;
  onClose: () => void;
  onChatbotCreated: (chatbot: { id: number; nombre: string }) => void;
  apiFetch: (path: string, init?: RequestInit, areaIdOverride?: number | null) => Promise<Response>;
}

interface ChatbotFormData {
  nombre_chatbot: string;
  descripcion: string;
  prompt_base: string;
  model: string;
  topK: string;
  max_context_chars: string;
  max_tokens: string;
  temperature: string;
}

export function InlineChatbotCreator({ areaId, onClose, onChatbotCreated, apiFetch }: InlineChatbotCreatorProps) {
  const [formData, setFormData] = useState<ChatbotFormData>({
    nombre_chatbot: '',
    descripcion: '',
    prompt_base: '',
    model: 'qwen2.5:0.5b',
    topK: '1',
    max_context_chars: '600',
    max_tokens: '256',
    temperature: '0.2',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof ChatbotFormData>(key: K, value: ChatbotFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.nombre_chatbot.trim()) {
      setError('El nombre del chatbot es obligatorio.');
      return;
    }

    setIsCreating(true);
    setError(null);

    const payload = {
      nombre_chatbot: formData.nombre_chatbot.trim(),
      descripcion: formData.descripcion.trim(),
      tipo: 'GENERAL',
      prompt_base: formData.prompt_base.trim(),
      estado: true,
      configuracion: {
        area_id: areaId,
        miniproyecto_id: null,
      },
      parametros_rendimiento: {
        model: formData.model,
        topK: Number(formData.topK) || 1,
        max_context_chars: Number(formData.max_context_chars) || 600,
        max_tokens: Number(formData.max_tokens) || 256,
        temperature: Number(formData.temperature) || 0.2,
      },
    };

    try {
      const response = await apiFetch('/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, areaId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.mensaje || data?.error || 'No se pudo crear el chatbot.');
      }

      // Notificar al componente padre que se creó el chatbot
      onChatbotCreated({
        id: data.id,
        nombre: data.nombre || formData.nombre_chatbot,
      });

      onClose();
    } catch (err) {
      console.error('Error creating chatbot:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el chatbot.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="app-modal-overlay app-modal-overlay--top z-[60]">
      <div className="app-modal-card" style={{ width: 'min(100%, 52rem)', maxHeight: 'calc(100vh - 3rem)' }}>
        <div className="app-modal-header">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="app-modal-kicker">Chatbot rápido</div>
              <h3 className="app-modal-title">Crear chatbot para miniproyecto</h3>
              <p className="app-modal-description">
                Crea un chatbot básico que estará disponible para este miniproyecto. Podrás configurarlo más adelante.
              </p>
            </div>
            <button type="button" onClick={onClose} className="app-modal-close" disabled={isCreating}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="contents">
          <div className="app-modal-scroll">
            <div className="app-form-stack lg:px-8 lg:py-7">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <section className="app-form-section app-form-section--muted">
                <div className="mb-4 space-y-1.5">
                  <h4 className="app-form-section-title">Información básica</h4>
                  <p className="app-form-section-description">
                    Define el nombre y propósito del chatbot. Este chatbot será de tipo "General" para el área seleccionada.
                  </p>
                </div>

                <div className="app-form-stack">
                  <div className="app-form-field">
                    <label className="app-form-label">Nombre del chatbot *</label>
                    <input
                      type="text"
                      value={formData.nombre_chatbot}
                      onChange={(e) => updateField('nombre_chatbot', e.target.value)}
                      className="app-form-input"
                      placeholder="Ej: Tutor de Inventarios"
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => updateField('descripcion', e.target.value)}
                      rows={3}
                      className="app-form-textarea"
                      placeholder="Describe brevemente el propósito del chatbot..."
                      disabled={isCreating}
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Prompt base (opcional)</label>
                    <textarea
                      value={formData.prompt_base}
                      onChange={(e) => updateField('prompt_base', e.target.value)}
                      rows={3}
                      className="app-form-textarea"
                      placeholder="Ej: Eres un asistente experto en gestión de inventarios que ayuda a estudiantes..."
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </section>

              <section className="app-form-section">
                <div className="mb-4 space-y-1.5">
                  <h4 className="app-form-section-title">Configuración del modelo</h4>
                  <p className="app-form-section-description">
                    Parámetros de rendimiento del modelo de IA. Los valores por defecto son recomendados.
                  </p>
                </div>

                <div className="app-form-grid app-form-grid-2">
                  <div className="app-form-field">
                    <label className="app-form-label">Modelo</label>
                    <select
                      value={formData.model}
                      onChange={(e) => updateField('model', e.target.value)}
                      className="app-form-select"
                      disabled={isCreating}
                    >
                      {MODEL_OPTIONS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Temperature</label>
                    <input
                      type="text"
                      value={formData.temperature}
                      onChange={(e) => updateField('temperature', e.target.value)}
                      className="app-form-input"
                      placeholder="0.2"
                      disabled={isCreating}
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Max Tokens</label>
                    <input
                      type="text"
                      value={formData.max_tokens}
                      onChange={(e) => updateField('max_tokens', e.target.value)}
                      className="app-form-input"
                      placeholder="256"
                      disabled={isCreating}
                    />
                  </div>

                  <div className="app-form-field">
                    <label className="app-form-label">Top K</label>
                    <input
                      type="text"
                      value={formData.topK}
                      onChange={(e) => updateField('topK', e.target.value)}
                      className="app-form-input"
                      placeholder="1"
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                  <p className="font-medium mb-1">💡 Recomendaciones de modelo:</p>
                  <p><strong>qwen2.5:0.5b:</strong> Ligero y estable, recomendado para la mayoría de casos.</p>
                  <p><strong>llama3.2:1b:</strong> Más rápido pero consume más memoria.</p>
                  <p><strong>llama3.2:</strong> Respuestas más completas, mayor costo computacional.</p>
                </div>
              </section>
            </div>
          </div>

          <div className="app-form-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="app-btn app-btn-secondary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !formData.nombre_chatbot.trim()}
              className="app-btn rounded-xl px-6 py-3 text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#4A90E2' }}
            >
              {isCreating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Crear chatbot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
