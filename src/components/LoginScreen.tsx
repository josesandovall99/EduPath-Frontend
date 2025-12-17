import { Mail, Lock, ArrowRight } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface LoginScreenProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onShowRegister: () => void;
}

export function LoginScreen({ onLogin, onAdminLogin, onShowRegister }: LoginScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7]">
      <div className="w-full max-w-md p-8">
        {/* Logo/Title Area */}
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
            <img src={logoImage} alt="EduPath Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white mb-2 text-3xl">EduPath</h1>
          <p className="text-white/90">Plataforma Educativa para Ingeniería de Sistemas</p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <h2 className="text-[#3A4A5B] mb-6 text-center text-2xl">Iniciar Sesión</h2>
          
          {/* Google Login Button */}
          <button
            onClick={onLogin}
            className="w-full bg-white border-2 border-[#4A90E2] text-[#4A90E2] p-4 rounded-xl hover:bg-[#4A90E2] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="text-gray-400">o</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-[#3A4A5B] mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-[#3A4A5B] mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Login Button */}
          <button 
            onClick={onAdminLogin}
            className="w-full bg-[#F5A97F] text-white p-3 rounded-lg hover:bg-[#F39759] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Ingresar</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button className="text-[#4A90E2] hover:text-[#3A7BC8] transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <span className="text-white/90">¿Eres administrador? </span>
          <button
            onClick={onShowRegister}
            className="text-white hover:text-white/80 underline transition-colors"
          >
            Regístrate aquí
          </button>
        </div>
      </div>
    </div>
  );
}
