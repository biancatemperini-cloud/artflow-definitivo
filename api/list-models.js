// api/list-models.js
// Esta es una función temporal para depuración. Nos ayudará a ver qué modelos están disponibles.

export default async function handler(req, res) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'No se encontró la clave de API de Gemini en las variables de entorno.' });
  }

  // La URL para listar modelos es diferente, usa un método GET
  const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(listModelsUrl);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`La API respondió con el estado: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Filtramos para mostrar solo los modelos que soportan 'generateContent'
    const supportedModels = data.models.filter(model => 
      model.supportedGenerationMethods.includes('generateContent')
    );

    res.status(200).json({ supportedModels });
  } catch (error) {
    console.error('Error al listar los modelos:', error);
    res.status(500).json({ error: 'No se pudo obtener la lista de modelos de la API.' });
  }
}
