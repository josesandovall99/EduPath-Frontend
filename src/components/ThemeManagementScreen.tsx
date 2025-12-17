import { useState } from 'react';
import { ArrowLeft, Code, Database, BarChart3, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ThemeManagementScreenProps {
  onBack: () => void;
}

interface Theme {
  id: string;
  name: string;
  enabled: boolean;
  subthemes: Subtheme[];
}

interface Subtheme {
  id: string;
  name: string;
  enabled: boolean;
}

// Colores por materia
const subjectColors: Record<string, { primary: string; light: string; icon: any }> = {
  'fundamentos': { primary: '#4A90E2', light: '#E3F2FD', icon: Code },
  'analisis': { primary: '#7ED6A7', light: '#E8F5E9', icon: Database },
  'alcance': { primary: '#F5A97F', light: '#FFF3E0', icon: BarChart3 }
};

export function ThemeManagementScreen({ onBack }: ThemeManagementScreenProps) {
  const [selectedSubject, setSelectedSubject] = useState('fundamentos');
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({
    't1': true,
    't2': true
  });
  
  const [subjects] = useState([
    { id: 'fundamentos', name: 'Fundamentos de Programación' },
    { id: 'analisis', name: 'Análisis de Sistemas' },
    { id: 'alcance', name: 'Alcance, Tiempo y Costo' }
  ]);

  const [themes, setThemes] = useState<Record<string, Theme[]>>({
    fundamentos: [
      {
        id: 't1',
        name: 'Introducción a la Programación',
        enabled: true,
        subthemes: [
          { id: 'st1', name: 'Variables y tipos de datos', enabled: true },
          { id: 'st2', name: 'Operadores básicos', enabled: true },
          { id: 'st3', name: 'Entrada y salida de datos', enabled: false }
        ]
      },
      {
        id: 't2',
        name: 'Estructuras de Control',
        enabled: true,
        subthemes: [
          { id: 'st4', name: 'Condicionales', enabled: true },
          { id: 'st5', name: 'Ciclos', enabled: true }
        ]
      },
      {
        id: 't3',
        name: 'Funciones y Procedimientos',
        enabled: false,
        subthemes: [
          { id: 'st6', name: 'Definición de funciones', enabled: false },
          { id: 'st7', name: 'Parámetros y retorno', enabled: false }
        ]
      }
    ],
    analisis: [
      {
        id: 't4',
        name: 'Fundamentos de Análisis',
        enabled: true,
        subthemes: [
          { id: 'st8', name: 'Requisitos funcionales', enabled: true },
          { id: 'st9', name: 'Requisitos no funcionales', enabled: true }
        ]
      },
      {
        id: 't5',
        name: 'Diagramas UML',
        enabled: true,
        subthemes: [
          { id: 'st10', name: 'Diagramas de casos de uso', enabled: true },
          { id: 'st11', name: 'Diagramas de clases', enabled: true },
          { id: 'st12', name: 'Diagramas de secuencia', enabled: false }
        ]
      }
    ],
    alcance: [
      {
        id: 't6',
        name: 'Gestión del Alcance',
        enabled: true,
        subthemes: [
          { id: 'st13', name: 'Definición del alcance', enabled: true },
          { id: 'st14', name: 'WBS', enabled: true }
        ]
      },
      {
        id: 't7',
        name: 'Gestión del Tiempo',
        enabled: true,
        subthemes: [
          { id: 'st15', name: 'Cronograma del proyecto', enabled: true },
          { id: 'st16', name: 'Ruta crítica', enabled: false }
        ]
      }
    ]
  });

  const toggleTheme = (themeId: string) => {
    setThemes(prev => ({
      ...prev,
      [selectedSubject]: prev[selectedSubject].map(t =>
        t.id === themeId ? { ...t, enabled: !t.enabled } : t
      )
    }));
  };

  const toggleSubtheme = (themeId: string, subthemeId: string) => {
    setThemes(prev => ({
      ...prev,
      [selectedSubject]: prev[selectedSubject].map(t =>
        t.id === themeId
          ? {
              ...t,
              subthemes: t.subthemes.map(st =>
                st.id === subthemeId ? { ...st, enabled: !st.enabled } : st
              )
            }
          : t
      )
    }));
  };

  const toggleExpand = (themeId: string) => {
    setExpandedThemes(prev => ({ ...prev, [themeId]: !prev[themeId] }));
  };

  const currentColor = subjectColors[selectedSubject];
  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const SubjectIcon = currentColor.icon;

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
                <h1 className="text-[#3A4A5B]">Gestión de Temas</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
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

        {/* Subject Selector */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h3 className="text-[#3A4A5B] mb-4">Seleccionar Materia</h3>
          <div className="grid grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const Icon = subjectColors[subject.id].icon;
              const color = subjectColors[subject.id].primary;
              const isSelected = selectedSubject === subject.id;
              
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-current shadow-lg transform scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  style={{
                    borderColor: isSelected ? color : undefined,
                    backgroundColor: isSelected ? `${color}10` : 'white'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <span className="text-[#3A4A5B] text-sm">{subject.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme List */}
        <div 
          className="rounded-2xl p-8 mb-6 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${currentColor.primary} 0%, ${currentColor.primary}dd 100%)` }}
        >
          <div className="flex items-center gap-4 mb-2">
            <SubjectIcon className="w-8 h-8" />
            <h2 className="text-2xl">{currentSubject?.name}</h2>
          </div>
          <p className="text-white/90">
            Administra qué temas y subtemas están disponibles para los estudiantes
          </p>
        </div>

        <div className="space-y-4">
          {themes[selectedSubject]?.map((theme) => (
            <div
              key={theme.id}
              className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              {/* Theme Header */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => toggleExpand(theme.id)}
                      className="text-gray-400 hover:text-[#3A4A5B] transition-colors"
                    >
                      {expandedThemes[theme.id] ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <h4 className="text-[#3A4A5B] text-lg">{theme.name}</h4>
                      <p className="text-gray-500 text-sm">
                        {theme.subthemes.length} subtemas • {theme.subthemes.filter(st => st.enabled).length} habilitados
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleTheme(theme.id)}
                    className="flex items-center gap-2 group"
                  >
                    {theme.enabled ? (
                      <>
                        <span className="text-sm text-[#7ED6A7]">Habilitado</span>
                        <ToggleRight 
                          className="w-12 h-12 transition-colors" 
                          style={{ color: currentColor.primary }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-400">Deshabilitado</span>
                        <ToggleLeft className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subthemes */}
              {expandedThemes[theme.id] && (
                <div 
                  className="border-t px-6 pb-6 pt-4"
                  style={{ borderColor: `${currentColor.primary}20` }}
                >
                  <div className="space-y-2">
                    {theme.subthemes.map((subtheme) => (
                      <div
                        key={subtheme.id}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentColor.primary }}
                          ></div>
                          <span className="text-[#3A4A5B]">{subtheme.name}</span>
                        </div>
                        
                        <button
                          onClick={() => toggleSubtheme(theme.id, subtheme.id)}
                          className="flex items-center gap-2"
                          disabled={!theme.enabled}
                        >
                          {subtheme.enabled && theme.enabled ? (
                            <>
                              <span className="text-sm text-[#7ED6A7]">Habilitado</span>
                              <ToggleRight 
                                className="w-10 h-10 transition-colors" 
                                style={{ color: currentColor.primary }}
                              />
                            </>
                          ) : (
                            <>
                              <span className="text-sm text-gray-400">Deshabilitado</span>
                              <ToggleLeft className="w-10 h-10 text-gray-400 hover:text-gray-500 transition-colors" />
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Cancelar
          </button>
          <button
            className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all"
            style={{ backgroundColor: currentColor.primary }}
          >
            Guardar Cambios
          </button>
        </div>
      </main>
    </div>
  );
}
