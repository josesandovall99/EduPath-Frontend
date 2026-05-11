import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { API_BASE_URL } from '../utils/constants';

interface AdminManagementScreenProps {
  onBack: () => void;
  onHome?: () => void;
}

interface AdminFormData {
  nombre: string;
  email: string;
}

const emptyForm: AdminFormData = {
  nombre: '',
  email: '',
};

export function AdminManagementScreen({ onBack, onHome }: AdminManagementScreenProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setFormData(emptyForm);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError(null);
  };

  const handleCreateAdmin = async () => {
    if (!formData.nombre.trim() || !formData.email.trim()) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }

    const personaId = localStorage.getItem('personaId');
    const authToken = localStorage.getItem('authToken');
    if (!personaId) {
      setFormError('No se encontro personaId del administrador actual.');
      return;
    }

    if (!authToken) {
      setFormError('Sesión inválida. Inicie sesión nuevamente.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, string> = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
      };

      const response = await fetch(`${API_BASE_URL}/administrador/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'x-persona-id': personaId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.mensaje || 'Error al crear administrador');
      }

      setSuccessMessage('Cuenta administrativa registrada. Las credenciales fueron enviadas por correo.');
      setShowModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear administrador');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} title="Ir al panel principal">
                <div className="app-brand-icon">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de administradores</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <section className="app-page-hero mb-8">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Administración</div>
              <h2 className="app-page-hero__title">Gestión de administradores</h2>
              <p className="app-page-hero__description">
                Registra y gestiona cuentas administrativas.
              </p>
            </div>
          </div>
        </section>

        <section className="app-panel p-6">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Administradores</h3>
              <p className="app-section-description">Registro de cuentas administrativas del sistema.</p>
            </div>
            <button onClick={handleOpenCreate} className="app-btn app-primary-btn px-5 py-3">
              <Plus className="w-4 h-4" />
              <span>Nuevo administrador</span>
            </button>
          </div>

          {successMessage && (
            <div className="app-alert app-alert--success mb-6">
              <p>{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="app-soft-card app-context-card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acción principal</p>
            <p className="app-context-card__title">Nuevo administrador</p>
            <p className="app-context-card__text">Alta de una nueva cuenta administrativa.</p>
          </div>
        </section>

      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div className="app-modal-card app-modal-card--lg">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Administración</div>
                <h3 className="app-modal-title">Crear administrador</h3>
                <p className="app-modal-description">Registro de una nueva cuenta administrativa.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="app-modal-close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="app-modal-scroll">
            <div className="app-form-layout">
              {formError && <div className="app-alert app-alert--error">{formError}</div>}

              <section className="app-form-section app-form-section--muted">
                <div className="mb-4">
                  <h4 className="app-form-section-title">Información personal</h4>
                  <p className="app-form-section-description">Datos básicos de la cuenta.</p>
                </div>
                <div className="app-form-grid app-form-grid-2">
                <div className="app-form-field">
                  <label className="app-form-label">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                    className="app-form-input"
                    placeholder="Ej: Juan Perez"
                    required
                  />
                </div>
                <div className="app-form-field">
                  <label className="app-form-label">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="app-form-input"
                    placeholder="juan@demo.com"
                    required
                  />
                </div>
              </div>
              </section>

              <section className="app-form-section">
                <div className="mb-4">
                  <h4 className="app-form-section-title">Acceso</h4>
                  <p className="app-form-section-description">El código de acceso y la contraseña se generan automáticamente.</p>
                </div>
                <div className="app-form-note">
                  El sistema asignará un código <strong>ADM###</strong> único al crear la cuenta. Las credenciales se enviarán al correo del administrador.
                </div>
              </section>
            </div>
            </div>

            <div className="app-form-footer">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="app-btn app-btn-secondary px-6 py-3 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={submitting || !formData.nombre.trim() || !formData.email.trim()}
                className="app-btn app-primary-btn px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Crear administrador</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
