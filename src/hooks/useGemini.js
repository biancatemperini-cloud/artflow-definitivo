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
            // La lógica es la misma que ya tienes, pero centralizada aquí
            if (process.env.NODE_ENV === 'development') {
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                if (!apiKey) throw new Error("La clave de API de Gemini no se encontró.");
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
                if (!response.ok) throw new Error(`Error de la API: ${response.statusText}`);
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            } else {
                const apiUrl = '/api/gemini-proxy';
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
                if (!response.ok) throw new Error(`Error del proxy: ${response.statusText}`);
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            }
            
            setData(text.trim());
            return text.trim(); // Devuelve el texto para uso inmediato si es necesario

        } catch (e) {
            console.error("Error al generar contenido con Gemini:", e.message);
            setError("No se pudo conectar con el servicio de IA. Inténtalo de nuevo más tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    return { data, isLoading, error, generateContent };
};

export default useGemini;