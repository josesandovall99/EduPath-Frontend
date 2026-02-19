import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface DocenteManagementScreenProps {
  onBack: () => void;
}

interface Area {
  id: number;
  nombre: string;
}

interface DocentePersona {
  nombre?: string;
  email?: string;
}

interface Docente {
  id: number;
  especialidad?: string;
  codigoAcceso?: string;
  persona?: DocentePersona;
  area?: Area;
  areaId?: number;
}

interface DocenteFormData {
  nombre: string;
  email: string;
  codigoAcceso: string;
  especialidad: string;
  areaId: string;
}

const API_BASE_URL = 'http://localhost:4000';

const emptyForm: DocenteFormData = {
  nombre: '',
  email: '',
  codigoAcceso: '',
  especialidad: '',
  areaId: ''
};

export function DocenteManagementScreen({ onBack }: DocenteManagementScreenProps) {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [resultModal, setResultModal] = useState<{ open: boolean; success: boolean; message: string }>(
    { open: false, success: true, message: '' }
  );
  const [editingDocente, setEditingDocente] = useState<Docente | null>(null);
  const [formData, setFormData] = useState<DocenteFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadAreas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/areas`);
      if (!response.ok) {
        throw new Error('Error al cargar areas');
      }
      const data = await response.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading areas:', err);
      setAreas([]);
    }
  };

  const loadDocentes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/docente`);
      if (!response.ok) {
        throw new Error('Error al cargar docentes');
      }
      const data = await response.json();
      setDocentes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading docentes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar docentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
    loadDocentes();
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingDocente(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (docente: Docente) => {
    setEditingDocente(docente);
    setFormData({
      nombre: docente.persona?.nombre || '',
      email: docente.persona?.email || '',
      codigoAcceso: docente.codigoAcceso || '',
      especialidad: docente.especialidad || '',
      areaId: String(docente.area?.id ?? docente.areaId ?? '')
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCloseConfirm = () => {
    if (submitting) return;
    setShowConfirmCreate(false);
  };

  const handleCloseResult = () => {
    setResultModal({ open: false, success: true, message: '' });
  };

  const handleDelete = async (docente: Docente) => {
    const nombre = docente.persona?.nombre || 'este docente';
    if (!window.confirm(`Deseas eliminar a ${nombre}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/docente/${docente.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el docente');
      }

      await loadDocentes();
    } catch (err) {
      console.error('Error deleting docente:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar docente');
    }
  };

  const isFormValid = useMemo(() => {
    const baseValid =
      formData.nombre.trim() &&
      formData.email.trim() &&
      formData.codigoAcceso.trim() &&
      formData.especialidad.trim() &&
      formData.areaId.trim();

    if (!baseValid) {
      return false;
    }
    return true;
  }, [editingDocente, formData]);

  const handleSave = async () => {
    if (!isFormValid) {
      return;
    }

    if (!editingDocente && !showConfirmCreate) {
      setShowConfirmCreate(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        codigoAcceso: formData.codigoAcceso.trim(),
        especialidad: formData.especialidad.trim(),
        areaId: Number(formData.areaId)
      };

      const response = await fetch(
        `${API_BASE_URL}/docente${editingDocente ? `/${editingDocente.id}` : ''}`,
        {
          method: editingDocente ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(editingDocente ? 'Error al actualizar docente' : 'Error al crear docente');
      }

      await loadDocentes();
      handleCloseModal();
      if (!editingDocente) {
        setResultModal({
          open: true,
          success: true,
          message: 'Correo enviado con las credenciales del docente.'
        });
      }
    } catch (err) {
      console.error('Error saving docente:', err);
      const message = err instanceof Error ? err.message : 'Error al guardar docente';
      setError(message);
      if (!editingDocente) {
        setResultModal({
          open: true,
          success: false,
          message: `No se pudo enviar el correo o crear el docente. ${message}`
        });
      }
    } finally {
      setSubmitting(false);
      setShowConfirmCreate(false);
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
                <h1 className="text-[#3A4A5B]">Gestion de Docentes</h1>
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl text-[#3A4A5B]">Docentes registrados</h2>
            <p className="text-gray-500 text-sm">Administra los docentes, sus areas y especialidades.</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
            style={{ backgroundColor: '#14B8A6' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo docente</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
            <p className="text-gray-600">Cargando docentes...</p>
          </div>
        ) : docentes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">No hay docentes registrados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-gray-200 text-sm font-medium text-gray-500">
              <span>Nombre</span>
              <span>Email</span>
              <span>Especialidad</span>
              <span>Area</span>
              <span>Codigo</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-gray-100">
              {docentes.map((docente) => (
                <div key={docente.id} className="grid grid-cols-6 gap-4 px-6 py-4 text-sm text-gray-700 items-center">
                  <div>
                    <p className="text-[#3A4A5B] font-medium">{docente.persona?.nombre || 'Sin nombre'}</p>
                  </div>
                  <div>
                    <p>{docente.persona?.email || '-'}</p>
                  </div>
                  <div>
                    <p>{docente.especialidad || '-'}</p>
                  </div>
                  <div>
                    <p>{docente.area?.nombre || '-'}</p>
                  </div>
                  <div>
                    <p>{docente.codigoAcceso || '-'}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleOpenEdit(docente)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(docente)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-2xl font-semibold text-[#3A4A5B]">
                {editingDocente ? 'Editar Docente' : 'Crear Docente'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!editingDocente && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  Se enviaran automaticamente las credenciales al correo del docente.
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
                    placeholder="Ej: Ana Gomez"
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
                    placeholder="ana@demo.com"
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
                    placeholder="DOC123"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad *</label>
                  <input
                    type="text"
                    value={formData.especialidad}
                    onChange={(event) => setFormData({ ...formData, especialidad: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
                    placeholder="Matematicas"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Area *</label>
                  <select
                    value={formData.areaId}
                    onChange={(event) => setFormData({ ...formData, areaId: event.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all bg-white"
                    required
                  >
                    <option value="">Selecciona un area</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
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
                onClick={handleSave}
                disabled={submitting || !isFormValid}
                className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: '#14B8A6' }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingDocente ? 'Actualizar Docente' : 'Crear Docente'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmCreate && !editingDocente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">Confirmar creacion</h3>
              <button
                onClick={handleCloseConfirm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm text-gray-600">
              <p>Verifica que los datos del docente sean correctos.</p>
              <p>Se enviaran las credenciales al correo proporcionado.</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseConfirm}
                disabled={submitting}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="px-5 py-2.5 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#14B8A6' }}
              >
                Confirmar y crear
              </button>
            </div>
          </div>
        </div>
      )}

      {resultModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-[#3A4A5B]">
                {resultModal.success ? 'Correo enviado' : 'Fallo al enviar'}
              </h3>
              <button
                onClick={handleCloseResult}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-sm text-gray-600">
              {resultModal.message}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleCloseResult}
                className="px-5 py-2.5 text-white rounded-lg hover:shadow-lg transition-all"
                style={{ backgroundColor: resultModal.success ? '#14B8A6' : '#EF4444' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
