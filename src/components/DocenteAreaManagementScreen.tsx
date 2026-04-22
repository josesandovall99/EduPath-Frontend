import { useState } from 'react';
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

export function DocenteAreaManagementScreen({ onBack }: DocenteAreaManagementScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<DocenteFlowScreen>('areas');
  const [selectedArea, setSelectedArea] = useState<{ id: number; name: string } | null>(null);
  const [selectedTema, setSelectedTema] = useState<{ id: number; name: string } | null>(null);
  const [selectedSubtema, setSelectedSubtema] = useState<{ id: number; name: string } | null>(null);

  if (currentScreen === 'areas') {
    return (
      <AreasManagementScreen
        onBack={onBack}
        onHome={onBack}
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
        onHome={onBack}
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
        onHome={onBack}
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
        onHome={onBack}
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
        onHome={onBack}
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
        onHome={onBack}
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