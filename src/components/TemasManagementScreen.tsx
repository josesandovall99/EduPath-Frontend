import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Eye, Loader, Search } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { ThemeManagementScreen } from './ThemeManagementScreen';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';

interface Tema {
  id: number;
  nombre: string;
  descripcion?: string;
  area_id: number;
  estado?: boolean;
}

interface TemasManagementScreenProps {
  areaId: number;
  areaName: string;
  onBack: () => void;
  onHome?: () => void;
  onSelectTema: (temaId: number, temaName: string) => void;
}

export function TemasManagementScreen({ areaId, areaName, onBack, onHome, onSelectTema }: TemasManagementScreenProps) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showThemeManager, setShowThemeManager] = useState(false);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTemas();
  }, [areaId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadTemas();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [areaId]);

  const loadTemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/temas/por-area/${areaId}`, {
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
  const activeTemas = temas.filter((tema) => tema.estado !== false).length;

  if (showThemeManager) {
    return (
      <ThemeManagementScreen
        onBack={handleCloseThemeManager}
        initialAreaId={editingTema?.area_id ?? areaId}
        initialEditTema={editingTema ?? undefined}
        backLabel="Volver a Temas"
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
                <h1 className="text-[#3A4A5B]">Temas del área</h1>
                <p className="text-gray-500 text-sm">Área seleccionada: {areaName}</p>
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

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Estructura temática</div>
              <h2 className="app-page-hero__title">Gestión de temas</h2>
              <p className="app-page-hero__description">
                Revisa, edita y abre el detalle de cada tema.
              </p>
            </div>

            <div className="app-hero-metrics">
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Temas</div>
                <div className="app-hero-metric__value">{temas.length}</div>
                <div className="app-hero-metric__help">Registros asociados al área actual.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Activos</div>
                <div className="app-hero-metric__value">{activeTemas}</div>
                <div className="app-hero-metric__help">Disponibles para continuar la estructura.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Resultados</div>
                <div className="app-hero-metric__value">{filteredTemas.length}</div>
                <div className="app-hero-metric__help">Coincidencias según la búsqueda actual.</div>
              </div>
              <div className="app-hero-metric app-hero-metric--wide">
                <div className="app-hero-metric__label">Área</div>
                <div className="app-hero-metric__value app-hero-metric__value--text">{areaName}</div>
                <div className="app-hero-metric__help">Contexto activo de trabajo.</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.75fr)]">
            <div className="app-toolbar-card">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Búsqueda</p>
                  <p className="mt-1 text-sm text-slate-600">Filtra por nombre para localizar un tema dentro del área seleccionada.</p>
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

            <div className="app-soft-card app-soft-card--blue app-context-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vista actual</p>
              <p className="app-context-card__title">{areaName}</p>
              <p className="app-context-card__text">Selecciona un tema para continuar con subtemas y contenidos.</p>
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
            <p className="text-base text-slate-600">No hay temas registrados para esta área.</p>
            <p className="mt-2 text-sm text-slate-500">Crea un tema para continuar con la estructura académica.</p>
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
