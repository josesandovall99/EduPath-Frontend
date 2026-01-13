import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowLeft, Users, Download } from 'lucide-react';
// Asegúrate de que la ruta de la imagen sea correcta en tu proyecto
import logoImage from '../assets/logo.png'; 

interface StudentUploadScreenProps {
  onBack: () => void;
}

interface UploadResult {
  total: number;
  success: number;
  errors: Array<{ row: number; error: string }>;
}

export function StudentUploadScreen({ onBack }: StudentUploadScreenProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [serverError, setServerError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setServerError('');
    }
  };

  // Función para descargar una plantilla CSV real con los encabezados que pide tu backend
  const handleDownloadTemplate = () => {
    // Encabezados exactos que espera tu controlador backend
    const headers = [
      "Nombres", 
      "Apellidos", 
      "Email_institucional", 
      "CodigoEstudiantil", 
      "Programa", 
      "Semestre"
    ];
    
    // Ejemplo de datos
    const rowExample = [
      "Juan", 
      "Perez", 
      "juan.perez@ejemplo.com", 
      "1150001", 
      "Ingeniería de Sistemas", 
      "1"
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rowExample.join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_estudiantes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setServerError('');
    
    const formData = new FormData();
    // IMPORTANTE: "archivo" debe coincidir con upload.single("archivo") en tu ruta backend
    formData.append('archivo', file); 

    try {
      // 1. Petición al Backend (Puerto 4000)
      const response = await fetch('http://localhost:4000/estudiante/importar-excel', {
        method: 'POST',
        body: formData, // No necesitas header Content-Type, fetch lo pone automático con FormData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.mensaje || 'Error al subir el archivo');
      }

      // 2. Procesar respuesta exitosa
      // Tu backend devuelve: { message: "...", total: N }
      setResult({
        total: data.total || 0,
        success: data.total || 0,
        errors: [] // Como tu backend usa transacciones, si tiene éxito, no hubo errores
      });

    } catch (err: any) {
      console.error(err);
      // Si falla, mostramos el error general
      setServerError(err.message);
      setResult({
        total: 0,
        success: 0,
        errors: [{ row: 0, error: "Falló la importación completa. Revisa el formato del archivo." }]
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-[#A78BFA] to-[#B79BFA] rounded-xl flex items-center justify-center p-2 shadow-md">
                 {/* Reemplaza con tu componente de imagen o img tag */}
                 <span className="text-white font-bold text-xl">E</span>
              </div>
              <div>
                <h1 className="text-[#3A4A5B] font-bold text-lg">Carga Masiva de Estudiantes</h1>
                <p className="text-gray-500 text-sm">Importar estudiantes desde archivo Excel</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-8 py-8">
        {/* Instructions Card */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-[#4A90E2]" />
            </div>
            <div>
              <h2 className="text-[#3A4A5B] text-xl mb-2 font-semibold">Instrucciones de uso</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#4A90E2] mt-1">•</span>
                  <span>Descarga la plantilla para ver el formato requerido.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4A90E2] mt-1">•</span>
                  <span>Columnas obligatorias: <b>Nombres, Apellidos, Email_institucional, CodigoEstudiantil, Programa, Semestre</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4A90E2] mt-1">•</span>
                  <span>El sistema generará automáticamente las contraseñas y enviará los correos.</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-6 py-3 bg-[#7ED6A7] text-white rounded-lg hover:bg-[#6EC597] transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span>Descargar Plantilla (.csv)</span>
          </button>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-6">
          <h2 className="text-[#3A4A5B] text-xl mb-6 font-semibold">Cargar archivo</h2>
          
          {/* Mensaje de Error del Servidor (si falla todo el proceso) */}
          {serverError && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{serverError}</span>
             </div>
          )}

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              file ? 'border-[#7ED6A7] bg-green-50' : 'border-gray-300 hover:border-[#4A90E2] hover:bg-blue-50'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv" // Agregué CSV por si acaso
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
              <div className="flex flex-col items-center gap-4">
                {file ? (
                  <>
                    <div className="p-4 bg-green-100 rounded-full">
                      <FileSpreadsheet className="w-12 h-12 text-[#7ED6A7]" />
                    </div>
                    <div>
                      <p className="text-[#3A4A5B] mb-1 font-medium">{file.name}</p>
                      <p className="text-gray-500 text-sm">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Evita abrir el selector de archivos de nuevo
                        setFile(null);
                        setResult(null);
                        setServerError('');
                      }}
                      className="text-[#F5A97F] hover:text-[#F39759] text-sm underline font-medium"
                    >
                      Cambiar archivo
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-100 rounded-full">
                      <Upload className="w-12 h-12 text-[#4A90E2]" />
                    </div>
                    <div>
                      <p className="text-[#3A4A5B] mb-1 font-medium">
                        Haz clic para seleccionar tu Excel
                      </p>
                      <p className="text-gray-500 text-sm">
                        Formatos soportados: .xlsx, .xls
                      </p>
                    </div>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Upload Button */}
          {file && !result && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full mt-6 py-4 rounded-lg text-white font-bold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-3 ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#4A90E2] hover:bg-[#3A7BC8]'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando estudiantes...</span>
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  <span>Cargar Estudiantes al Sistema</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl shadow-md p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#3A4A5B] text-xl font-semibold">Resultado de la carga</h2>
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                <p className="text-gray-600 text-sm mb-1 font-medium">Registrados con éxito</p>
                <p className="text-3xl font-bold text-[#7ED6A7]">{result.success}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
                <p className="text-gray-600 text-sm mb-1 font-medium">Errores</p>
                <p className="text-3xl font-bold text-red-500">{result.errors.length > 0 ? "Falló todo" : 0}</p>
              </div>
            </div>

            {/* Success Message */}
            {result.success > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#7ED6A7] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#3A4A5B] mb-1 font-medium">
                    Proceso completado correctamente
                  </p>
                  <p className="text-gray-600 text-sm">
                    Se han enviado los correos de bienvenida con las credenciales a los {result.total} estudiantes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}