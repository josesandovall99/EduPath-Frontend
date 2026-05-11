import { useState, useEffect } from 'react';

import { ArrowLeft, Edit2, Eye, Loader, Search } from 'lucide-react';

const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

import { ThemeManagementScreen } from './ThemeManagementScreen';

import { AdminFlowGuide } from './ui/AdminFlowGuide';

import { buildAuthHeaders } from '../utils/authHeaders';

import { API_BASE_URL } from '../utils/constants';



interface Tema {

  id: number;

  nombre: string;

  descripcion?: string;

  asignatura_id: number;

  estado?: boolean;

}



interface TemasManagementScreenProps {
  /** Navega directamente al nivel indicado desde el breadcrumb (0=panel, 1=asignaturas, 2=asignatura). */
  onNavigateToBreadcrumb?: (index: number) => void;

  asignaturaId: number;

  asignaturaName: string;

  onBack: () => void;

  onHome?: () => void;

  onSelectTema: (temaId: number, temaName: string) => void;

  mode?: 'admin' | 'docente';

}



export function TemasManagementScreen({ asignaturaId, asignaturaName, onBack, onHome, onSelectTema,
  onNavigateToBreadcrumb, mode = 'admin' }: TemasManagementScreenProps) {

  const [temas, setTemas] = useState<Tema[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showThemeManager, setShowThemeManager] = useState(false);

  const [editingTema, setEditingTema] = useState<Tema | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const isDocenteMode = mode === 'docente';



  useEffect(() => {

    loadTemas();

  }, [asignaturaId]);



  useEffect(() => {

    const intervalId = window.setInterval(() => {

      loadTemas();

    }, 120000); // 2 minutos



    return () => {

      window.clearInterval(intervalId);

    };

  }, [asignaturaId]);



  const loadTemas = async () => {

    setLoading(true);

    setError(null);

    try {

      const response = await fetch(`${API_BASE_URL}/temas/por-asignatura/${asignaturaId}`, {

        headers: buildAuthHeaders({ Accept: 'application/json' }),

        credentials: 'include'

      });

      if (!response.ok) throw new Error('Error cargando temas');

      const data = await response.json();

      setTemas(data);

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Error al cargar temas');

      setTemas([]);

    } finally {

      setLoading(false);

    }

  };



  const handleOpenThemeManager = async (tema?: Tema) => {

    if (!tema) {

      setEditingTema(null);

      setShowThemeManager(true);

      return;

    }



    let temaToEdit = tema;

    if (tema.estado === undefined) {

      try {

        const response = await fetch(`${API_BASE_URL}/temas/${tema.id}`, {

          headers: buildAuthHeaders({ Accept: 'application/json' }),

          credentials: 'include'

        });

        if (response.ok) {

          temaToEdit = await response.json();

        }

      } catch (err) {

        console.error('Error cargando tema para editar:', err);

      }

    }



    setEditingTema(temaToEdit);

    setShowThemeManager(true);

  };



  const handleCloseThemeManager = () => {

    setShowThemeManager(false);

    setEditingTema(null);

  };



  const filteredTemas = temas.filter((tema) =>

    tema.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())

  );



  if (showThemeManager) {

    return (

      <ThemeManagementScreen

        onBack={handleCloseThemeManager}

        initialAsignaturaId={editingTema?.asignatura_id ?? asignaturaId}

        initialEditTema={editingTema ?? undefined}

        backLabel="Volver a Temas"

        mode={mode}

        lockAsignaturaselection={isDocenteMode}

      />

    );

  }



  return (

    <div className="app-shell">

      <header className="app-header">

        <div className="app-main py-4">

          <div className="app-page-header">

            <div className="app-brand-block">

              <button

                type="button"

                onClick={onHome}

                className="app-brand-icon"

                title="Ir al panel principal"

              >

                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />

              </button>

              <div>

                <h1 className="text-[#3A4A5B]">Temas del asignatura</h1>

                <p className="text-gray-500 text-sm">{isDocenteMode ? `Asignatura asignada: ${asignaturaName}` : `Asignatura seleccionada: ${asignaturaName}`}</p>

              </div>

            </div>

          </div>

        </div>

      </header>



      <main className="app-main">

        <button

          onClick={onBack}

          className="app-back-button mb-6"

        >

          <ArrowLeft className="w-4 h-4" />

          <span>Volver</span>

        </button>



        <AdminFlowGuide

          title="Gestión de temas"

          description="Selección y administración temática dentro del asignatura registrada."

          breadcrumbs={[

            { label: isDocenteMode ? 'Panel docente' : 'Panel admin', onClick: onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(0) : undefined },

            { label: 'Asignaturas', onClick: onNavigateToBreadcrumb ? () => onNavigateToBreadcrumb(1) : undefined },

            { label: asignaturaName },

            { label: 'Temas', current: true }

          ]}

          steps={[

            { label: 'Asignaturas', helper: 'Asignatura registrada para la operación actual.', status: 'complete' },

            { label: 'Temas', helper: 'Selección del tema correspondiente.', status: 'current' },

            { label: 'Subtemas', helper: 'Detalle de subtemas del tema.', status: 'upcoming' },

            { label: 'Secuencias', helper: 'Orden de la secuencia académica.', status: 'upcoming' }

          ]}

          asideTitle="Siguiente paso"

          asideDescription="La selección de un tema habilita la gestión de subtemas dentro del mismo flujo."

        />



        <section className="app-page-hero mb-6">

          <div className="app-page-hero__content">

            <div className="app-page-hero__copy">

              <div className="app-page-hero__eyebrow">Estructura temática</div>

              <h2 className="app-page-hero__title">Gestión de temas</h2>

              <p className="app-page-hero__description">

                Consulta, edición y acceso al detalle de cada tema.

              </p>

            </div>

          </div>



          <div className="mt-6">

            <div className="app-toolbar-card">

              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda</p>

                  <p className="mt-1 text-sm text-slate-600">Filtra por nombre para localizar un tema dentro del asignatura seleccionada.</p>

                </div>

                <button onClick={() => handleOpenThemeManager()} className="app-btn app-primary-btn">

                  <Edit2 className="w-4 h-4" />

                  <span>Gestionar temas</span>

                </button>

              </div>

              <div className="app-toolbar-card__search app-search-field">

                <Search className="app-search-field__icon" />

                <input

                  type="text"

                  value={searchTerm}

                  onChange={(event) => setSearchTerm(event.target.value)}

                  placeholder="Buscar tema"

                  className="app-form-input"

                />

              </div>

            </div>

          </div>

        </section>



        {loading ? (

          <div className="app-empty-panel py-12">

            <div className="flex flex-col items-center gap-4">

              <Loader className="w-8 h-8 animate-spin text-[#4A90E2]" />

              <p className="text-gray-600">Cargando temas...</p>

            </div>

          </div>

        ) : error ? (

          <div className="app-alert app-alert--error mb-6">

            <p>{error}</p>

            <button

              onClick={loadTemas}

              className="app-btn app-primary-btn"

            >

              Reintentar

            </button>

          </div>

        ) : temas.length === 0 ? (

          <div className="app-empty-panel py-12">

            <p className="text-base text-slate-600">No hay temas registrados para esta asignatura.</p>

            <p className="mt-2 text-sm text-slate-500">El registro de un tema habilita la estructura académica del asignatura.</p>

          </div>

        ) : filteredTemas.length === 0 ? (

          <div className="app-empty-panel py-12">

            <p className="text-base text-slate-600">No hay coincidencias para la búsqueda actual.</p>

            <p className="mt-2 text-sm text-slate-500">Ajusta el texto ingresado para volver a listar temas.</p>

          </div>

        ) : (

          <div className="app-card-grid">

            {filteredTemas.map((tema) => {

              return (

                <div

                  key={tema.id}

                  onClick={() => onSelectTema(tema.id, tema.nombre)}

                  className="app-list-card cursor-pointer"

                  role="button"

                  tabIndex={0}

                  onKeyDown={(event) => {

                    if (event.key === 'Enter' || event.key === ' ') {

                      event.preventDefault();

                      onSelectTema(tema.id, tema.nombre);

                    }

                  }}

                >

                  <div className="app-list-card__head">

                    <div className="flex-1 min-w-0">

                      <div className="mb-3 flex items-center gap-2">

                        <span className={`app-badge ${tema.estado !== false ? 'app-badge--blue' : 'bg-amber-100 text-amber-700'}`}>

                          {tema.estado !== false ? 'Activo' : 'Inhabilitado'}

                        </span>

                      </div>

                      <h3 className="app-list-card__title">{tema.nombre}</h3>

                      {tema.descripcion && (

                        <p className="app-list-card__description mt-2">{tema.descripcion}</p>

                      )}

                      {!tema.descripcion && <p className="app-list-card__description mt-2">Sin descripción registrada.</p>}

                    </div>

                    <button

                      onClick={(event) => {

                        event.stopPropagation();

                        handleOpenThemeManager(tema);

                      }}

                      className="app-btn app-btn-ghost app-btn-sm"

                      title="Editar tema"

                      aria-label="Editar tema"

                    >

                      <Edit2 className="w-4 h-4" />

                      <span>Editar</span>

                    </button>

                  </div>

                  <div className="app-list-card__footer">

                    <span className="app-list-card__meta">Abrir detalle del tema</span>

                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#4A90E2]">

                      <Eye className="w-4 h-4" />

                      <span>Ver subtemas</span>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </main>



    </div>

  );

}

