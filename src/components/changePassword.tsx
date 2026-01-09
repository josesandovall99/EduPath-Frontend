import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ChangePasswordScreenProps {
  onComplete: () => void;
  onBack?: () => void;
  isFirstLogin?: boolean;
  // Añadimos personaId como prop para saber a quién actualizar
  personaId: number; 
}

export function ChangePasswordScreen({ onComplete, onBack, isFirstLogin = false, personaId }: ChangePasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validaciones de contraseña (se mantienen igual) 
  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Al menos una letra mayúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una letra minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Al menos un número', met: /\d/.test(newPassword) }
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet || !passwordsMatch) return;

    setLoading(true);

    try {
      // Llamada al endpoint que creamos en el backend 
      const response = await fetch('http://localhost:4000/estudiante/cambiar-password-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaId: personaId, // Pasado por props desde el Login
          nuevaContraseña: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || 'Error al actualizar la contraseña');
      }

      // Éxito: Mostrar pantalla de confirmación 
      setSuccess(true);
      
      // Esperar 2 segundos y llamar a onComplete para redirigir al Dashboard
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A6FA5] to-[#166088] p-8">
    <div className="w-full max-w-2xl">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
          <img src={logoImage} alt="EduPath Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-white mb-2 text-3xl">
          {isFirstLogin ? 'Cambio de Contraseña Obligatorio' : 'Cambiar Contraseña'}
        </h1>
        <p className="text-white/90">
          {isFirstLogin
            ? 'Por tu seguridad, debes cambiar tu contraseña temporal'
            : 'Actualiza tu contraseña para mantener tu cuenta segura'}
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Aviso primer login */}
        {isFirstLogin && (
          <div className="bg-orange-50 border-b border-orange-200 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-[#F5A97F]" />
            <p className="text-sm text-[#3A4A5B]">
              <strong>Importante:</strong> Debes crear una nueva contraseña segura.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Nueva contraseña */}
          <div>
            <label className="block text-[#3A4A5B] mb-2">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#F5A97F] outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-gray-400"
              >
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-[#3A4A5B] mb-2">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#F5A97F] outline-none"
              required
            />
            {confirmPassword && (
              <p className={`text-sm mt-2 ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            className={`w-full py-4 rounded-lg text-white font-bold transition-all ${
              loading || !allRequirementsMet || !passwordsMatch
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#F5A97F] hover:bg-[#F39759]'
            }`}
          >
            {loading ? 'Procesando...' : 'Confirmar cambio'}
          </button>

        </form>
      </div>

      {!success && (
        <p className="mt-6 text-center text-white/80 text-sm">
          ¿Necesitas ayuda? Contacta al administrador del sistema
        </p>
      )}
    </div>
  </div>
);

}