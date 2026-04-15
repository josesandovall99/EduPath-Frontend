import { useMemo, useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

interface ResetPasswordScreenProps {
  token: string | null;
  onComplete: () => void;
  onBack: () => void;
}

export function ResetPasswordScreen({ token, onComplete, onBack }: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordRequirements = useMemo(() => ([
    { label: 'Minimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Al menos una letra mayuscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una letra minuscula', met: /[a-z]/.test(newPassword) },
    { label: 'Al menos un numero', met: /\d/.test(newPassword) }
  ]), [newPassword]);

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El token no es valido.');
      return;
    }

    if (!allRequirementsMet || !passwordsMatch) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/persona/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaContraseña: newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || 'No se pudo restablecer la contrasena');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || String(err) || 'Ocurrio un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7] p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-white mb-2 text-3xl font-bold">Restablecer contrasena</h1>
          <p className="text-white/90">Crea una nueva contrasena segura.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-medium">Contrasena actualizada</span>
                </div>
                <p className="text-sm text-gray-600">Redirigiendo al inicio de sesion...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[#3A4A5B] font-medium mb-2 text-sm">Nueva contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crea una contrasena segura"
                      className="w-full appearance-none border border-gray-300 rounded-lg p-3 pl-11 pr-14 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all placeholder:text-gray-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="z-10 text-gray-400 hover:text-gray-600"
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                      {showNew ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>

                  <div className="mt-4 space-y-3 bg-gray-50 p-5 rounded-xl">
                    <p className="text-xs text-[#3A4A5B] font-semibold mb-1">Requisitos de contrasena:</p>
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

                <div>
                  <label className="block text-[#3A4A5B] font-medium mb-2 text-sm">Confirmar nueva contrasena</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contrasena"
                      className={`w-full appearance-none border rounded-lg p-3 pl-11 pr-14 bg-white outline-none transition-all ${
                        passwordsMatch && confirmPassword
                          ? 'border-[#7ED6A7] focus:ring-2 focus:ring-[#7ED6A7]'
                          : 'border-gray-300 focus:ring-2 focus:ring-[#4A90E2]'
                      } placeholder:text-gray-300`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="z-10 text-gray-400 hover:text-gray-600"
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                      {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>

                  {confirmPassword && !passwordsMatch && (
                    <div className="mt-2 flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Las contrasenas no coinciden</span>
                    </div>
                  )}
                </div>

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
                      <span>Confirmar cambio de contrasena</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 text-[#4A90E2] hover:text-[#3A7BC8] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesion
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
