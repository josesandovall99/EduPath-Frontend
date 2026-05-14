import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const logoUdes = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

interface ChangePasswordScreenProps {
  onComplete: () => void;
  isFirstLogin?: boolean;
  personaId?: number | null;
  userRole?: 'estudiante' | 'docente' | 'admin';
}

export function ChangePasswordScreen({ onComplete, isFirstLogin = false, personaId, userRole = 'estudiante' }: ChangePasswordScreenProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres',       met: newPassword.length >= 8 },
    { label: 'Al menos una mayúscula',     met: /[A-Z]/.test(newPassword) },
    { label: 'Al menos una minúscula',     met: /[a-z]/.test(newPassword) },
    { label: 'Al menos un número',         met: /\d/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allRequirementsMet || !passwordsMatch) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/persona/cambiar-password-inicial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nuevaContraseña: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.mensaje || 'Error al actualizar la contraseña');
      setSuccess(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = userRole === 'docente' ? 'docente' : userRole === 'admin' ? 'administrativo' : 'estudiante';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #1e3a5f 0%, #16294a 50%, #0d1e36 100%)' }}
    >
      {/* Card dos mitades — igual al login */}
      <div
        className="flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: '780px', maxWidth: '95vw', minHeight: '480px' }}
      >
        {/* ── Panel izquierdo: marca ── */}
        <div
          className="relative flex flex-col items-center justify-center gap-5"
          style={{ width: '50%', background: 'linear-gradient(160deg, #1a56db 0%, #1e429f 40%, #1a3a7c 70%, #142d61 100%)' }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position: 'absolute', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: '-60px', left: '-60px' }} />
            <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', bottom: '-40px', right: '-40px' }} />
          </div>

          <div
            className="flex items-center justify-center"
            style={{ width: '130px', height: '130px', background: '#ffffff', borderRadius: '50%', boxShadow: '0 0 0 8px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3)', padding: '8px' }}
          >
            <img src={logoUdes} alt="EduPath" style={{ width: '110px', height: '110px', objectFit: 'contain' }} />
          </div>

          <div className="text-center px-6">
            <h1 className="text-white font-bold" style={{ fontSize: '32px', letterSpacing: '1px' }}>EduPath</h1>
            <p className="text-white/80 text-sm mt-1">Aplicación de Apoyo Académico</p>
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px' }}>
              <p className="text-white/90 text-xs leading-relaxed">
                {isFirstLogin
                  ? `Actualización de clave requerida para acceso ${roleLabel}.`
                  : 'Gestión de seguridad de la cuenta.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div
          className="flex flex-col justify-between"
          style={{ width: '50%', background: '#f0f5ff', padding: '36px 32px 24px' }}
        >
          <div>
            <h2 className="font-bold mb-5" style={{ fontSize: '22px', color: '#1e3a5f' }}>
              {isFirstLogin ? 'Nueva contraseña' : 'Actualizar contraseña'}
            </h2>

            {/* Success */}
            {success && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <CheckCircle style={{ width: 18, height: 18, color: '#16a34a', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>¡Contraseña actualizada! Redirigiendo…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <AlertCircle style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Nueva contraseña */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 w-5 h-5" style={{ left: '14px', color: '#4a7ac8' }} />
                  <input
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Ingresa tu nueva contraseña"
                    className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                    style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', fontSize: '14px' }}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute top-1/2 -translate-y-1/2" style={{ right: '14px', color: '#6b8fc8', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Requisitos */}
                {newPassword && (
                  <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Requisitos</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {passwordRequirements.map((req, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {req.met
                            ? <CheckCircle style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0 }} />
                            : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #e2e8f0', flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: 11, color: req.met ? '#16a34a' : '#94a3b8' }}>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginBottom: 6 }}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 -translate-y-1/2 w-5 h-5" style={{ left: '14px', color: '#4a7ac8' }} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu nueva contraseña"
                    className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                    style={{
                      background: '#fff',
                      border: `1.5px solid ${confirmPassword && !passwordsMatch ? '#fca5a5' : passwordsMatch ? '#86efac' : '#bfd3f5'}`,
                      color: '#1e3a5f', fontSize: '14px',
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute top-1/2 -translate-y-1/2" style={{ right: '14px', color: '#6b8fc8', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <AlertCircle style={{ width: 13, height: 13, color: '#dc2626' }} />
                    <span style={{ fontSize: 11, color: '#dc2626' }}>Las contraseñas no coinciden</span>
                  </div>
                )}
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={loading || !allRequirementsMet || !passwordsMatch || success}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: loading || !allRequirementsMet || !passwordsMatch ? 'not-allowed' : 'pointer',
                  background: loading || !allRequirementsMet || !passwordsMatch ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #142d61)',
                  color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando…</>
                  : <><Lock style={{ width: 16, height: 16 }} />CONFIRMAR CAMBIO</>
                }
              </button>
            </form>
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #bfd3f5', paddingTop: '14px', marginTop: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#3a5a8a' }}>
              Desarrollado por <span style={{ fontWeight: 600 }}>Edgar Parada, José Sandoval, Cristian Estrada</span>
            </p>
            <p style={{ fontSize: '11px', color: '#6b8fc8', marginTop: 2 }}>
              © {new Date().getFullYear()} EduPath — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
