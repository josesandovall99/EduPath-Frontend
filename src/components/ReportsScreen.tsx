import { useState } from 'react';
import { ArrowLeft, Download, BarChart3, PieChart, TrendingUp, FileText } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ReportsScreenProps {
  onBack: () => void;
}

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [selectedReport, setSelectedReport] = useState('progress');

  const reportTypes = [
    {
      id: 'progress',
      title: 'Progreso por Estudiante',
      description: 'Avance individual de cada estudiante en las materias',
      icon: TrendingUp,
      color: '#4A90E2'
    },
    {
      id: 'subject',
      title: 'Informe por Materia',
      description: 'Estadísticas generales de cada materia',
      icon: BarChart3,
      color: '#7ED6A7'
    },
    {
      id: 'performance',
      title: 'Rendimiento General',
      description: 'Análisis de desempeño del grupo',
      icon: PieChart,
      color: '#F5A97F'
    }
  ];

  const sampleData = [
    { student: 'Juan Pérez', subject: 'Fundamentos de Programación', progress: '85%', grade: '4.2' },
    { student: 'María García', subject: 'Fundamentos de Programación', progress: '72%', grade: '3.8' },
    { student: 'Carlos López', subject: 'Análisis de Sistemas', progress: '90%', grade: '4.5' },
    { student: 'Ana Martínez', subject: 'Alcance, Tiempo y Costo', progress: '65%', grade: '3.5' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Generación de Informes</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F] text-white rounded-lg hover:shadow-lg transition-all duration-300">
              <Download className="w-5 h-5" />
              <span>Exportar Informe</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {/* Report Type Selector */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.id;
            
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-6 rounded-2xl transition-all duration-300 text-left ${
                  isSelected
                    ? 'bg-white shadow-xl transform scale-105'
                    : 'bg-white shadow-md hover:shadow-lg'
                }`}
                style={{
                  borderLeft: isSelected ? `4px solid ${report.color}` : '4px solid transparent'
                }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${report.color}15` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: report.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#3A4A5B] mb-1">{report.title}</h3>
                    <p className="text-gray-600 text-sm">{report.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="text-[#3A4A5B] mb-4">Filtros del Informe</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-[#3A4A5B] mb-2 text-sm">Materia</label>
              <select className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white">
                <option>Todas las materias</option>
                <option>Fundamentos de Programación</option>
                <option>Análisis de Sistemas</option>
                <option>Alcance, Tiempo y Costo</option>
              </select>
            </div>

            <div>
              <label className="block text-[#3A4A5B] mb-2 text-sm">Periodo</label>
              <select className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white">
                <option>Último mes</option>
                <option>Último trimestre</option>
                <option>Último semestre</option>
                <option>Todo el año</option>
              </select>
            </div>

            <div>
              <label className="block text-[#3A4A5B] mb-2 text-sm">Estado</label>
              <select className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white">
                <option>Todos</option>
                <option>Completados</option>
                <option>En progreso</option>
                <option>No iniciados</option>
              </select>
            </div>

            <div>
              <label className="block text-[#3A4A5B] mb-2 text-sm">Formato</label>
              <select className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white">
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
          </div>

          <button className="mt-4 px-6 py-3 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-lg hover:shadow-lg transition-all">
            Aplicar Filtros
          </button>
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl mb-1">Vista Previa del Informe</h3>
                <p className="text-white/90 text-sm">
                  {reportTypes.find(r => r.id === selectedReport)?.title}
                </p>
              </div>
              <FileText className="w-12 h-12 text-white/30" />
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Estudiante</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Materia</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Progreso</th>
                    <th className="px-6 py-4 text-left text-[#3A4A5B]">Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sampleData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[#3A4A5B]">{row.student}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{row.subject}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] rounded-full"
                              style={{ width: row.progress }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{row.progress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          {row.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Volver
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F] text-white rounded-lg hover:shadow-lg transition-all">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <span>Descargar Informe</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
