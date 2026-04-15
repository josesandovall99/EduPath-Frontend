import { useState, type FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

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
      setError(err?.message || String(err) || 'Ocurrio un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7] p-8">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4">
            <Mail className="h-8 w-8 text-[#4A90E2]" />
          </div>
          <h1 className="text-white mb-2 text-3xl font-bold">Recuperar contrasena</h1>
          <p className="text-white/90">Te enviaremos un enlace para restablecer tu acceso.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-medium">Revisa tu correo</span>
                </div>
                <p className="text-sm text-gray-600">
                  Si el correo existe, te enviamos un enlace para restablecer la contrasena.
                </p>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full bg-[#F5A97F] text-white p-3 rounded-lg hover:bg-[#F39759] transition-all"
                >
                  Volver al inicio de sesion
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 pl-11 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-[#F5A97F] text-white p-3 rounded-lg hover:bg-[#F39759] transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 text-[#4A90E2] hover:text-[#3A7BC8] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesion
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
