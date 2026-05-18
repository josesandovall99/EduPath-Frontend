import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, ArrowLeft, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../utils/constants';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

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

  const handleDownloadTemplate = () => {
    const headers = ["Nombres", "Apellidos", "Email_institucional", "CodigoEstudiantil", "Programa", "PeriodoAcademico"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!autofilter'] = { ref: `A1:F1` };
    ws['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 12 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estudiantes");
    XLSX.writeFile(wb, "plantilla_estudiantes.xlsx");
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
      const response = await fetch(`${API_BASE_URL}/estudiante/importar-excel`, {
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
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onBack} title="Volver">
                <div className="app-brand-icon">
                  <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
                </div>
              </button>
              <div>
                <h1 className="text-[#3A4A5B]">Carga masiva de estudiantes</h1>
                <p className="text-gray-500 text-sm">Importar estudiantes desde archivo Excel</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>Carga masiva de estudiantes</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Descarga la plantilla, prepara el archivo y sube el lote completo.</p>
          </div>
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-white font-bold text-sm px-5 rounded-xl transition-all hover:opacity-90 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a56db, #142d61)', height: 40, whiteSpace: 'nowrap' }}>
            <Download className="w-4 h-4" />
            Descargar plantilla (.xlsx)
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Instrucciones */}
          <div className="app-table-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>Instrucciones de uso</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Descarga la plantilla para ver el formato requerido.',
                'Columnas obligatorias: Nombres, Apellidos, Email_institucional, CodigoEstudiantil, Programa, PeriodoAcademico.',
                'El sistema generará las contraseñas automáticamente y enviará las credenciales por correo.',
              ].map((t, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a56db', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Zona de carga */}
          <div className="app-table-card" style={{ padding: '22px 24px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>Cargar archivo</p>

            {serverError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Drop zone */}
            <div style={{
              border: `2px dashed ${file ? '#1a56db' : '#bfd3f5'}`,
              borderRadius: 12, padding: '32px 16px', textAlign: 'center', cursor: 'pointer',
              background: file ? '#EFF6FF' : '#f8fafc',
              transition: 'all 0.2s',
            }}>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="flex flex-col items-center gap-3">
                  {file ? (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileSpreadsheet style={{ width: 22, height: 22, color: '#1a56db' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{file.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setFile(null); setResult(null); setServerError(''); }}
                        style={{ fontSize: 12, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Cambiar archivo
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload style={{ width: 22, height: 22, color: '#1a56db' }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>Selecciona el archivo Excel</p>
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Formatos: .xlsx, .xls</p>
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Botón cargar */}
            {file && !result && (
              <button onClick={handleUpload} disabled={uploading}
                className="flex items-center justify-center gap-2 w-full text-white font-bold text-sm rounded-xl transition-all hover:opacity-90 mt-4"
                style={{ background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #1a56db, #142d61)', height: 42, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Procesando…</span></>
                ) : (
                  <><Users className="w-4 h-4" /><span>Cargar estudiantes al sistema</span></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className="app-table-card mt-6" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Resultado de la carga</p>
              <button onClick={() => { setFile(null); setResult(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="app-metric-grid mb-4">
              <article className="app-metric-card">
                <div className="app-metric-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><CheckCircle className="w-5 h-5" /></div>
                <div><div className="app-metric-value">{result.success}</div><div className="app-metric-label">Registrados con éxito</div></div>
              </article>
              <article className="app-metric-card">
                <div className="app-metric-icon" style={{ background: '#fef9c3', color: '#a16207' }}><AlertCircle className="w-5 h-5" /></div>
                <div><div className="app-metric-value">{result.errors.length > 0 ? 'Con errores' : 0}</div><div className="app-metric-label">Errores</div></div>
              </article>
            </div>
            {result.success > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: 8 }}>
                <CheckCircle style={{ width: 16, height: 16, color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>Proceso completado</p>
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Se enviaron los correos de bienvenida con credenciales a {result.total} estudiantes.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}