import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ChangePasswordScreenProps {
  onComplete: () => void;
  isFirstLogin?: boolean;
  personaId?: number | null;
  userRole?: 'estudiante' | 'docente';
}

export function ChangePasswordScreen({ onComplete, isFirstLogin = false, personaId, userRole = 'estudiante' }: ChangePasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // 1. Definimos las reglas
  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Al menos una letra mayúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una letra minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Al menos un número', met: /\d/.test(newPassword) }
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet || !passwordsMatch) return;

    setLoading(true);
    try {
      // Nota: Asegúrate de que el puerto sea el correcto (4000 para backend)
      const response = await fetch('https://edupath-backend-xch1.onrender.com/persona/cambiar-password-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          nuevaContraseña: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || 'Error al actualizar la contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      setError(err?.message || String(err) || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7] p-8">
      <div className="w-full max-w-md mx-auto"> {/* Card más estrecho para coincidir con el diseño */}

        {/* Header */}
        <div className="mb-8 text-center">
             {/* Asegúrate que la imagen cargue, si no pon un placeholder */}
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
             <span className="text-3xl">🎓</span>
            </div>
            
          <h1 className="text-white mb-2 text-3xl font-bold">
            {isFirstLogin ? 'Cambio de Contraseña' : 'Actualizar Contraseña'}
          </h1>
          <p className="text-white/90">
            {isFirstLogin
              ? userRole === 'docente'
                ? 'Por seguridad, configura tu nueva clave para acceder como docente.'
                : 'Por seguridad, configura tu nueva clave de acceso.'
              : 'Mantén tu cuenta segura.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {isFirstLogin && (
            <div className="bg-blue-50 border-b border-blue-100 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700">
                <strong>Importante:</strong> Crea una contraseña que recuerdes fácilmente.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-6">

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

        {/* Nueva contraseña */}
              <div>
                <label className="block text-[#3A4A5B] font-medium mb-2 text-sm">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Crea una contraseña segura"
                    className="w-full border border-gray-300 rounded-lg p-3 pl-11 pr-12 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all placeholder:text-gray-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Requisitos (Lógica Source 1 con Estilo Source 2) [cite: 25, 69] */}
                <div className="mt-4 space-y-3 bg-gray-50 p-5 rounded-xl">
                  <p className="text-xs text-[#3A4A5B] font-semibold mb-1">Requisitos de contraseña:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {req.met ? (
                          <CheckCircle className="w-5 h-5 text-[#7ED6A7]" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
                        )}
                        <span className={req.met ? 'text-[#7ED6A7]' : 'text-gray-400'}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirmar contraseña - Ahora con Ojo y Candado */}
              <div>
                <label className="block text-[#3A4A5B] font-medium mb-2 text-sm">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className={`w-full border rounded-lg p-3 pl-11 pr-12 bg-white outline-none transition-all ${
                        passwordsMatch && confirmPassword 
                        ? 'border-[#7ED6A7] focus:ring-2 focus:ring-[#7ED6A7]' 
                        : 'border-gray-300 focus:ring-2 focus:ring-[#4A90E2]'
                    } placeholder:text-gray-300`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {confirmPassword && !passwordsMatch && (
                  <div className="mt-2 flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Las contraseñas no coinciden</span>
                  </div>
                )}
              </div>

              {/* Botón con el color de la imagen [cite: 89] */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !allRequirementsMet || !passwordsMatch}
                  className={`w-full py-4 rounded-lg text-white font-medium text-lg shadow-md transition-all flex items-center justify-center gap-2 ${
                    loading || !allRequirementsMet || !passwordsMatch
                      ? 'bg-[#F5A97F] cursor-not-allowed shadow-none' 
                      : 'bg-[#F5A97F] hover:bg-[#F39759] hover:shadow-lg'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Confirmar cambio de contraseña</span>
                    </>
                  )}
                </button>
              </div>
          </form>
        </div>

        {/* Footer simple */}
        {!success && (
          <div className="mt-6 text-center">
             <p className="text-white/60 text-xs">EduPath © 2024</p>
          </div>
        )}
      </div>
    </div>
  );
}