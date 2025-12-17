import { useState } from 'react';
import { ArrowLeft, Plus, FileText, PlayCircle, Edit, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

interface ContentManagementScreenProps {
  onBack: () => void;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity';
  linkedTo: 'theme' | 'subtheme';
  linkedName: string;
  subject: string;
  duration?: string;
  status: 'published' | 'draft';
}

export function ContentManagementScreen({ onBack }: ContentManagementScreenProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [contents] = useState<ContentItem[]>([
    {
      id: '1',
      title: 'Introducción a Variables',
      type: 'video',
      linkedTo: 'subtheme',
      linkedName: 'Variables y tipos de datos',
      subject: 'Fundamentos de Programación',
      duration: '15 min',
      status: 'published'
    },
    {
      id: '2',
      title: 'Guía de Operadores',
      type: 'document',
      linkedTo: 'subtheme',
      linkedName: 'Operadores básicos',
      subject: 'Fundamentos de Programación',
      status: 'published'
    },
    {
      id: '3',
      title: 'Ejercicio: Condicionales',
      type: 'activity',
      linkedTo: 'theme',
      linkedName: 'Estructuras de Control',
      subject: 'Fundamentos de Programación',
      duration: '30 min',
      status: 'draft'
    },
    {
      id: '4',
      title: 'Diagramas de Casos de Uso',
      type: 'video',
      linkedTo: 'subtheme',
      linkedName: 'Diagramas UML',
      subject: 'Análisis de Sistemas',
      duration: '25 min',
      status: 'published'
    },
    {
      id: '5',
      title: 'Gestión del Cronograma',
      type: 'document',
      linkedTo: 'theme',
      linkedName: 'Gestión del Tiempo',
      subject: 'Alcance, Tiempo y Costo',
      status: 'published'
    }
  ]);

  const filteredContents = filterType === 'all' 
    ? contents 
    : contents.filter(c => c.type === filterType);

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return PlayCircle;
      case 'document': return FileText;
      case 'activity': return Edit;
    }
  };

  const getTypeColor = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return '#4A90E2';
      case 'document': return '#7ED6A7';
      case 'activity': return '#F5A97F';
    }
  };

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
                <h1 className="text-[#3A4A5B]">Gestión de Contenidos</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7ED6A7] to-[#90E0B7] text-white rounded-lg hover:shadow-lg transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Contenido</span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">{contents.length}</span>
            </div>
            <p className="text-gray-600 text-sm">Total Contenidos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-[#7ED6A7]" />
              </div>
              <span className="text-3xl text-[#7ED6A7]">
                {contents.filter(c => c.status === 'published').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Publicados</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-gray-500" />
              </div>
              <span className="text-3xl text-gray-500">
                {contents.filter(c => c.status === 'draft').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Borradores</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <PlayCircle className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <span className="text-3xl text-[#4A90E2]">
                {contents.filter(c => c.type === 'video').length}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Videos</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-[#4A90E2] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('video')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'video'
                    ? 'bg-[#4A90E2] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setFilterType('document')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'document'
                    ? 'bg-[#7ED6A7] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Documentos
              </button>
              <button
                onClick={() => setFilterType('activity')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filterType === 'activity'
                    ? 'bg-[#F5A97F] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Actividades
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar contenidos..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Título</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Tipo</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Materia</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Vinculado a</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Duración</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Estado</th>
                  <th className="px-6 py-4 text-left text-[#3A4A5B]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContents.map((content) => {
                  const Icon = getTypeIcon(content.type);
                  const color = getTypeColor(content.type);
                  
                  return (
                    <tr key={content.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${color}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <span className="text-[#3A4A5B]">{content.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${color}15`, color }}>
                          {content.type === 'video' ? 'Video' : content.type === 'document' ? 'Documento' : 'Actividad'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.subject}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.linkedName}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{content.duration || '-'}</td>
                      <td className="px-6 py-4">
                        {content.status === 'published' ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            Publicado
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            Borrador
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedContent(content)}
                            className="p-2 text-[#4A90E2] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
        </div>
      </main>
    </div>
  );
}
