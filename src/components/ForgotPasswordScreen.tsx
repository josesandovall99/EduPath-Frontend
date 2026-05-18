import { useState, type FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const logoUdes = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/persona/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.mensaje || 'No se pudo procesar la solicitud');
      }

      setSuccess(true);
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
        padding: '1rem',
      }}
    >
      {/* Card principal */}
      <div
        className="auth-card"
        style={{ maxWidth: '780px', minHeight: '400px' }}
      >
        {/* ── Panel izquierdo: marca ── */}
        <div
          className="auth-card__brand relative flex flex-col items-center justify-center gap-5"
          style={{
            background: 'linear-gradient(160deg, #1a56db 0%, #1e429f 40%, #1a3a7c 70%, #142d61 100%)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position: 'absolute', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: '-60px', left: '-60px' }} />
            <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', bottom: '-40px', right: '-40px' }} />
          </div>

          {/* Logo UDES */}
          <div
            className="auth-logo-circle flex items-center justify-center rounded-full"
            style={{
              width: '130px', height: '130px',
              background: '#ffffff',
              borderRadius: '50%',
              boxShadow: '0 0 0 8px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3)',
              padding: '8px', flexShrink: 0, }}
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
          className="auth-card__form flex flex-col justify-between"
          style={{ background: '#f0f5ff', padding: '40px 36px 28px' }}
        >
          <div>
            <h2 className="font-bold mb-1" style={{ fontSize: '24px', color: '#1e3a5f' }}>
              Recuperar contraseña
            </h2>
            <p className="text-sm mb-6" style={{ color: '#4a6fa5' }}>
              Envío de enlace para restablecimiento de acceso.
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
                    <p className="font-semibold text-sm" style={{ color: '#1b5e20' }}>Solicitud registrada</p>
                    <p className="text-xs mt-1" style={{ color: '#2e7d32' }}>
                      Si el correo existe en el sistema, se enviará un enlace para restablecer la contraseña.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full rounded-lg font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: '#1a56db', padding: '12px', fontSize: '14px', letterSpacing: '1px' }}
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo correo */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1e3a5f' }}>Correo electrónico</label>
                  <div className="relative">
                    <Mail
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ left: '14px', color: '#4a7ac8' }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-lg py-3 pl-11 pr-4 outline-none transition-all"
                      style={{
                        background: '#fff',
                        border: '1.5px solid #bfd3f5',
                        color: '#1e3a5f',
                        fontSize: '15px',
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Botón enviar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{
                    background: loading ? '#6b8fc8' : '#1a56db',
                    padding: '12px',
                    fontSize: '14px',
                    letterSpacing: '1.5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Enviando...' : 'ENVIAR ENLACE'}
                </button>

                {/* Volver */}
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 text-sm transition-colors hover:underline"
                  style={{ color: '#3a6abf' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </button>
              </form>
            )}
          </div>

          {/* Footer créditos */}
          <div className="text-center mt-6" style={{ borderTop: '1px solid #bfd3f5', paddingTop: '14px' }}>
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
