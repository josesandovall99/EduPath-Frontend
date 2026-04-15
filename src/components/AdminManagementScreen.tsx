import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';

interface AdminManagementScreenProps {
  onBack: () => void;
}

interface AdminFormData {
  nombre: string;
  email: string;
  codigoAcceso: string;
}

const emptyForm: AdminFormData = {
  nombre: '',
  email: '',
  codigoAcceso: '',
};

export function AdminManagementScreen({ onBack }: AdminManagementScreenProps) {
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
    if (
      !formData.nombre.trim() ||
      !formData.email.trim() ||
      !formData.codigoAcceso.trim()
    ) {
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
      setFormError('Tu sesion no es valida. Inicia sesion nuevamente.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, string> = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        codigoAcceso: formData.codigoAcceso.trim(),
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

      setSuccessMessage('Administrador creado correctamente. Las credenciales fueron enviadas por correo.');
      setShowModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear administrador');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestion de Administradores</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="mb-8 p-6 bg-gradient-to-r from-[#4A90E2] to-[#357abd] text-white rounded-xl shadow-lg">
          <h2 className="text-lg font-bold mb-2">Crear Administradores</h2>
          <p className="text-sm opacity-95">
            Desde aqui puedes registrar administradores del sistema y enviar sus credenciales automaticamente por correo.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#3A4A5B] text-xl">Administradores</h2>
            <p className="text-gray-500 text-sm">Crea un administrador nuevo para el sistema.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: '#4A90E2' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo administrador</span>
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-green-700 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-gray-600">
            Usa el boton "Nuevo administrador" para registrar un nuevo administrador.
          </p>
        </div>

        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all"
            style={{ backgroundColor: '#4A90E2' }}
          >
            Crear administrador
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
        </div>
      </main>

      {showModal && (
        <div className="app-modal-overlay app-modal-overlay--top">
          <div className="app-modal-card app-modal-card--lg">
            <div className="app-modal-header">
              <div>
                <div className="app-modal-kicker">Administración</div>
                <h3 className="app-modal-title">Crear administrador</h3>
                <p className="app-modal-description">Registra un nuevo administrador manteniendo el mismo lenguaje visual del panel general.</p>
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
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <section className="app-form-section app-form-section--muted">
                <div className="mb-4">
                  <h4 className="app-form-section-title">Información personal</h4>
                  <p className="app-form-section-description">Datos base para crear la cuenta administrativa.</p>
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
                  <p className="app-form-section-description">Configura el código inicial y confirma el envío automático de credenciales.</p>
                </div>
                <div className="app-form-grid app-form-grid-2">
                <div className="app-form-field">
                  <label className="app-form-label">Código de acceso *</label>
                  <input
                    type="text"
                    value={formData.codigoAcceso}
                    onChange={(event) => setFormData({ ...formData, codigoAcceso: event.target.value })}
                    className="app-form-input"
                    placeholder="ADM001"
                    required
                  />
                </div>
                <div className="app-form-note flex items-center">
                    La contrasena se genera automaticamente y se envia al correo del administrador.
                </div>
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
                disabled={submitting || !formData.nombre.trim() || !formData.email.trim() || !formData.codigoAcceso.trim()}
                className="app-btn px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4A90E2' }}
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
