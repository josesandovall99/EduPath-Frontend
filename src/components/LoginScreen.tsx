import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface LoginScreenProps {
  onLoginSuccess: (data: any) => void; // Cambiado
  onLogin: () => void;
  onAdminLogin: () => void;
  onShowRegister: () => void;
}

export function LoginScreen({ onLoginSuccess, onAdminLogin, onShowRegister }: LoginScreenProps) {
  const [codigoEstudiantil, setCodigoEstudiantil] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

const handleStudentLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // Petición al Backend
      const response = await fetch('http://localhost:4000/estudiante/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigoEstudiantil: codigoEstudiantil,
          contraseña: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || 'Credenciales incorrectas');
      }

      // Si todo sale bien, pasamos la data a App.tsx
      onLoginSuccess(data);

    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };


return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A6FA5] via-[#5B9FED] to-[#7ED6A7]">
      <div className="w-full max-w-md p-8">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
            {/* Si no tienes la imagen disponible localmente, usa un placeholder o el import correcto */}
            <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white mb-2 text-3xl font-bold">EduPath</h1>
          <p className="text-white/90">Plataforma Educativa</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <h2 className="text-[#3A4A5B] text-2xl font-bold mb-6 text-center">Estudiantes</h2>
          
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
                  className="w-full border border-gray-300 rounded-lg p-3 pl-11 focus:ring-2 focus:ring-[#4A6FA5] outline-none"
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
                  className="w-full border border-gray-300 rounded-lg p-3 pl-11 focus:ring-2 focus:ring-[#4A6FA5] outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Botón Ingresar (Estudiantes) */}
            <button 
              onClick={handleStudentLogin}
              disabled={loading}
              className={`w-full bg-[#F5A97F] text-white p-3 rounded-lg transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#F39759] hover:scale-[1.02] shadow-md'}`}
            >
              <span>{loading ? 'Verificando...' : 'Ingresar'}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>

            {/* Separador */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Administradores</span></div>
            </div>

            {/* Botón Google (Solo Admin) */}
            <button 
              onClick={onAdminLogin}
              className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Acceso Administrativo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
