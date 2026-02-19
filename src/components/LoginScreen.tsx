import { Mail, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { useState } from 'react';
import logoImage from '../assets/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { applyAuthHeaders } from '../utils/authHeaders';


interface LoginScreenProps {
  onLoginSuccess: (data: any) => void; // Cambiado
  onDocenteLoginSuccess: (data: any) => void;
  onLogin?: () => void;
  onAdminLogin: () => void;
  onShowRegister: () => void;
  onShowChangePassword?: () => void;
}

export function LoginScreen({ onLoginSuccess, onDocenteLoginSuccess, onLogin, onAdminLogin, onShowRegister, onShowChangePassword }: LoginScreenProps) {
  const [codigoEstudiantil, setCodigoEstudiantil] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

const handleStudentLogin = async () => {
    setError('');
    setLoading(true);

    const parseResponse = async (res: Response) => {
      const text = await res.text();
      try { return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : undefined }; }
      catch { return { ok: res.ok, status: res.status, body: { mensaje: text } }; }
    };

    try {
      // 1) Intentar login como administrador primero
      try {
        const adminRes = await fetch('http://localhost:4000/administrador/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ codigoAcceso: codigoEstudiantil, contraseña: password }),
        });

        const adminParsed = await parseResponse(adminRes);
        if (adminParsed.ok) {
          const adminPersonaId = adminParsed.body?.administrador?.personaId;
          if (adminPersonaId) {
            localStorage.setItem('personaId', String(adminPersonaId));
            applyAuthHeaders();
          }
          // Si es admin y credenciales correctas, redirigimos al dashboard admin
          onAdminLogin && onAdminLogin();
          setLoading(false);
          return;
        }

        if (adminParsed.status && adminParsed.status >= 500) {
          setError(`Servidor: ${adminParsed.status} - ${adminParsed.body?.mensaje || 'Error interno'}`);
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
        const docenteRes = await fetch('http://localhost:4000/docente/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ codigoAcceso: codigoEstudiantil, contraseña: password })
        });

        const docenteParsed = await parseResponse(docenteRes);
        if (docenteParsed.ok) {
          onDocenteLoginSuccess(docenteParsed.body);
          setLoading(false);
          return;
        }

        if (docenteParsed.status && docenteParsed.status >= 500) {
          setError(`Servidor: ${docenteParsed.status} - ${docenteParsed.body?.mensaje || 'Error interno'}`);
          setLoading(false);
          return;
        }
      } catch (netErr) {
        console.warn('No se pudo comprobar docente:', netErr);
      }

      // 3) Intentar login como estudiante (manteniendo compatibilidad con distintas cargas)
      const postPayload = async (payload: Record<string, any>) => {
        try {
          const res = await fetch('http://localhost:4000/estudiante/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
          setError(`Servidor: ${result.status} - ${result.body?.mensaje || result.body?.message || 'Error interno'}`);
          setLoading(false);
          return;
        }
      }

      const summary = attempts.map(a => `payload=${Object.keys(a.payload).join(',')} status=${a.status} msg=${a.body?.mensaje || a.body?.message || JSON.stringify(a.body)}`).join(' | ');
      setError(`Autenticación fallida. Intentos: ${summary}`);

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || String(err) || 'Error de conexión');
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
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Código Estudiantil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Estudiantil</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={codigoEstudiantil}
                  onChange={(e) => setCodigoEstudiantil(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
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

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-400">o</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Botón Google (Solo Admin) */}
            <button 
              onClick={onAdminLogin}
              className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Acceso Administrativo</span>
            </button>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button className="text-[#4A90E2] hover:text-[#3A7BC8] transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Change Password Button (Temporal para pruebas) */}
            <div className="mt-3">
              <button
                onClick={() => onShowChangePassword && onShowChangePassword()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#7ED6A7] hover:text-[#6EC597] border border-[#7ED6A7] hover:border-[#6EC597] rounded-lg transition-all duration-300 hover:bg-green-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>Cambiar contraseña (Demo)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
