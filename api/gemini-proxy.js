// api/gemini-proxy.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'El cuerpo de la petición debe contener un "prompt".' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("No se encontró la clave de API de Gemini en las variables de entorno.");
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  // ***** CORRECCIÓN DEFINITIVA: Usamos el modelo más reciente y compatible *****
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Error de la API de Gemini:", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(geminiResponse.status).json({ error: `La API respondió con un error: ${errorJson.error?.message || errorText}` });
      } catch {
        return res.status(geminiResponse.status).json({ error: `La API respondió con el estado: ${geminiResponse.status} - ${errorText}` });
      }
    }

    const data = await geminiResponse.json();
    
    res.status(200).json(data);

  } catch (error) {
    console.error('Error conectando con el servicio de IA:', error);
    res.status(500).json({ error: 'No se pudo conectar con el servicio de IA.' });
  }
}