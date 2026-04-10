import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, RefreshCw, Trash2, MessageCircle, FileText, Database, Send } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const CHATBOT_TIMEOUT_MS = 60000;

interface ChatbotManagementScreenProps {
  onBack: () => void;
}

interface Stats {
  isLoaded: boolean;
  documentsCount: number;
  message: string;
}

interface ChatMessage {
  text: string;
  isBot: boolean;
}

export function ChatbotManagementScreen({ onBack }: ChatbotManagementScreenProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Por favor selecciona un archivo PDF');
      return;
    }

    setLoading(true);
    setUploadStatus('Subiendo archivo...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadStatus(`✅ ${data.message}. Páginas: ${data.pagesLoaded}, Chunks: ${data.chunksCreated}`);
        setSelectedFile(null);
        loadStats();
      } else {
        setUploadStatus(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setUploadStatus('❌ Error al subir el archivo');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    setUploadStatus('Recargando PDFs...');

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/reload`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadStatus(`✅ ${data.message}`);
        loadStats();
      } else {
        setUploadStatus(`❌ Error al recargar`);
      }
    } catch (error) {
      setUploadStatus('❌ Error al recargar PDFs');
      console.error('Reload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar toda la base de datos vectorial?')) {
      return;
    }

    setLoading(true);
    setUploadStatus('Limpiando base de datos...');

    try {
      const response = await fetch(`${API_BASE_URL}/chatbot/clear`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadStatus(`✅ ${data.message}`);
        loadStats();
        setMessages([]);
      } else {
        setUploadStatus(`❌ Error al limpiar`);
      }
    } catch (error) {
      setUploadStatus('❌ Error al limpiar la base de datos');
      console.error('Clear error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!inputValue.trim() || isAsking) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInputValue('');
    setIsAsking(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);

      const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: userMessage,
          topK: 3
        })
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('timeout');
        }

        throw new Error('request_failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { text: data.answer, isBot: true }]);
      } else {
        setMessages(prev => [...prev, { 
          text: data.error || 'Error al obtener respuesta del chatbot', 
          isBot: true 
        }]);
      }
    } catch (error) {
      console.error('Ask error:', error);
      setMessages(prev => [...prev, { 
        text: error instanceof Error && error.name === 'AbortError'
          ? 'Timeout: el chatbot tardó más de 1 minuto en responder.'
          : error instanceof Error && error.message === 'timeout'
            ? 'Timeout: el chatbot tardó más de 1 minuto en responder.'
            : 'Error de conexión con el chatbot', 
        isBot: true 
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl text-[#3A4A5B]">Gestión del Chatbot</h1>
              <p className="text-gray-500 text-sm">Administrar documentos y base de conocimiento del chatbot</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Database className="w-8 h-8 text-[#4A90E2]" />
              </div>
              <div>
                <h2 className="text-xl text-[#3A4A5B] mb-1">Estado de la Base de Conocimiento</h2>
                {stats ? (
                  <div>
                    <p className="text-gray-600">{stats.message}</p>
                    <p className="text-2xl text-[#4A90E2] mt-2">{stats.documentsCount} documentos</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Cargando estadísticas...</p>
                )}
              </div>
            </div>
            <button
              onClick={loadStats}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-6 h-6 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl text-[#3A4A5B]">Subir Documento PDF</h2>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileText className="w-12 h-12 text-gray-400" />
                  <span className="text-gray-600">
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un PDF'}
                  </span>
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Subir PDF
              </button>

              {uploadStatus && (
                <div className={`p-3 rounded-lg text-sm ${
                  uploadStatus.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl text-[#3A4A5B]">Acciones Rápidas</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleReload}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Recargar todos los PDFs
              </button>

              <button
                onClick={handleClear}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Limpiar Base de Datos
              </button>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Recargar</strong> reprocesa todos los PDFs de la carpeta del servidor.
                  <br />
                  ⚠️ <strong>Limpiar</strong> elimina toda la base de datos vectorial.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Test Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-white" />
              <h2 className="text-xl text-white">Probar Chatbot</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Messages */}
              <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-20">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Haz una pregunta para probar el chatbot</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.isBot
                            ? 'bg-white border border-gray-200 text-gray-800'
                            : 'bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 text-gray-600 p-3 rounded-lg">
                      Pensando...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                    placeholder="Escribe tu pregunta aquí..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
                    disabled={isAsking}
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={isAsking || !inputValue.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-lg hover:from-[#5B9FED] hover:to-[#4A90E2] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
