/*
  Nombre de archivo: /api/gemini-proxy.js
  Esta es una función serverless que actúa como un proxy seguro a la API de Gemini.
*/

export default async function handler(req, res) {
    // 1. Solo aceptar solicitudes POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // 2. Extraer el prompt del cuerpo de la solicitud
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'El cuerpo de la solicitud debe contener un "prompt".' });
    }

    // 3. Obtener la clave secreta desde las variables de entorno del servidor
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY no está configurada en el servidor.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    // 4. Preparar y realizar la llamada a la API de Gemini
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    try {
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Error desde la API de Gemini:", data);
            return res.status(geminiResponse.status).json({ error: data.error?.message || 'Error en la API de Gemini' });
        }
        
        // 5. Devolver la respuesta exitosa de Gemini al cliente
        res.status(200).json(data);

    } catch (error) {
        console.error('Error en el proxy de Gemini:', error);
        res.status(500).json({ error: 'No se pudo conectar con el servicio de IA.' });
    }
}

