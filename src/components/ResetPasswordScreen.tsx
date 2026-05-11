import { useMemo, useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const logoUdes = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

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
    { label: 'Mínimo 8 caracteres', met: newPassword.length >= 8 },
    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una minúscula', met: /[a-z]/.test(newPassword) },
    { label: 'Al menos un número', met: /\d/.test(newPassword) }
  ]), [newPassword]);

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El token no es válido.');
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
        throw new Error(data?.mensaje || 'No se pudo restablecer la contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || String(err) || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3a5f 0%, #16294a 50%, #0d1e36 100%)',
      }}
    >
      {/* Card principal — más ancha por los requisitos */}
      <div
        className="flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: '900px', maxWidth: '96vw', minHeight: '480px' }}
      >
        {/* ── Panel izquierdo: marca EduPath ── */}
        <div
          className="relative flex flex-col items-center justify-center gap-5"
          style={{
            width: '38%',
            background: 'linear-gradient(160deg, #1a56db 0%, #1e429f 40%, #1a3a7c 70%, #142d61 100%)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position: 'absolute', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: '-60px', left: '-60px' }} />
            <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', bottom: '-40px', right: '-40px' }} />
          </div>

          {/* Logo UDES */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: '130px', height: '130px',
              background: '#ffffff',
              borderRadius: '50%',
              boxShadow: '0 0 0 8px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3)',
              padding: '8px',
            }}
          >
            <img
              src={logoUdes}
              alt="Logo UDES Ingeniería de Sistemas"
              style={{ width: '110px', height: '110px', objectFit: 'contain' }}
            />
          </div>

          <div className="text-center">
            <h1 className="text-white font-bold" style={{ fontSize: '32px', letterSpacing: '1px' }}>EduPath</h1>
            <p className="text-white text-sm mt-1">Aplicación de Apoyo Académico</p>
          </div>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div
          className="flex flex-col justify-between"
          style={{ width: '62%', background: '#f0f5ff', padding: '36px 40px 28px' }}
        >
          <div>
            <h2 className="font-bold mb-1" style={{ fontSize: '24px', color: '#1e3a5f' }}>
              Restablecer contraseña
            </h2>
            <p className="text-sm mb-5" style={{ color: '#4a6fa5' }}>
              Crea una nueva contraseña segura para tu cuenta.
            </p>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
                style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#991b1b' }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b91c1c' }} />
                <p className="font-semibold leading-relaxed" style={{ color: '#991b1b' }}>{error}</p>
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div
                  className="flex items-start gap-3 rounded-lg p-4"
                  style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}
                >
                  <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#2e7d32' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1b5e20' }}>Contraseña actualizada</p>
                    <p className="text-xs mt-1" style={{ color: '#2e7d32' }}>Redirigiendo al inicio de sesión...</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nueva contraseña */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1e3a5f' }}>Nueva contraseña</label>
                  <div className="relative">
                    <Lock
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ left: '14px', color: '#4a7ac8' }}
                    />
                    <input
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crea una contraseña segura"
                      className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                      style={{
                        background: '#fff',
                        border: '1.5px solid #bfd3f5',
                        color: '#1e3a5f',
                        fontSize: '15px',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ right: '14px', color: '#6b8fc8' }}
                      aria-label={showNew ? 'Ocultar' : 'Mostrar'}
                    >
                      {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Requisitos */}
                  <div
                    className="mt-3 rounded-lg p-3"
                    style={{ background: '#e8eef8', border: '1px solid #bfd3f5' }}
                  >
                    <p className="text-xs font-semibold mb-2" style={{ color: '#1e3a5f' }}>Requisitos:</p>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#1a56db' }} />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: '#9ab3d8' }} />
                          )}
                          <span style={{ color: req.met ? '#1a56db' : '#6b8fc8' }}>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1e3a5f' }}>Confirmar contraseña</label>
                  <div className="relative">
                    <Lock
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ left: '14px', color: '#4a7ac8' }}
                    />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                      style={{
                        background: '#fff',
                        border: confirmPassword
                          ? passwordsMatch ? '1.5px solid #1a56db' : '1.5px solid #f87171'
                          : '1.5px solid #bfd3f5',
                        color: '#1e3a5f',
                        fontSize: '15px',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ right: '14px', color: '#6b8fc8' }}
                      aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                    >
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
                      <span className="text-xs font-medium" style={{ color: '#dc2626' }}>Las contraseñas no coinciden</span>
                    </div>
                  )}
                </div>

                {/* Botón confirmar */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm transition-colors hover:underline whitespace-nowrap"
                    style={{ color: '#3a6abf' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !allRequirementsMet || !passwordsMatch}
                    className="flex-1 rounded-lg font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: loading || !allRequirementsMet || !passwordsMatch ? '#6b8fc8' : '#1a56db',
                      padding: '11px',
                      fontSize: '14px',
                      letterSpacing: '1.5px',
                      cursor: loading || !allRequirementsMet || !passwordsMatch ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        CONFIRMAR CAMBIO
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer créditos */}
          <div className="text-center mt-5" style={{ borderTop: '1px solid #bfd3f5', paddingTop: '14px' }}>
            <p className="text-xs" style={{ color: '#3a5a8a' }}>
              Desarrollado por <span className="font-semibold">Edgar Parada, José Sandoval, Cristian Estrada</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#6b8fc8' }}>
              © {new Date().getFullYear()} EduPath — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
