import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';

const ProjectForm = ({ onSubmit, project, prefill, categories, templates }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(categories[0]?.name || ''); 
    const [generatedTasks, setGeneratedTasks] = useState([]); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    
    useEffect(() => { 
        if (project) { 
            setName(project.name); 
            setDescription(project.description || ''); 
            setCategory(project.category || categories[0]?.name);
            setSelectedTemplate('');
        } else if (prefill) {
            setName(prefill.name);
            setDescription('');
            setCategory(categories[0]?.name);
        }
        else { 
            setName(''); 
            setDescription(''); 
            setCategory(categories[0]?.name);
            setSelectedTemplate('');
        } 
        setGeneratedTasks([]); 
    }, [project, prefill, categories]);

    useEffect(() => {
        if (selectedTemplate) {
            const template = templates.find(t => t.id === selectedTemplate);
            if (template && template.category) {
                setCategory(template.category);
            }
        }
    }, [selectedTemplate, templates]);
    
    const handleGenerateTasks = async () => {
        if (!name.trim()) { 
            setError("Por favor, introduce un nombre para el proyecto."); 
            return; 
        }
        setError(''); 
        setIsGenerating(true); 
        setGeneratedTasks([]);
        const prompt = `Eres un asistente experto en gestión de proyectos para artistas. Un usuario está creando un proyecto. Basado en el título y la descripción, desglósalo en una lista de 5 a 10 tareas procesables para un flujo de trabajo creativo. Devuelve un array JSON de strings. Título: "${name}", Descripción: "${description}". Responde únicamente con el array JSON.`;
        
        try {
            let text;
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
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt }) });
                if (!response.ok) throw new Error(`Error del proxy: ${response.statusText}`);
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            }
            
            const jsonString = text.replace(/```json|```/g, '').trim();
            const tasksArray = JSON.parse(jsonString);
            
            setGeneratedTasks(tasksArray.map((taskText, index) => ({
                id: index,
                text: taskText,
                isSelected: true
            })));

        } catch (e) { 
            console.error("Error detallado al generar tareas:", e.message); 
            setError("No se pudieron generar las tareas. Inténtalo de nuevo."); 
        } finally { 
            setIsGenerating(false); 
        }
    };
    
    const handleTaskSelectionChange = (id) => {
        setGeneratedTasks(generatedTasks.map(task => 
            task.id === id ? { ...task, isSelected: !task.isSelected } : task
        ));
    };

    const handleTaskTextChange = (id, newText) => {
        setGeneratedTasks(generatedTasks.map(task =>
            task.id === id ? { ...task, text: newText } : task
        ));
    };

    const handleRemoveTask = (id) => {
        setGeneratedTasks(generatedTasks.filter(task => task.id !== id));
    };

    const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!name.trim()) return; 
        
        const finalTasks = generatedTasks
            .filter(task => task.isSelected)
            .map(task => task.text);

        onSubmit({ name, description, category }, project ? [] : finalTasks, selectedTemplate); 
        setName(''); 
        setDescription(''); 
        setGeneratedTasks([]); 
        setCategory(categories[0]?.name || '');
        setSelectedTemplate('');
    };

    const isAiDisabled = isGenerating || !name || !!selectedTemplate;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!project && templates && templates.length > 0 && (
                 <div>
                    <label className="block text-sm font-medium">Usar Plantilla (Opcional)</label>
                    <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500">
                        <option value="">Ninguna (crear desde cero con IA)</option>
                        {templates.map(temp => (
                            <option key={temp.id} value={temp.id}>{temp.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium">Nombre del Proyecto</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: Serie de retratos" required />
            </div>
            
            <div>
                <label className="block text-sm font-medium">Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" disabled={!!selectedTemplate}>
                    {categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium">Descripción (Opcional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Metas para este proyecto." />
            </div>
            
            {!project && !prefill && (
                <div className="space-y-4 pt-2">
                    <div className="relative">
                        <button type="button" onClick={handleGenerateTasks} disabled={isAiDisabled} className="w-full inline-flex justify-center items-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            <Sparkles className="mr-2 h-5 w-5" />{isGenerating ? 'Generando...' : '✨ Desglosar Proyecto con IA'}
                        </button>
                        {!!selectedTemplate && <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-white bg-gray-600/50 rounded-md">Desactivado al usar plantilla</div>}
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    
                    {generatedTasks.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Tareas sugeridas (puedes editarlas):</h4>
                            <div className="max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-900/50 space-y-2">
                                {generatedTasks.map((task) => (
                                    <div key={task.id} className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={task.isSelected}
                                            onChange={() => handleTaskSelectionChange(task.id)}
                                            className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <input 
                                            type="text"
                                            value={task.text}
                                            onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
                                            className="flex-grow text-sm p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                        />
                                        <button type="button" onClick={() => handleRemoveTask(task.id)} className="text-gray-400 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex justify-end pt-2">
                <button type="submit" className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">{project ? 'Actualizar' : 'Crear Proyecto'}</button>
            </div>
        </form>
    );
};

export default ProjectForm;

