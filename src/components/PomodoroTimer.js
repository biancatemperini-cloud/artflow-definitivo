import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getFirestore, doc, collection, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { Wind, Play, Pause, RefreshCw } from 'lucide-react';

const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// --- Constantes de Duración ---
const WORK_DURATION = 45 * 60; // Cambiado a 45 minutos
const SHORT_BREAK_DURATION = 5 * 60;
const LONG_BREAK_DURATION = 15 * 60;

const motivationalMessages = [
    "Respira. Mira tu trabajo con ojos nuevos.",
    "¡Foco completado! Recarga tu mente creativa.",
    "Buen trabajo. Tómate un momento para estirar.",
    "El arte necesita descanso para florecer. Pausa merecida."
];

// --- Nuevo Componente para la pantalla de finalización ---
const CompletionScreen = ({ message, onStartNext }) => (
    <div className="text-center flex flex-col items-center justify-center h-full p-4">
        <Wind size={40} className="text-violet-400 mb-4 animate-pulse" />
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{message}</p>
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-bold">Sugerencia de respiración:</p>
            <p>Inhalar (4s) → Mantener (4s) → Exhalar (4s) → Mantener (4s)</p>
        </div>
        <button
            onClick={onStartNext}
            className="mt-6 px-6 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-md"
        >
            Iniciar Descanso
        </button>
    </div>
);


const PomodoroTimer = ({ selectedTask, userId, darkMode, db, appId }) => {
    const [timer, setTimer] = useState(WORK_DURATION);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('work');
    const [workIntervals, setWorkIntervals] = useState(0);
    // --- Nuevo estado para la pantalla de finalización ---
    const [completionMessage, setCompletionMessage] = useState(null);

    const intervalRef = useRef(null);
    const meowRef = useRef(null);

    const stopTimer = useCallback(() => { clearInterval(intervalRef.current); setIsActive(false); }, []);

    useEffect(() => {
        if (isActive && timer > 0) {
            intervalRef.current = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (timer === 0) {
            if (meowRef.current) {
                meowRef.current.currentTime = 0;
                meowRef.current.play();
            }
            stopTimer();
            if (mode === 'work') {
                // Muestra la pantalla de finalización en lugar de cambiar de modo directamente
                const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
                setCompletionMessage(randomMessage);
                
                // Guarda la sesión de trabajo completada
                if (selectedTask && userId) {
                    const sessionData = { userId, taskId: selectedTask.id, taskName: selectedTask.name, projectId: selectedTask.projectId, completedAt: Timestamp.now(), duration: 45 };
                    const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, selectedTask.id);
                    const sessionRef = collection(db, `/artifacts/${appId}/users/${userId}/pomoSessions`);
                    const batch = writeBatch(db);
                    batch.update(taskRef, { pomoCount: increment(1) });
                    batch.set(doc(sessionRef), sessionData);
                    batch.commit();
                }
            } else { // Si un descanso termina, vuelve al trabajo
                setMode('work');
                setTimer(WORK_DURATION);
            }
        }
        return () => clearInterval(intervalRef.current);
    }, [isActive, timer, mode, selectedTask, userId, stopTimer, db, appId]);

    const startNextSession = () => {
        setCompletionMessage(null);
        const newWorkIntervals = workIntervals + 1;
        setWorkIntervals(newWorkIntervals);
        const isLongBreak = newWorkIntervals % 4 === 0;
        setMode(isLongBreak ? 'longBreak' : 'shortBreak');
        setTimer(isLongBreak ? LONG_BREAK_DURATION : SHORT_BREAK_DURATION);
    };

    const toggleTimer = () => setIsActive(!isActive);
    
    const resetTimer = () => {
        stopTimer();
        setMode('work');
        setTimer(WORK_DURATION);
        setWorkIntervals(0);
        setCompletionMessage(null); // Asegúrate de limpiar el mensaje también
    };
    
    const getModeStyles = () => {
        if (mode === 'work') return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300';
        if (mode === 'shortBreak') return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300';
        return 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300';
    };

    const getModeText = () => {
        if (mode === 'work') return 'Enfoque';
        if (mode === 'shortBreak') return 'Descanso Corto';
        return 'Descanso Largo';
    };

    return (
        <div className={`${darkMode ? 'glass-card-dark' : 'glass-card'} p-4 rounded-2xl shadow-2xl flex flex-col items-center hover-lift transition-all duration-300 min-h-[220px]`}>
            {completionMessage ? (
                <CompletionScreen message={completionMessage} onStartNext={startNextSession} />
            ) : (
                <>
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold mb-3 ${getModeStyles()} backdrop-blur border border-white/20`}>
                        {getModeText()}
                    </div>
                    <div
                        className="text-6xl font-bold my-2 tabular-nums bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent"
                        style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)' }}
                    >
                        {formatTime(timer)}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 h-4 text-center truncate w-full px-2">
                        {isActive && selectedTask 
                            ? `En: ${selectedTask.name}` 
                            : (selectedTask ? 'Listo para enfocar' : 'Selecciona una tarea')
                        }
                    </p>
                    <div className="flex space-x-2">
                        <button 
                            onClick={toggleTimer} 
                            disabled={!selectedTask} 
                            className={`px-6 py-2 rounded-lg font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-md text-sm flex items-center justify-center ${
                                isActive 
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                            } disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none`}
                        >
                            {isActive ? <Pause size={16} className="mr-2"/> : <Play size={16} className="mr-2"/>}
                            {isActive ? 'Pausa' : 'Inicio'}
                        </button>
                        <button 
                            onClick={resetTimer} 
                            className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-md text-sm flex items-center justify-center ${
                                darkMode 
                                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' 
                                : 'bg-black/10 text-gray-800 hover:bg-black/20 border border-black/20'
                            } backdrop-blur`}
                        >
                            <RefreshCw size={14} className="mr-2"/>
                            Reset
                        </button>
                    </div>
                </>
            )}
            <audio ref={meowRef} src="/meow.mp3" preload="auto" />
        </div>
    );
};

export default PomodoroTimer;
