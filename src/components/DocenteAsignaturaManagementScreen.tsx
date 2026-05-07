import { useEffect, useState } from 'react';
import { AsignaturasManagementScreen } from './AsignaturasManagementScreen';
import { TemasManagementScreen } from './TemasManagementScreen';
import { SubThemeManagementScreen } from './SubThemeManagementScreen';
import { SubtemaSequenceManagementScreen } from './SubtemaSequenceManagementScreen';
import { SequenceManagementScreen } from './SequenceManagementScreen';
import { ContentManagementScreen } from './ContentManagementScreen';

interface DocenteAsignaturaManagementScreenProps {
  onBack: () => void;
}

type DocenteFlowScreen = 'asignaturas' | 'temas' | 'subtemas' | 'subtema-secuencias' | 'contenido-secuencias' | 'contenidos';

const DOCENTE_FLOW_STATE_KEY = 'docenteAsignaturaFlowState';

export function DocenteAsignaturaManagementScreen({ onBack }: DocenteAsignaturaManagementScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<DocenteFlowScreen>('asignaturas');
  const [selectedAsignatura, setSelectedAsignatura] = useState<{ id: number; name: string } | null>(null);
  const [selectedTema, setSelectedTema] = useState<{ id: number; name: string } | null>(null);
  const [selectedSubtema, setSelectedSubtema] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCENTE_FLOW_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        currentScreen?: DocenteFlowScreen;
        selectedAsignatura?: { id: number; name: string } | null;
        selectedTema?: { id: number; name: string } | null;
        selectedSubtema?: { id: number; name: string } | null;
      };
      if (saved.currentScreen) setCurrentScreen(saved.currentScreen);
      if (saved.selectedAsignatura !== undefined) setSelectedAsignatura(saved.selectedAsignatura);
      if (saved.selectedTema !== undefined) setSelectedTema(saved.selectedTema);
      if (saved.selectedSubtema !== undefined) setSelectedSubtema(saved.selectedSubtema);
    } catch {
      // estado corrupto — ignorar
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DOCENTE_FLOW_STATE_KEY, JSON.stringify({
      currentScreen,
      selectedAsignatura,
      selectedTema,
      selectedSubtema,
    }));
  }, [currentScreen, selectedAsignatura, selectedTema, selectedSubtema]);

  const handleBack = () => {
    localStorage.removeItem(DOCENTE_FLOW_STATE_KEY);
    onBack();
  };

  if (currentScreen === 'asignaturas') {
    return (
      <AsignaturasManagementScreen
        onBack={handleBack}
        onHome={handleBack}
        onSelectAsignatura={(asignaturaId, asignaturaName) => {
          setSelectedAsignatura({ id: asignaturaId, name: asignaturaName });
          setSelectedTema(null);
          setSelectedSubtema(null);
          setCurrentScreen('temas');
        }}
        mode="docente"
        readOnly
      />
    );
  }

  if (currentScreen === 'temas' && selectedAsignatura) {
    return (
      <TemasManagementScreen
        asignaturaId={selectedAsignatura.id}
        asignaturaName={selectedAsignatura.name}
        onBack={() => setCurrentScreen('asignaturas')}
        onHome={handleBack}
        onSelectTema={(temaId, temaName) => {
          setSelectedTema({ id: temaId, name: temaName });
          setSelectedSubtema(null);
          setCurrentScreen('subtemas');
        }}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'subtemas' && selectedAsignatura && selectedTema) {
    return (
      <SubThemeManagementScreen
        onBack={() => setCurrentScreen('temas')}
        onHome={handleBack}
        initialAsignaturaId={selectedAsignatura.id}
        initialTemaId={selectedTema.id}
        onManageSequences={(asignaturaId, asignaturaName, temaId, temaName) => {
          setSelectedAsignatura({ id: asignaturaId, name: asignaturaName });
          setSelectedTema({ id: temaId, name: temaName });
          setSelectedSubtema(null);
          setCurrentScreen('subtema-secuencias');
        }}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'subtema-secuencias' && selectedAsignatura && selectedTema) {
    return (
      <SubtemaSequenceManagementScreen
        onBack={() => setCurrentScreen('subtemas')}
        onHome={handleBack}
        asignaturaId={selectedAsignatura.id}
        asignaturaName={selectedAsignatura.name}
        temaId={selectedTema.id}
        temaName={selectedTema.name}
        onSelectSubtema={(subtemaId, _temaId, subtemaNombre) => {
          setSelectedSubtema({ id: subtemaId, name: subtemaNombre });
          setCurrentScreen('contenido-secuencias');
        }}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'contenido-secuencias' && selectedAsignatura && selectedTema && selectedSubtema) {
    return (
      <SequenceManagementScreen
        onBack={() => setCurrentScreen('subtema-secuencias')}
        onHome={handleBack}
        onGoToContentManagement={() => setCurrentScreen('contenidos')}
        asignaturaId={selectedAsignatura.id}
        asignaturaName={selectedAsignatura.name}
        temaId={selectedTema.id}
        temaName={selectedTema.name}
        subtemaId={selectedSubtema.id}
        subtemaNombre={selectedSubtema.name}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'contenidos' && selectedAsignatura && selectedTema && selectedSubtema) {
    return (
      <ContentManagementScreen
        onBack={() => setCurrentScreen('contenido-secuencias')}
        onHome={handleBack}
        scopeMode="flow"
        initialAsignaturaId={selectedAsignatura.id}
        initialAsignaturaName={selectedAsignatura.name}
        initialTemaId={selectedTema.id}
        initialTemaName={selectedTema.name}
        initialSubtemaId={selectedSubtema.id}
        initialSubtemaName={selectedSubtema.name}
        mode="docente"
      />
    );
  }

  return null;
}