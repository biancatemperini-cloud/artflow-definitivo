import React, { useState } from 'react';
import { doc, getDoc, setDoc, collection, query, orderBy, getDocs, where, writeBatch, Timestamp } from 'firebase/firestore';
import { Compass, Wind, BookOpen } from 'lucide-react';
import Modal from './Modal';

// Se añade `habits` a las props
const CreativeAdvisor = ({ userId, projects, tasks, habits, db, appId, getWeekId, getMonthId }) => {
    const [suggestion, setSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [summaries, setSummaries] = useState([]);

    const handleGenerate = async (type) => {
        setIsLoading(true);
        setError('');
        setSuggestion('');
        let prompt;

        if (type === 'summary') {
            const today = new Date();
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(today.getDate() - 7);
            const weekId = getWeekId(oneWeekAgo);

            const summaryRef = doc(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`, weekId);
            const summarySnap = await getDoc(summaryRef);

            if (summarySnap.exists()) {
                setSuggestion(summarySnap.data().summaryText);
                setIsLoading(false);
                return;
            }

            const objectivesLastWeek = projects.flatMap(p => 
                (p.objectives || []).filter(o => o.completed && o.completedAt && o.completedAt.toDate() > oneWeekAgo && o.completedAt.toDate() <= today)
                                     .map(o => `- Hito: "${o.text}" (del proyecto '${p.name}')`)
            );

            const allProjectTasks = projects.map(p => {
                const projectTasks = tasks.filter(t => t.projectId === p.id);
                const completedTasks = projectTasks.filter(t => t.completed).length;
                return { ...p, totalTasks: projectTasks.length, completedTasks };
            });

            const newlyCompletedProjects = allProjectTasks.filter(p => {
                const lastObjectiveCompleted = (p.objectives || []).some(o => o.completed && o.completedAt && o.completedAt.toDate() > oneWeekAgo);
                return p.totalTasks > 0 && p.totalTasks === p.completedTasks && lastObjectiveCompleted;
            }).map(p => `- Proyecto: "${p.name}"`);

            const activeProjectsProgress = allProjectTasks.filter(p => p.totalTasks > 0 && p.totalTasks > p.completedTasks)
                .map(p => `- "${p.name}" (Progreso: ${Math.round((p.completedTasks / p.totalTasks) * 100)}%)`);

            
            prompt = `Eres 'ArtFlow AI Coach', un narrador que documenta la jornada creativa de un artista. Tu tono es épico y motivador. Vas a escribir el capítulo de esta semana de su historia, titulado "Show Your Week".
            
            Aquí están los datos de la semana pasada:
            Hitos Desbloqueados:
            ${objectivesLastWeek.length > 0 ? objectivesLastWeek.join('\n') : "El artista se centró en otros frentes esta semana."}

            Proyectos Conquistados (finalizados esta semana):
            ${newlyCompletedProjects.length > 0 ? newlyCompletedProjects.join('\n') : "Ninguno esta semana, ¡pero la aventura continúa!"}

            Progreso en Proyectos Activos (Próximas Aventuras):
            ${activeProjectsProgress.length > 0 ? activeProjectsProgress.join('\n') : "Momento de planificar la próxima gran obra."}
            
            Basado en esta información, genera un resumen inspirador, pero breve. Estructura tu respuesta EXACTAMENTE así:
            1. Un título creativo para el capítulo de la semana.
            2. Una sección llamada "Hitos Desbloqueados".
            3. Una sección llamada "Proyectos Conquistados".
            4. Una sección llamada "Próximas Aventuras".
            5. Un párrafo final de motivación.
            Sé conciso, visual y celebra cada logro. Usa un lenguaje que empodere al artista. Responde únicamente con el texto del resumen.`;
        
        } else if (type === 'mindfulness') {
            const mindfulnessPrompts = [
                `Eres 'ArtFlow AI Coach', un mentor de productividad para artistas. Tu tono es calmado y centrado. Genera un consejo de mindfulness corto para un artista que podría sentirse abrumado. El consejo DEBE incluir la técnica de **respiración de caja**: Inhalar (4s) → Mantener (4s) → Exhalar (4s) → Mantener (4s). Presenta el consejo de forma amable y fácil de seguir. Responde solo con el texto del consejo.`,
                `Eres 'ArtFlow AI Coach', un mentor de productividad para artistas. Tu tono es calmado y centrado. Genera un consejo de mindfulness para ayudar a un artista a anclarse en el presente. El consejo DEBE describir la **técnica de anclaje sensorial 5-4-3-2-1** (nombrar 5 cosas que puedes ver, 4 que puedes sentir, 3 que puedes oír, 2 que puedes oler y 1 que puedes saborear). Preséntalo como una forma de reconectar con el entorno y encontrar inspiración en los detalles. Responde solo con el texto del consejo.`,
                `Eres 'ArtFlow AI Coach', un mentor de productividad para artistas. Tu tono es calmado y centrado. Genera un consejo de mindfulness para un artista que sufre de bloqueo creativo. El consejo DEBE sugerir la práctica de la **observación consciente**. Anímale a tomar un objeto simple de su estudio (un pincel, una piedra) y observarlo durante un minuto como si fuera la primera vez, notando su textura, color y forma, sin juzgar. Explica cómo este simple acto puede reiniciar la percepción y calmar la mente. Responde solo con el texto del consejo.`
            ];
            prompt = mindfulnessPrompts[Math.floor(Math.random() * mindfulnessPrompts.length)];

        } else { // 'mentor'
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const stagnantTasks = tasks.filter(task => 
                !task.completed && task.createdAt && task.createdAt.toDate() < oneMonthAgo
            ).map(task => `- Tarea: "${task.name}"`);

            const forgottenHabits = (habits || []).filter(habit =>
                habit.lastCompleted && habit.lastCompleted.toDate() < threeDaysAgo && habit.currentStreak === 0
            ).map(habit => `- Hábito: "${habit.name}"`);


            const stagnantTasksList = stagnantTasks.length > 0 ? stagnantTasks.join('\n') : "Ninguna.";
            const forgottenHabitsList = forgottenHabits.length > 0 ? forgottenHabits.join('\n') : "Ninguno.";


            prompt = `Eres 'ArtFlow AI Coach', un mentor y guía en una gran aventura creativa. Tu tono es el de un sabio compañero de viaje: narrativo, humano y un poco épico. No eres un robot, eres un guía.
            Analiza la situación actual del artista en su viaje. Prioriza el patrón más importante y enfócate solo en él para no abrumar.

            **Registro del Viajero:**
            - Misiones que llevan tiempo en la mochila (creadas hace más de un mes y no completadas):
            ${stagnantTasksList}
            - Rituales olvidados (hábitos cuya racha se rompió y no se han retomado en los últimos 3 días):
            ${forgottenHabitsList}

            Basado en el patrón MÁS RELEVANTE que observes (primero las tareas estancadas, si no hay, los hábitos olvidados), ofrece tu guía. Preséntala como un "Pergamino del Mentor". Tu consejo debe:
            1. Reconocer el desafío con empatía (ej: "Veo que la misión '...' ha sido un dragón difícil de enfrentar..." o "Noto que el ritual de '...' se ha desvanecido con la niebla...").
            2. Proponer un micro-reto o una técnica específica y accionable para superarlo (sugiere la Regla de los 2 Minutos, la Técnica Pomodoro, o simplemente retomar el hábito una sola vez hoy).
            3. Terminar con una frase de aliento que encaje con la metáfora de la aventura.

            Ejemplo de tono para un hábito: "Viajero, he notado en las estrellas que el ritual de 'Bocetar a diario' no ha iluminado tu campamento recientemente. A veces, el camino nos desvía. ¿Qué tal un micro-reto? Solo un trazo hoy. Un círculo. Una línea. No tiene que ser una obra maestra, solo un gesto para recordarle al fuego que sigue vivo. ¡Tu cuaderno anhela el susurro de tu lápiz!"

            Si no detectas ningún patrón de mejora, ofrece un mensaje general de ánimo sobre mantener el buen ritmo en la aventura.
            Responde únicamente con el texto del consejo.`;
        }

        try {
            let text;
            if (process.env.NODE_ENV === 'development') {
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                if (!apiKey) throw new Error("La clave de API de Gemini no se encontró en el entorno de desarrollo.");
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
            setSuggestion(text.trim());

            if (type === 'summary') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(new Date().getDate() - 7);
                const weekId = getWeekId(oneWeekAgo);
                const summaryRef = doc(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`, weekId);
                await setDoc(summaryRef, { summaryText: text.trim(), createdAt: Timestamp.now(), monthId: getMonthId(oneWeekAgo) });
            }
        } catch (e) {
            console.error("Error al generar:", e.message);
            setError("No se pudo conectar con el mentor. Inténtalo de nuevo más tarde.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchSummaries = async () => {
        if (!userId) return;
        const summariesRef = collection(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`);
        const q = query(summariesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const fetchedSummaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSummaries(fetchedSummaries);
    };

    const openHistoryModal = () => {
        fetchSummaries();
        setIsHistoryModalOpen(true);
    };

    const handleDeleteMonth = async (monthId) => {
        if (!userId || !window.confirm(`¿Seguro que quieres borrar todos los resúmenes de ${monthId}?`)) return;
        const summariesRef = collection(db, `/artifacts/${appId}/users/${userId}/weeklySummaries`);
        const q = query(summariesRef, where("monthId", "==", monthId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        fetchSummaries();
    };

    const groupedSummaries = summaries.reduce((acc, summary) => {
        const month = summary.monthId || getMonthId(summary.createdAt.toDate());
        if (!acc[month]) {
            acc[month] = [];
        }
        acc[month].push(summary);
        return acc;
    }, {});

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                <Compass className="mx-auto h-12 w-12 text-violet-400" />
                <h3 className="text-xl font-bold my-3">Mentor Creativo</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Tu guía para la gran aventura creativa. Pide consejo, calma tu mente o revive los capítulos de tu historia.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={() => handleGenerate('mentor')} disabled={isLoading} className="flex-1 inline-flex justify-center items-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105">
                        <Compass className="mr-2 h-4 w-4" /> Consejo del Mentor
                    </button>
                    <button onClick={() => handleGenerate('mindfulness')} disabled={isLoading} className="flex-1 inline-flex justify-center items-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105">
                        <Wind className="mr-2 h-4 w-4" /> Pausa Mindfulness
                    </button>
                    <button onClick={() => handleGenerate('summary')} disabled={isLoading} className="flex-1 inline-flex justify-center items-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105">
                        <BookOpen className="mr-2 h-4 w-4" /> Show Your Week
                    </button>
                </div>
                 <button onClick={openHistoryModal} className="mt-4 text-sm text-violet-500 hover:underline">Ver Tu Historia</button>
                {suggestion && (<div className="mt-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-left"><p className="text-violet-800 dark:text-violet-200 whitespace-pre-wrap">{suggestion}</p></div>)}
                {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            </div>
            
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Tu Historia Creativa: Capítulos Semanales">
                {Object.keys(groupedSummaries).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedSummaries).map(([month, monthSummaries]) => (
                            <div key={month}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-lg">{new Date(month + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h4>
                                    <button onClick={() => handleDeleteMonth(month)} className="text-xs text-red-500 hover:underline">Eliminar mes</button>
                                </div>
                                <div className="space-y-4">
                                    {monthSummaries.map(summary => (
                                        <div key={summary.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <p className="font-semibold text-sm mb-2 text-violet-700 dark:text-violet-300">Capítulo de la semana: {summary.id}</p>
                                            <p className="text-sm whitespace-pre-wrap">{summary.summaryText}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>Aún no hay capítulos guardados. ¡Genera tu primer "Show Your Week" para empezar a escribir tu historia!</p>
                )}
            </Modal>
        </>
    );
};

export default CreativeAdvisor;

