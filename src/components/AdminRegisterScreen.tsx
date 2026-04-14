import { ArrowLeft, Mail, User, Building, FileText } from 'lucide-react';


interface AdminRegisterScreenProps {
  onBack: () => void;
  onRegister: () => void;
}

export function AdminRegisterScreen({ onBack, onRegister }: AdminRegisterScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7] py-12">
      <div className="w-full max-w-3xl mx-auto px-8">
        {/* Logo/Title Area */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-3">
            <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="EduPath" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white mb-2 text-3xl">Registro de Administrador</h1>
          <p className="text-white/90">Completa el formulario para solicitar acceso como administrador</p>
        </div>

        {/* Register Form Box */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-[#3A4A5B] text-2xl">Información del Administrador</h2>
          </div>
          
          <div className="space-y-6">
            {/* Google Auth Option */}
            <div className="border-2 border-[#4A90E2] rounded-xl p-6 bg-blue-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-[#4A90E2]" />
                <h3 className="text-[#3A4A5B]">Autenticación con Google</h3>
              </div>
              <button className="w-full bg-white border-2 border-[#4A90E2] text-[#4A90E2] p-4 rounded-xl hover:bg-[#4A90E2] hover:text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>
              <p className="text-gray-500 text-sm mt-3">
                Se usará tu cuenta de Gmail institucional para el acceso
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-gray-400">Información adicional</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-[#3A4A5B] mb-2">
                <User className="w-4 h-4" />
                Nombre completo
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="Nombre y apellidos"
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-[#3A4A5B] mb-2">
                <Mail className="w-4 h-4" />
                Correo electrónico institucional
              </label>
              <input
                type="email"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="correo@universidad.edu.co"
              />
            </div>

            {/* Department/Program */}
            <div>
              <label className="flex items-center gap-2 text-[#3A4A5B] mb-2">
                <Building className="w-4 h-4" />
                Programa académico
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="Ej: Ingeniería de Sistemas"
              />
            </div>

            {/* Justification */}
            <div>
              <label className="flex items-center gap-2 text-[#3A4A5B] mb-2">
                <FileText className="w-4 h-4" />
                Justificación del acceso
              </label>
              <textarea
                className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="Explica brevemente por qué necesitas acceso administrativo..."
              ></textarea>
            </div>

            {/* Terms */}
            <div className="border-2 border-gray-300 bg-gray-50 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 accent-[#4A90E2]" />
                <span className="text-[#3A4A5B] text-sm">
                  Acepto los términos y condiciones de uso de la plataforma y me comprometo 
                  a usar el acceso administrativo de manera responsable y ética.
                </span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 border-2 border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Volver
            </button>
            <button
              onClick={onRegister}
              className="flex-1 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white p-3 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
            >
              Enviar Solicitud
            </button>
          </div>

          <p className="mt-4 text-center text-gray-500 text-sm">
            Tu solicitud será revisada por el equipo administrativo. Recibirás una confirmación 
            en tu correo electrónico.
          </p>
        </div>
      </div>
    </div>
  );
}
