// api/gemini-proxy.js

// Este es nuestro intermediario seguro para la API de Vertex AI.
// Recibirá el prompt de nuestra app y lo reenviará de forma segura.

export default async function handler(req, res) {
  // 1. Solo permitimos peticiones POST por seguridad
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  // 2. Obtenemos el prompt que envía la aplicación
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'El cuerpo de la petición debe contener un "prompt".' });
  }

  // 3. Obtenemos de forma SEGURA la clave de las variables de entorno de Vercel
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("No se encontró la clave de API de Gemini en las variables de entorno.");
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  // 4. Preparamos la petición a la API de Vertex AI (Google Cloud)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  // 5. Llamamos de forma segura a la API desde nuestro servidor
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
      console.error("Error de la API de Vertex AI:", errorText);
      throw new Error(`La API respondió con el estado: ${geminiResponse.status}`);
    }

    const data = await geminiResponse.json();
    
    // Enviamos la respuesta exitosa de vuelta a nuestra aplicación
    res.status(200).json(data);

  } catch (error) {
    console.error('Error conectando con el servicio de IA:', error);
    res.status(500).json({ error: 'No se pudo conectar con el servicio de IA.' });
  }
}

