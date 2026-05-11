import { Lock, AlertCircle, Eye, EyeOff, User } from 'lucide-react';
import { useState } from 'react';
import { applyAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

const logoUdes = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;


interface LoginScreenProps {
  onLoginSuccess: (data: any) => void; // Cambiado
  onDocenteLoginSuccess: (data: any) => void;
  onLogin?: () => void;
  onAdminLogin: (data: any) => void;
  onShowRegister: () => void;
  onShowChangePassword?: () => void;
  onShowForgotPassword?: () => void;
}

export function LoginScreen({ onLoginSuccess, onDocenteLoginSuccess, onLogin, onAdminLogin, onShowRegister, onShowForgotPassword }: LoginScreenProps) {
  const [codigoEstudiantil, setCodigoEstudiantil] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const invalidCredentialsMessage = 'Código de acceso o contraseña incorrectos. Intente nuevamente.';
  const hasAuthError = Boolean(error);

  const clearLocalAuthState = () => {
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('periodoAcademicoEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('docenteSession');
    localStorage.removeItem('appActiveRole');
    localStorage.removeItem('appNavigationState');
    localStorage.removeItem('adminDashboardState');
    applyAuthHeaders();
  };

const handleStudentLogin = async () => {
    setError('');
    setLoading(true);

    // Evitar mezclar token/persona de una sesión anterior con otro rol
    clearLocalAuthState();

    const parseResponse = async (res: Response) => {
      const text = await res.text();
      try { return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : undefined }; }
      catch { return { ok: res.ok, status: res.status, body: { mensaje: text } }; }
    };

    try {
      // 1) Intentar login como administrador primero
      try {
        const adminEndpoints = [
          `${API_BASE_URL}/administrador/login`,
          `${API_BASE_URL}/administradores/login`,
          `${API_BASE_URL}/admin/login`
        ];

        let adminParsed: { ok: boolean; status: number; body?: any } | null = null;

        for (const endpoint of adminEndpoints) {
          const adminRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ codigoAcceso: codigoEstudiantil, contraseña: password }),
          });

          adminParsed = await parseResponse(adminRes);

          if (adminParsed.ok || adminParsed.status !== 404) {
            break;
          }
        }

        if (adminParsed?.ok) {
          const adminPersonaId =
            adminParsed.body?.administrador?.personaId ||
            adminParsed.body?.personaId ||
            adminParsed.body?.persona?.id;
          const adminId =
            adminParsed.body?.administrador?.id ||
            adminParsed.body?.adminId ||
            adminParsed.body?.administradorId;
          if (adminPersonaId) {
            localStorage.setItem('personaId', String(adminPersonaId));
          }
          if (adminId) {
            localStorage.setItem('adminId', String(adminId));
          }
          const adminTokenCandidates = [
            adminParsed.body?.token,
            adminParsed.body?.accessToken,
            adminParsed.body?.access_token,
            adminParsed.body?.administrador?.token,
            adminParsed.body?.administrador?.accessToken,
            adminParsed.body?.administrador?.access_token
          ];
          const adminToken = adminTokenCandidates.find((value) => typeof value === 'string' && value.trim().length > 0);
          if (adminToken) {
            localStorage.setItem('authToken', String(adminToken));
          }
          applyAuthHeaders();
          // Si es admin y credenciales correctas, redirigimos al dashboard admin
          onAdminLogin && onAdminLogin(adminParsed.body);
          setLoading(false);
          return;
        }

        if (adminParsed?.status && adminParsed.status >= 500) {
          setError(invalidCredentialsMessage);
          setLoading(false);
          return;
        }
        // Si 401/404 seguimos intentando como estudiante
      } catch (netErr) {
        console.warn('No se pudo comprobar administrador:', netErr);
        // continuamos con intento de estudiante
      }

      // 2) Intentar login como docente
      try {
        const docenteRes = await fetch(`${API_BASE_URL}/docente/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ codigoAcceso: codigoEstudiantil, contraseña: password })
        });

        const docenteParsed = await parseResponse(docenteRes);
        if (docenteParsed.ok) {
          onDocenteLoginSuccess(docenteParsed.body);
          setLoading(false);
          return;
        }

        if (docenteParsed.status && docenteParsed.status >= 500) {
          setError(invalidCredentialsMessage);
          setLoading(false);
          return;
        }
      } catch (netErr) {
        console.warn('No se pudo comprobar docente:', netErr);
      }

      // 3) Intentar login como estudiante (manteniendo compatibilidad con distintas cargas)
      const postPayload = async (payload: Record<string, any>) => {
        try {
          const res = await fetch(`${API_BASE_URL}/estudiante/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          });
          return await parseResponse(res);
        } catch (networkErr: any) {
          return { ok: false, status: 0, body: { mensaje: String(networkErr) } };
        }
      };

      const candidates = [
        { codigoEstudiantil: codigoEstudiantil, contraseña: password },
        { codigoEstudiantil: codigoEstudiantil, password },
        { codigo: codigoEstudiantil, password },
        { username: codigoEstudiantil, password },
        { email: codigoEstudiantil, password }
      ];

      const attempts: Array<{payload: Record<string, any>; status: number; body: any}> = [];

      for (const payload of candidates) {
        const result = await postPayload(payload);
        attempts.push({ payload, status: result.status, body: result.body });
        if (result.ok) {
          onLoginSuccess(result.body);
          setLoading(false);
          return;
        }

        if (result.status && result.status >= 500) {
          setError(invalidCredentialsMessage);
          setLoading(false);
          return;
        }
      }

      const hasInvalidCredentials = attempts.some((attempt) => [400, 401, 403].includes(attempt.status));
      const hasConnectionIssues = attempts.every((attempt) => attempt.status === 0);

      if (hasInvalidCredentials) {
        setError(invalidCredentialsMessage);
      } else if (hasConnectionIssues) {
        setError('No fue posible establecer conexión con el servidor. Intente nuevamente en unos segundos.');
      } else {
        setError(invalidCredentialsMessage);
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(invalidCredentialsMessage);
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
      {/* Card principal — dos mitades simétricas */}
      <div
        className="flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: '780px', maxWidth: '95vw', minHeight: '460px' }}
      >
        {/* ── Panel izquierdo: marca EduPath ── */}
        <div
          className="relative flex flex-col items-center justify-center gap-5"
          style={{
            width: '50%',
            background: 'linear-gradient(160deg, #1a56db 0%, #1e429f 40%, #1a3a7c 70%, #142d61 100%)',
          }}
        >
          {/* Círculos decorativos de fondo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div style={{ position:'absolute', width:'260px', height:'260px', borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)', top:'-60px', left:'-60px' }}/>
            <div style={{ position:'absolute', width:'180px', height:'180px', borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', bottom:'-40px', right:'-40px' }}/>
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

          {/* Nombre y subtítulo */}
          <div className="text-center">
            <h1 className="text-white font-bold" style={{ fontSize: '32px', letterSpacing: '1px' }}>EduPath</h1>
            <p className="text-white text-sm mt-1">Aplicación de Apoyo Académico</p>
          </div>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div
          className="flex flex-col justify-between"
          style={{ width: '50%', background: '#f0f5ff', padding: '40px 36px 28px' }}
        >
          <div>
            <h2 className="font-bold mb-6" style={{ fontSize: '28px', color: '#1e3a5f' }}>¡Bienvenido!</h2>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm shadow-sm"
                style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#991b1b' }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b91c1c' }} />
                <p className="text-left font-semibold leading-relaxed" style={{ color: '#991b1b' }}>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Campo usuario */}
              <div className="relative">
                <User
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ left: '14px', color: '#4a7ac8' }}
                />
                <input
                  type="text"
                  value={codigoEstudiantil}
                  onChange={(e) => setCodigoEstudiantil(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudentLogin()}
                  placeholder="Código de acceso"
                  className="w-full rounded-lg py-3 pl-11 pr-4 outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: hasAuthError ? '1.5px solid #f87171' : '1.5px solid #bfd3f5',
                    color: hasAuthError ? '#991b1b' : '#1e3a5f',
                    fontSize: '15px',
                  }}
                />
              </div>

              {/* Campo contraseña */}
              <div className="relative">
                <Lock
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ left: '14px', color: '#4a7ac8' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStudentLogin()}
                  placeholder="Contraseña"
                  className="w-full appearance-none rounded-lg py-3 pl-11 pr-12 outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: hasAuthError ? '1.5px solid #f87171' : '1.5px solid #bfd3f5',
                    color: hasAuthError ? '#991b1b' : '#1e3a5f',
                    fontSize: '15px',
                  }}
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

              {/* Fila: recuperar contraseña + botón ingresar */}
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
                  onClick={handleStudentLogin}
                  disabled={loading}
                  className="rounded-lg font-bold tracking-widest text-white transition-all duration-200 hover:opacity-90 active:scale-95"
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

          {/* Footer créditos */}
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
