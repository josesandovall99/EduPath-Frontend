import { ChatbotManagementScreen } from './ChatbotManagementScreen';

interface DocenteChatbotManagementScreenProps {
  onBack: () => void;
  docenteId?: number;
  docentePersonaId?: number;
  docenteAsignaturaId?: number;
}

export function DocenteChatbotManagementScreen({
  onBack,
  docenteId,
  docentePersonaId,
  docenteAsignaturaId,
}: DocenteChatbotManagementScreenProps) {
  return (
    <ChatbotManagementScreen
      onBack={onBack}
      mode="docente"
      docenteId={docenteId}
      docentePersonaId={docentePersonaId}
      docenteAsignaturaId={docenteAsignaturaId}
    />
  );
}