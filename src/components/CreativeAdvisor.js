import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, setDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import useGemini from '../hooks/useGemini'; // Importamos el hook
import { Brain, Sparkles, Zap, History } from 'lucide-react';

const CreativeAdvisor = ({ userId, projects, tasks, habits, db, appId, getWeekId, getMonthId }) => {
    // Usamos el hook para manejar el estado de la API (carga, error, datos)
    const { data: suggestion, isLoading, error, generateContent } = useGemini();
    
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [summaries, setSummaries] = useState([]);

    const handleGenerate = async (type) => {
        let prompt;

        if (type === 'stuck') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const stuckTasks = tasks
                .filter(t => !t.completed && new Date(t.createdAt?.toDate()) < oneMonthAgo)
                .map(t => `- "${t.text}" del proyecto "${projects.find(p => p.id === t.projectId)?.name || 'N/A'}"`);
            
            if (stuckTasks.length === 0) {
                await generateContent("Genera un consejo breve y motivador para un artista sobre cómo mantener el impulso creativo incluso cuando no hay bloqueos evidentes.");
                return;
            }
            prompt = `Soy un artista usando tu app. Detectaste que tengo estas tareas estancadas por más de un mes:\n${stuckTasks.join('\n')}\n\nActúa como un mentor creativo y dame un consejo accionable y empático para superar este bloqueo específico, en un tono de guía de aventura. No más de 150 palabras.`;

        } else if (type === 'habits') {
            const today = new Date().toLocaleString('es-ES', { weekday: 'long' });
            const forgottenHabits = habits
                .filter(h => h.frequency.includes(today) && h.streak === 0)
                .map(h => `- ${h.name}`);

            if (forgottenHabits.length === 0) {
                await generateContent("Genera un consejo inspirador sobre la importancia de la consistencia en los hábitos creativos, incluso cuando ya se están cumpliendo. Corto y al punto.");
                return;
            }
            prompt = `Mentor, he olvidado estos hábitos creativos hoy:\n${forgottenHabits.join('\n')}\n\nDame un empujón motivacional y una estrategia simple para reincorporarlos a mi rutina. Tono de "sabio maestro". No más de 100 palabras.`;
        
        } else if (type === 'mindfulness') {
            const techniques = [
                "Guíame en una 'respiración de caja' de 1 minuto para centrarme.",
                "Describe una técnica de 'anclaje sensorial' para conectarme con el presente.",
                "Proponme un ejercicio de 'escaneo corporal' breve para liberar tensión.",
                "Dame una visualización guiada corta para calmar la mente antes de crear."
            ];
            prompt = `Actúa como un guía de mindfulness. Elige una de las siguientes técnicas y explícamela de forma clara y concisa para que pueda practicarla ahora mismo: ${techniques.join(", ")}.`;
        
        } else if (type === 'summary') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(new Date().getDate() - 7);
            const completedThisWeek = tasks
                .filter(t => t.completed && t.completedAt && t.completedAt.toDate() > oneWeekAgo)
                .map(t => `- Completaste "${t.text}"`);

            if (completedThisWeek.length === 0) {
                await generateContent("Escribe un párrafo corto y alentador para alguien que no completó tareas esta semana, enfocándote en el descanso, la reflexión y la preparación para la semana que viene. Tono épico de narrador.");
                return;
            }
            prompt = `Narrador de historias épicas, resume mis logros de esta semana. Aquí están mis hazañas:\n${completedThisWeek.join('\n')}\n\nNarra mi progreso como si fuera un capítulo emocionante de mi viaje creativo. ¡Haz que suene legendario! No más de 200 palabras.`;
        }

        // La llamada a la API ahora es una simple función del hook
        const generatedText = await generateContent(prompt);

        // La lógica específica de guardar el resumen se queda en el componente
        if (type === 'summary' && generatedText) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(new Date().getDate() - 7);
            const weekId = getWeekId(oneWeekAgo);
            const summaryRef = doc(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`, weekId);
            await setDoc(summaryRef, { summaryText: generatedText, createdAt: Timestamp.now(), monthId: getMonthId(oneWeekAgo) });
        }
    };

    const fetchSummaries = useCallback(async () => {
        if (!userId) return;
        const q = query(collection(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        setSummaries(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, [userId, db, appId]);

    useEffect(() => {
        if (isHistoryModalOpen) {
            fetchSummaries();
        }
    }, [isHistoryModalOpen, fetchSummaries]);
    
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Mentor Creativo</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Tu guía personal para la aventura creativa. Pide un consejo, una pausa o un resumen de tus hazañas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleGenerate('stuck')} disabled={isLoading} className="flex items-center justify-center p-4 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors disabled:opacity-50">
                    <Brain className="h-5 w-5 mr-2" /> Guía del Mentor
                </button>
                <button onClick={() => handleGenerate('mindfulness')} disabled={isLoading} className="flex items-center justify-center p-4 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors disabled:opacity-50">
                    <Sparkles className="h-5 w-5 mr-2" /> Pausa Mindfulness
                </button>
                <button onClick={() => handleGenerate('summary')} disabled={isLoading} className="flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50">
                    <Zap className="h-5 w-5 mr-2" /> Show Your Week
                </button>
                <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <History className="h-5 w-5 mr-2" /> Ver Historial
                </button>
            </div>

            {isLoading && <div className="mt-6 text-center"><p className="text-gray-500 dark:text-gray-400">El mentor está meditando tu respuesta...</p></div>}
            
            {/* El JSX para mostrar el resultado y el error ahora usa los estados del hook */}
            {suggestion && (
                <div className="mt-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-left">
                    <p className="text-violet-800 dark:text-violet-200 whitespace-pre-wrap">{suggestion}</p>
                </div>
            )}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export default CreativeAdvisor;