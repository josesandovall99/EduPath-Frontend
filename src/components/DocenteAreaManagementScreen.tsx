import { useEffect, useState } from 'react';
import { AreasManagementScreen } from './AreasManagementScreen';
import { TemasManagementScreen } from './TemasManagementScreen';
import { SubThemeManagementScreen } from './SubThemeManagementScreen';
import { SubtemaSequenceManagementScreen } from './SubtemaSequenceManagementScreen';
import { SequenceManagementScreen } from './SequenceManagementScreen';
import { ContentManagementScreen } from './ContentManagementScreen';

interface DocenteAreaManagementScreenProps {
  onBack: () => void;
}

type DocenteFlowScreen = 'areas' | 'temas' | 'subtemas' | 'subtema-secuencias' | 'contenido-secuencias' | 'contenidos';

const DOCENTE_FLOW_STATE_KEY = 'docenteAreaFlowState';

export function DocenteAreaManagementScreen({ onBack }: DocenteAreaManagementScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<DocenteFlowScreen>('areas');
  const [selectedArea, setSelectedArea] = useState<{ id: number; name: string } | null>(null);
  const [selectedTema, setSelectedTema] = useState<{ id: number; name: string } | null>(null);
  const [selectedSubtema, setSelectedSubtema] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCENTE_FLOW_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        currentScreen?: DocenteFlowScreen;
        selectedArea?: { id: number; name: string } | null;
        selectedTema?: { id: number; name: string } | null;
        selectedSubtema?: { id: number; name: string } | null;
      };
      if (saved.currentScreen) setCurrentScreen(saved.currentScreen);
      if (saved.selectedArea !== undefined) setSelectedArea(saved.selectedArea);
      if (saved.selectedTema !== undefined) setSelectedTema(saved.selectedTema);
      if (saved.selectedSubtema !== undefined) setSelectedSubtema(saved.selectedSubtema);
    } catch {
      // estado corrupto — ignorar
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DOCENTE_FLOW_STATE_KEY, JSON.stringify({
      currentScreen,
      selectedArea,
      selectedTema,
      selectedSubtema,
    }));
  }, [currentScreen, selectedArea, selectedTema, selectedSubtema]);

  const handleBack = () => {
    localStorage.removeItem(DOCENTE_FLOW_STATE_KEY);
    onBack();
  };

  if (currentScreen === 'areas') {
    return (
      <AreasManagementScreen
        onBack={handleBack}
        onHome={handleBack}
        onSelectArea={(areaId, areaName) => {
          setSelectedArea({ id: areaId, name: areaName });
          setSelectedTema(null);
          setSelectedSubtema(null);
          setCurrentScreen('temas');
        }}
        mode="docente"
        readOnly
      />
    );
  }

  if (currentScreen === 'temas' && selectedArea) {
    return (
      <TemasManagementScreen
        areaId={selectedArea.id}
        areaName={selectedArea.name}
        onBack={() => setCurrentScreen('areas')}
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

  if (currentScreen === 'subtemas' && selectedArea && selectedTema) {
    return (
      <SubThemeManagementScreen
        onBack={() => setCurrentScreen('temas')}
        onHome={handleBack}
        initialAreaId={selectedArea.id}
        initialTemaId={selectedTema.id}
        onManageSequences={(areaId, areaName, temaId, temaName) => {
          setSelectedArea({ id: areaId, name: areaName });
          setSelectedTema({ id: temaId, name: temaName });
          setSelectedSubtema(null);
          setCurrentScreen('subtema-secuencias');
        }}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'subtema-secuencias' && selectedArea && selectedTema) {
    return (
      <SubtemaSequenceManagementScreen
        onBack={() => setCurrentScreen('subtemas')}
        onHome={handleBack}
        areaId={selectedArea.id}
        areaName={selectedArea.name}
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

  if (currentScreen === 'contenido-secuencias' && selectedArea && selectedTema && selectedSubtema) {
    return (
      <SequenceManagementScreen
        onBack={() => setCurrentScreen('subtema-secuencias')}
        onHome={handleBack}
        onGoToContentManagement={() => setCurrentScreen('contenidos')}
        areaId={selectedArea.id}
        areaName={selectedArea.name}
        temaId={selectedTema.id}
        temaName={selectedTema.name}
        subtemaId={selectedSubtema.id}
        subtemaNombre={selectedSubtema.name}
        mode="docente"
      />
    );
  }

  if (currentScreen === 'contenidos' && selectedArea && selectedTema && selectedSubtema) {
    return (
      <ContentManagementScreen
        onBack={() => setCurrentScreen('contenido-secuencias')}
        onHome={handleBack}
        scopeMode="flow"
        initialAreaId={selectedArea.id}
        initialAreaName={selectedArea.name}
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