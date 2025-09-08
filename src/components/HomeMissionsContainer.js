import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Award, CheckCircle2 } from 'lucide-react';
import Tooltip from './Tooltip';

const initialMissions = [ 
    { id: 'dishes', name: 'Lavar los platos', icon: '🍽️' },
    { id: 'studio', name: 'Limpiar el estudio', icon: '🎨' },
    { id: 'shopping', name: 'Hacer las Compras', icon: '🛒' },
    { id: 'laundry', name: 'Lavar Ropa', icon: '🧺' },
    { id: 'trash', name: 'Sacar La Basura', icon: '🗑️' },
    { id: 'bed', name: 'Hacer la cama', icon: '🛏️' },
    { id: 'litterbox', name: 'Limpiar la caja de arena', icon: '🐾' }
];

const DailyMissions = ({ userId, showReward, db, appId }) => {
    const [missions, setMissions] = useState(initialMissions.map(m => ({ ...m, completed: false })));
    const [isLoading, setIsLoading] = useState(true);
    const todayStr = new Date().toDateString();

    const fetchMissionStatus = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const missionsWithStatus = await Promise.all(initialMissions.map(async (mission) => {
            const missionSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/homeMissions`, mission.id));
            return { ...mission, completed: missionSnap.exists() && missionSnap.data().lastCompleted.toDate().toDateString() === todayStr };
        }));
        setMissions(missionsWithStatus);
        setIsLoading(false);
    }, [userId, todayStr, db, appId]);

    useEffect(() => { fetchMissionStatus(); }, [fetchMissionStatus]);

    const handleCompleteMission = async (missionId, missionName) => {
        if (!userId) return;
        setMissions(missions.map(m => m.id === missionId ? { ...m, completed: true } : m));
        const prompt = `Eres ArtFlow AI, un coach creativo con mucho humor. Un artista acaba de completar una tarea del hogar. Genera un mensaje de recompensa corto (1-2 frases), divertido y exageradamente épico. La tarea es: "${missionName}". Responde solo con el texto de la respuesta.`;
        try {
            let text;
            if (process.env.NODE_ENV === 'development') {
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                if (!apiKey) throw new Error("La clave de API de Gemini no se encontró en el entorno de desarrollo.");
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                    throw new Error(errorData.error?.message || 'Error en la API de Gemini');
                }
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            } else {
                const apiUrl = '/api/gemini-proxy';
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt }) });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                    throw new Error(errorData.error?.message || 'Error del proxy');
                }
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            }
            showReward(text.trim());
        } catch (e) {
            console.error(e.message);
            showReward('¡Misión completada! ¡Eres increíble!');
        }
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/homeMissions`, missionId), { lastCompleted: Timestamp.now() });
    };

    return isLoading ? <p>Cargando misiones...</p> : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{missions.map(m => (<div key={m.id} className={`p-4 rounded-lg transition-all duration-300 ${m.completed ? 'bg-pink-100 dark:bg-pink-900/50' : 'bg-gray-50 dark:bg-gray-700/50'}`}><div className="flex items-center"><span className="text-3xl mr-4">{m.icon}</span><div className="flex-grow"><p className={`font-semibold ${m.completed ? 'line-through text-gray-500' : ''}`}>{m.name}</p></div>{!m.completed && (<Tooltip text="¡Misión Cumplida!"><button onClick={() => handleCompleteMission(m.id, m.name)} className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transform hover:scale-110"><CheckCircle2 size={20} /></button></Tooltip>)}</div></div>))}</div>);
};

const WeeklyMissions = ({ userId, showReward, db, appId, getWeekId }) => {
    const weeklyMissionsList = [ { id: 'kitchen', name: 'Limpieza Profunda: Cocina', day: 1, icon: '🍳' }, { id: 'bathroom', name: 'Operación Brillo: Baño', day: 2, icon: '🚽' }, { id: 'bedroom', name: 'Santuario Personal: Habitación', day: 3, icon: '🛏️' }, { id: 'livingroom', name: 'Zona de Relax: Living', day: 4, icon: '🛋️' }, { id: 'common', name: 'Armonía Espacial: Áreas Comunes', day: 5, icon: '🧹' }, { id: 'cats', name: 'Misión Felina: Caja de Arena', day: 6, icon: '🐾' }, { id: 'planning', name: 'Revisión y Descanso', day: 0, icon: '🧘' }];
    const [weeklyStatus, setWeeklyStatus] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const currentWeekId = getWeekId(new Date());
    const currentDay = new Date().getDay();

    const fetchWeeklyStatus = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const weekDocSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`, currentWeekId));
        setWeeklyStatus(weekDocSnap.exists() ? weekDocSnap.data() : {});
        setIsLoading(false);
    }, [userId, currentWeekId, db, appId]);

    useEffect(() => { fetchWeeklyStatus(); }, [fetchWeeklyStatus]);

    const handleCompleteWeeklyMission = async (missionId, missionName) => {
        if (!userId) return;
        setWeeklyStatus(prev => ({ ...prev, [missionId]: true }));
        const prompt = `Eres ArtFlow AI, un coach creativo con mucho humor. Un artista acaba de completar una tarea semanal del hogar. Genera un mensaje de recompensa corto (1-2 frases), divertido y exageradamente épico. La tarea es: "${missionName}". Responde solo con el texto de la recompensa.`;
        try {
            let text;
            if (process.env.NODE_ENV === 'development') {
                const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
                if (!apiKey) throw new Error("La clave de API de Gemini no se encontró en el entorno de desarrollo.");
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                    throw new Error(errorData.error?.message || 'Error en la API de Gemini');
                }
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            } else {
                const apiUrl = '/api/gemini-proxy';
                const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt }) });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
                    throw new Error(errorData.error?.message || 'Error del proxy');
                }
                const result = await response.json();
                text = result.candidates[0].content.parts[0].text;
            }
            showReward(text.trim());
        } catch (e) {
            console.error(e.message);
            showReward('¡Has conquistado la semana! ¡Excelente trabajo!');
        }
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`, currentWeekId), { [missionId]: true }, { merge: true });
    };

    return isLoading ? <p>Cargando plan semanal...</p> : (<div className="space-y-3">{weeklyMissionsList.map(m => { const isToday = m.day === currentDay; const isCompleted = weeklyStatus[m.id]; return (<div key={m.id} className={`p-4 rounded-lg transition-all duration-300 flex items-center ${isCompleted ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-gray-50 dark:bg-gray-700/50'} ${isToday && !isCompleted ? 'ring-2 ring-purple-500' : ''}`}><span className="text-3xl mr-4">{m.icon}</span><div className="flex-grow"><p className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : ''}`}>{m.name}</p><p className="text-xs text-gray-500">{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][m.day]}</p></div>{!isCompleted && (<Tooltip text="¡Completar Misión Semanal!"><button onClick={() => handleCompleteWeeklyMission(m.id, m.name)} className="p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transform hover:scale-110"><CheckCircle2 size={20} /></button></Tooltip>)}</div>);})}</div>);
};


const HomeMissionsContainer = ({ userId, db, appId, getWeekId }) => {
    const [reward, setReward] = useState({ text: '', show: false });
    const showReward = useCallback((text) => {
        setReward({ text, show: true });
        setTimeout(() => setReward({ text: '', show: false }), 10000);
    }, []);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-center mb-6"><h3 className="text-2xl font-bold text-pink-600 dark:text-pink-400">Tareas del Hogar</h3><p className="text-gray-600 dark:text-gray-400">¡Mantén tu espacio en orden!</p></div>
            {reward.show && (<div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-center text-yellow-800 dark:text-yellow-200 flex items-center justify-center"><Award className="mr-3 h-6 w-6" /> <p className="font-semibold">{reward.text}</p></div>)}
            
            <h4 className="text-lg font-semibold mb-3">Tareas Rápidas del Día</h4>
            <DailyMissions userId={userId} showReward={showReward} db={db} appId={appId}/>
            
            <div className="my-6 border-t border-gray-200 dark:border-gray-700"></div>

            <h4 className="text-lg font-semibold mb-3">Foco de Limpieza Semanal</h4>
            <WeeklyMissions userId={userId} showReward={showReward} db={db} appId={appId} getWeekId={getWeekId}/>
        </div>
    );
};

export default HomeMissionsContainer;
