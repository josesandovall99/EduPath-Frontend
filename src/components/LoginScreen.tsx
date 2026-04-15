import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { applyAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';


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
  const invalidCredentialsMessage = 'Credenciales inválidas. Verifica tu código y contraseña e inténtalo de nuevo.';
  const hasAuthError = Boolean(error);

  const clearLocalAuthState = () => {
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('authToken');
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
        setError('No se pudo conectar con el servidor. Intenta nuevamente en unos segundos.');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7]">
      <div className="w-full max-w-md p-8">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-white mb-2 text-3xl">EduPath</h1>
          <p className="text-white/90">Plataforma Educativa para Ingeniería de Sistemas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <h2 className="text-[#3A4A5B] mb-6 text-center text-2xl">Iniciar Sesión</h2>
          
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
            {/* Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={codigoEstudiantil}
                  onChange={(e) => setCodigoEstudiantil(e.target.value)}
                  className={`w-full rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${hasAuthError ? 'border border-red-300 focus:ring-red-300' : 'border border-gray-300 focus:ring-[#4A90E2]'}`}
                  style={hasAuthError ? { borderColor: '#f87171', color: '#991b1b' } : undefined}
                  placeholder="Ej: 1151234"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full appearance-none rounded-lg p-3 pl-11 pr-14 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${hasAuthError ? 'border border-red-300 focus:ring-red-300' : 'border border-gray-300 focus:ring-[#4A90E2]'}`}
                  style={hasAuthError ? { borderColor: '#f87171', color: '#991b1b' } : undefined}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="z-10 text-gray-400 hover:text-gray-600"
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {/* Botón Ingresar (Estudiantes) */}
            <button 
              onClick={handleStudentLogin}
              disabled={loading}
              className={`w-full bg-[#F5A97F] text-white p-3 rounded-lg hover:bg-[#F39759] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span>{loading ? 'Verificando...' : 'Ingresar'}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                onClick={() => onShowForgotPassword && onShowForgotPassword()}
                className="text-[#4A90E2] hover:text-[#3A7BC8] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
