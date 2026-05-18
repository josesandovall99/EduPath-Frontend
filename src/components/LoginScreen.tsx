import { Lock, AlertCircle, Eye, EyeOff, User } from 'lucide-react';
import { useState } from 'react';
import { applyAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

const logoUdes = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

type Rol = 'estudiante' | 'docente' | 'admin';

interface LoginScreenProps {
  onLoginSuccess: (data: any) => void;
  onDocenteLoginSuccess: (data: any) => void;
  onLogin?: () => void;
  onAdminLogin: (data: any) => void;
  onShowRegister: () => void;
  onShowChangePassword?: () => void;
  onShowForgotPassword?: () => void;
}

export function LoginScreen({
  onLoginSuccess,
  onDocenteLoginSuccess,
  onAdminLogin,
  onShowForgotPassword,
}: LoginScreenProps) {
  const [rol, setRol] = useState<Rol>('estudiante');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const MSG_CREDENCIALES = 'Código de acceso o contraseña incorrectos.';
  const MSG_CONEXION = 'No fue posible conectar con el servidor. Intente nuevamente.';

  const clearLocalAuthState = () => {
    ['estudianteId', 'codigoEstudiante', 'nombreEstudiante', 'periodoAcademicoEstudiante',
     'adminId', 'personaId', 'authToken', 'adminSession', 'docenteSession',
     'appActiveRole', 'appNavigationState', 'adminDashboardState'].forEach(k =>
      localStorage.removeItem(k)
    );
    applyAuthHeaders();
  };

  const handleLogin = async () => {
    if (!codigo.trim() || !password.trim()) {
      setError('Completa el código y la contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    clearLocalAuthState();

    try {
      // Endpoint y payload según el rol seleccionado
      const config: Record<Rol, { url: string; body: Record<string, string> }> = {
        estudiante: {
          url: `${API_BASE_URL}/estudiante/login`,
          body: { codigoEstudiantil: codigo, contraseña: password },
        },
        docente: {
          url: `${API_BASE_URL}/docente/login`,
          body: { codigoAcceso: codigo, contraseña: password },
        },
        admin: {
          url: `${API_BASE_URL}/administrador/login`,
          body: { codigoAcceso: codigo, contraseña: password },
        },
      };

      const { url, body } = config[rol];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        if (res.status >= 500) {
          setError('Error interno del servidor. Intente más tarde.');
        } else {
          setError(data?.mensaje || MSG_CREDENCIALES);
        }
        return;
      }

      // Login exitoso — llamar al callback del rol correspondiente
      if (rol === 'estudiante') onLoginSuccess(data);
      else if (rol === 'docente') onDocenteLoginSuccess(data);
      else onAdminLogin(data);

    } catch {
      setError(MSG_CONEXION);
    } finally {
      setLoading(false);
    }
  };

  const roles: { key: Rol; label: string }[] = [
    { key: 'estudiante', label: 'Estudiante' },
    { key: 'docente', label: 'Docente' },
    { key: 'admin', label: 'Admin' },
  ];

  const placeholder = rol === 'estudiante' ? 'Código estudiantil' : 'Código de acceso';
  const hasError = Boolean(error);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3a5f 0%, #16294a 50%, #0d1e36 100%)',
        padding: '1rem',
      }}
    >
      <div className="auth-card" style={{ maxWidth: '780px', minHeight: '460px' }}>

        {/* ── Panel izquierdo: marca EduPath ── */}
        <div
          className="auth-card__brand relative flex flex-col items-center justify-center gap-5"
          style={{ background: 'linear-gradient(160deg, #1a56db 0%, #1e429f 40%, #1a3a7c 70%, #142d61 100%)' }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position: 'absolute', width: '260px', height: '260px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', top: '-60px', left: '-60px' }} />
            <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', bottom: '-40px', right: '-40px' }} />
          </div>

          <div
            className="auth-logo-circle flex items-center justify-center rounded-full"
            style={{ width: '130px', height: '130px', background: '#ffffff', borderRadius: '50%', boxShadow: '0 0 0 8px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.3)', padding: '8px', flexShrink: 0 }}
          >
            <img
              src={logoUdes}
              alt="Logo UDES Ingeniería de Sistemas"
              width={110} height={110}
              fetchpriority="high"
              decoding="sync"
              loading="eager"
              style={{ width: '110px', height: '110px', objectFit: 'contain' }}
            />
          </div>

          <div className="text-center">
            <h1 className="text-white font-bold" style={{ fontSize: '32px', letterSpacing: '1px' }}>EduPath</h1>
            <p className="text-white text-sm mt-1">Aplicación de Apoyo Académico</p>
          </div>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div className="auth-card__form flex flex-col justify-between" style={{ background: '#f0f5ff', padding: '40px 36px 28px' }}>
          <div>
            <h2 className="font-bold mb-5" style={{ fontSize: '26px', color: '#1e3a5f' }}>¡Bienvenido!</h2>

            {/* Selector de rol */}
            <div
              className="flex gap-1 mb-5 p-1 rounded-xl"
              style={{ background: '#dbeafe' }}
            >
              {roles.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setRol(key); setError(''); }}
                  className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: rol === key ? '#1a56db' : 'transparent',
                    color: rol === key ? '#fff' : '#1e3a5f',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error */}
            {hasError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
                style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#991b1b' }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b91c1c' }} />
                <p className="font-semibold leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Código */}
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 w-5 h-5" style={{ left: '14px', color: '#4a7ac8' }} />
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder={placeholder}
                  autoComplete="username"
                  className="w-full rounded-lg py-3 pl-11 pr-4 outline-none transition-all"
                  style={{ background: '#fff', border: hasError ? '1.5px solid #f87171' : '1.5px solid #bfd3f5', color: '#1e3a5f', fontSize: '15px' }}
                />
              </div>

              {/* Contraseña */}
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-5 h-5" style={{ left: '14px', color: '#4a7ac8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                  style={{ background: '#fff', border: hasError ? '1.5px solid #f87171' : '1.5px solid #bfd3f5', color: '#1e3a5f', fontSize: '15px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ right: '14px', color: '#6b8fc8' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Fila acciones */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onShowForgotPassword && onShowForgotPassword()}
                  className="text-sm whitespace-nowrap transition-colors hover:underline"
                  style={{ color: '#3a6abf' }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="rounded-lg font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{
                    background: loading ? '#6b8fc8' : '#1a56db',
                    fontSize: '13px',
                    letterSpacing: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: '10px 22px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loading ? '...' : 'INGRESAR'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center" style={{ borderTop: '1px solid #bfd3f5', paddingTop: '14px', marginTop: '24px' }}>
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
