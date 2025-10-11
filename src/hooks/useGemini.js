// src/hooks/useGemini.js
import { useState } from 'react';

const useGemini = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const generateContent = async (prompt) => {
        setIsLoading(true);
        setError('');
        setData(null);

        try {
            let text;
            if (process.env.NODE_ENV === 'development') {
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error("La clave de API de Gemini (REACT_APP_GEMINI_API_KEY) no se encontró. Asegúrate de que tu archivo .env.local esté configurado y reinicia el servidor.");
                }
                
                // ***** CORRECCIÓN DEFINITIVA: Usamos el modelo más reciente y compatible *****
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
                
                const response = await fetch(apiUrl, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
                });

                if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                     throw new Error(errorData.error?.message || `Error de la API: ${response.statusText}`);
                }
                const result = await response.json();
                
                if (!result.candidates || result.candidates.length === 0) {
                  throw new Error("La API no devolvió una respuesta válida. El contenido puede haber sido bloqueado por filtros de seguridad.");
                }
                text = result.candidates[0].content.parts[0].text;

            } else {
                const apiUrl = '/api/gemini-proxy';
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
                 if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: `El servidor proxy respondió con un error: ${response.statusText}` } }));
                    throw new Error(errorData.error?.message || `Error del proxy: ${response.statusText}`);
                }
                const result = await response.json();
                if (!result.candidates || result.candidates.length === 0) {
                  throw new Error("La API (vía proxy) no devolvió una respuesta válida.");
                }
                text = result.candidates[0].content.parts[0].text;
            }
            
            const cleanText = text.trim();
            setData(cleanText);
            return cleanText;

        } catch (e) {
            console.error("Error detallado al generar contenido con Gemini:", e.message);
            setError(e.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return { data, isLoading, error, generateContent };
};

export default useGemini;