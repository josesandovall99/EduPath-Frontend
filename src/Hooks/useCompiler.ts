import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

export function useCompiler() {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const runCode = async (code: string, languageId: number, studentId: number, exerciseId: number) => {
    setIsLoading(true);
    setOutput('Ejecutando código...');
    
    const payload = {
      estudiante_id: studentId,
      ejercicio_id: exerciseId,
      lenguaje_id: languageId,
      codigo: code,
    };
    
    console.log('Enviando al backend:', payload);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/evaluaciones/compilador`, payload);

      console.log('Respuesta del backend:', response.data);
      const resultado = response.data;
      
      let finalOutput = '';
      if (resultado.esCorrecta) {
        finalOutput = `EJERCICIO APROBADO!\n\nSalida del programa:\n${resultado.stdout || resultado.obtenido || ''}\n\nPuntos obtenidos: ${resultado.puntosObtenidos || 0}`;
      } else {
        finalOutput = `Ejercicio no aprobado\n\nSalida obtenida:\n${resultado.stdout || resultado.obtenido || ''}\n\nSalida esperada:\n${resultado.esperado || ''}\n\nSe requiere ajuste del código y nuevo envío.`;
      }
      
      setOutput(finalOutput);
      setResultData(resultado);
      setIsLoading(false);

    } catch (error: any) {
      console.error("Error completo:", error);
      console.error("Respuesta del servidor:", error.response?.data);
      
      // Si el backend responde con 400 y tiene información del ejercicio
      if (error.response?.status === 400 && error.response?.data) {
        const resultado = error.response.data;
        let finalOutput = '';
        
        if (resultado.esCorrecta === false) {
          finalOutput = `Ejercicio no aprobado\n\nSalida obtenida:\n${resultado.stdout || resultado.obtenido || ''}\n\nSalida esperada:\n${resultado.esperado || ''}\n\nSe requiere ajuste del código y nuevo envío.`;
        } else {
          const errorMsg = resultado.error || resultado.message || "Error desconocido";
          finalOutput = `Error: ${errorMsg}`;
        }
        
        setOutput(finalOutput);
        setResultData(resultado);
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Error desconocido";
        setOutput(`Error: ${errorMsg}`);
      }
      
      setIsLoading(false);
    }
  };

  return { runCode, output, isLoading, resultData, setOutput };
}