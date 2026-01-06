import { useState } from 'react';
import axios from 'axios';

export function useCompiler() {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  const runCode = async (code: string, languageId: number, studentId: number, exerciseId: number) => {
    setIsLoading(true);
    setOutput('Conectando con el compilador (Puerto 4000)...');
    
    // URL actualizada al puerto 4000 del Backend
    const BASE_URL = 'http://localhost:4000/respuestasEstudianteEjercicio';
    
    try {
      // 1. Envío de código
      const response = await axios.post(BASE_URL, {
        respuesta: code,
        estudiante_id: studentId,
        ejercicio_id: exerciseId,
        lenguaje_id: languageId,
      });

      const token = response.data.token;
      setOutput('Procesando ejecución...');

      // 2. Consulta de estado (Polling)
      const checkStatus = async () => {
        try {
          const res = await axios.get(`${BASE_URL}/resultado/${token}`);
          
          if (res.data.status?.id <= 2) {
            setTimeout(checkStatus, 2000);
          } else {
            const finalOutput = 
              res.data.stdout || 
              res.data.stderr || 
              res.data.compile_output || 
              'Ejecución finalizada.';
              
            setOutput(finalOutput);
            setResultData(res.data);
            setIsLoading(false);
          }
        } catch (err) {
          setOutput('Error al recuperar resultado del puerto 4000.');
          setIsLoading(false);
        }
      };

      await checkStatus();

    } catch (error: any) {
      console.error("Fallo de conexión:", error);
      setOutput("Error: Asegúrate de que el Backend esté corriendo en el puerto 4000.");
      setIsLoading(false);
    }
  };

  return { runCode, output, isLoading, resultData, setOutput };
}