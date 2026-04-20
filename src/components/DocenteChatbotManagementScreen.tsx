import { ChatbotManagementScreen } from './ChatbotManagementScreen';

interface DocenteChatbotManagementScreenProps {
  onBack: () => void;
  docenteId?: number;
  docentePersonaId?: number;
  docenteAreaId?: number;
}

export function DocenteChatbotManagementScreen({
  onBack,
  docenteId,
  docentePersonaId,
  docenteAreaId,
}: DocenteChatbotManagementScreenProps) {
  return (
    <ChatbotManagementScreen
      onBack={onBack}
      mode="docente"
      docenteId={docenteId}
      docentePersonaId={docentePersonaId}
      docenteAreaId={docenteAreaId}
    />
  );
}