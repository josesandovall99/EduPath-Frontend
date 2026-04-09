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
  contrasena: string;
  cargo: string;
  nivelAcceso: string;
}

const emptyForm: AdminFormData = {
  nombre: '',
  email: '',
  codigoAcceso: '',
  contrasena: '',
  cargo: '',
  nivelAcceso: ''
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
      !formData.codigoAcceso.trim() ||
      !formData.contrasena.trim() ||
      !formData.cargo.trim() ||
      !formData.nivelAcceso.trim()
    ) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }

    const personaId = localStorage.getItem('personaId');
    if (!personaId) {
      setFormError('No se encontro personaId del administrador actual.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, string> = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        codigoAcceso: formData.codigoAcceso.trim(),
        cargo: formData.cargo.trim(),
        nivelAcceso: formData.nivelAcceso.trim()
      };
      payload['contraseña'] = formData.contrasena.trim();

      const response = await fetch(`${API_BASE_URL}/administrador/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-persona-id': personaId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.mensaje || 'Error al crear administrador');
      }

      setSuccessMessage('Administrador creado correctamente.');
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
            Desde aqui puedes registrar administradores del sistema con sus credenciales y nivel de acceso.
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-[#3A4A5B]">Crear Administrador</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(event) => setFormData({ ...formData, nombre: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="Ej: Juan Perez"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="juan@demo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Codigo de acceso *</label>
                  <input
                    type="text"
                    value={formData.codigoAcceso}
                    onChange={(event) => setFormData({ ...formData, codigoAcceso: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="ADM001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contrasena *</label>
                  <input
                    type="password"
                    value={formData.contrasena}
                    onChange={(event) => setFormData({ ...formData, contrasena: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="Pass123!"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cargo *</label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(event) => setFormData({ ...formData, cargo: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="Administrador del Sistema"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de acceso *</label>
                  <select
                    value={formData.nivelAcceso}
                    onChange={(event) => setFormData({ ...formData, nivelAcceso: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all bg-white"
                    required
                  >
                    <option value="">Seleccionar nivel...</option>
                    <option value="TOTAL">TOTAL</option>
                    <option value="LIMITADO">LIMITADO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-4 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={submitting || !formData.nombre.trim() || !formData.email.trim() || !formData.codigoAcceso.trim() || !formData.contrasena.trim() || !formData.cargo.trim() || !formData.nivelAcceso.trim()}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
