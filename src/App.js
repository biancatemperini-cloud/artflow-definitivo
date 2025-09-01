import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch, Timestamp, increment, setDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Plus, Zap, Target, Edit2, Trash2, BrainCircuit, Moon, Sun, X, Sparkles, Calendar, History, Lightbulb, Home, CheckCircle2, Award, FileText, Share2, MessageSquare, ArrowUp, ArrowDown, Minus } from 'lucide-react';

// --- Firebase Configuration ---
// Las claves ahora se leen desde las variables de entorno.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// --- App ID for Firestore paths ---
const appId = "artflow-ai";

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Functions ---
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDate = (date) => {
    if (!date) return '';
    return new Date(date.seconds * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getDaysRemaining = (dueDate) => {
    if (!dueDate) return { text: '', color: 'text-gray-400' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.seconds * 1000);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Atrasado por ${Math.abs(diffDays)} días`, color: 'text-red-500 font-semibold' };
    if (diffDays === 0) return { text: 'Vence hoy', color: 'text-red-500 font-bold' };
    if (diffDays === 1) return { text: 'Vence mañana', color: 'text-yellow-500 font-semibold' };
    return { text: `Vence en ${diffDays} días`, color: 'text-pink-500' };
};

const getWeekId = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
};

const getMonthId = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// --- Components ---

const Tooltip = ({ text, children }) => (<div className="relative group flex justify-center">{children}<span className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">{text}</span></div>);

const Modal = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md m-4 transform transition-all duration-300 scale-95 hover:scale-100">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={24} /></button></div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const ProjectCard = ({ project, onSelect, onDelete, onEdit, activeProjectId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-lg transition-all duration-300 mb-4 border-l-4 ${activeProjectId === project.id ? 'border-pink-500' : 'border-pink-200'}`}>
            <div className="flex justify-between items-center cursor-pointer" onClick={() => onSelect(project.id)}>
                <h3 className="font-bold text-lg">{project.name}</h3>
                <div className="flex items-center space-x-2">
                    <Tooltip text="Editar Proyecto"><button onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button></Tooltip>
                    <Tooltip text="Eliminar Proyecto"><button onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></Tooltip>
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                </div>
            </div>
            {isExpanded && (<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"><p className="text-sm text-gray-600 dark:text-gray-400">{project.description || "Sin descripción."}</p></div>)}
        </div>
    );
};

const TaskItem = ({ task, onToggle, onDelete, onSelect, isSelected, onEdit }) => {
    const daysRemaining = getDaysRemaining(task.dueDate);
    const [isExpanded, setIsExpanded] = useState(false);

    const PriorityIcon = ({ priority }) => {
        switch (priority) {
            case 'Alta':
                return <Tooltip text="Prioridad Alta"><ArrowUp size={16} className="text-red-500" /></Tooltip>;
            case 'Baja':
                return <Tooltip text="Prioridad Baja"><ArrowDown size={16} className="text-green-500" /></Tooltip>;
            default:
                return <Tooltip text="Prioridad Media"><Minus size={16} className="text-yellow-500" /></Tooltip>;
        }
    };

    return (
        <div
            className={`flex flex-col p-3 rounded-lg transition-all duration-200 cursor-pointer mb-2 ${
                isSelected
                  ? 'bg-indigo-100 dark:bg-indigo-900/50'
                  : task.completed
                    ? 'bg-gray-200 dark:bg-gray-800'
                    : 'bg-pink-200 dark:bg-pink-800'
            }`}
            onClick={() => onSelect(task)}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                    <input
                        id={`task-checkbox-${task.id}`}
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => { e.stopPropagation(); onToggle(task.id, !task.completed); }}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                    />
                    <label htmlFor={`task-checkbox-${task.id}`} className="sr-only">
                        Marcar tarea como completada
                    </label>
                    <span className={`ml-3 text-base truncate ${task.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{task.name}</span>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                    {task.priority && <PriorityIcon priority={task.priority} />}
                    {task.notes && (
                        <Tooltip text={isExpanded ? "Ocultar notas" : "Mostrar notas"}>
                            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-gray-400 hover:text-indigo-500">
                                <MessageSquare size={16} />
                            </button>
                        </Tooltip>
                    )}
                    <Tooltip text="Editar Tarea"><button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button></Tooltip>
                    {task.pomoCount > 0 && (<Tooltip text={`${task.pomoCount} sesiones Pomodoro`}><div className="flex items-center text-sm"><span role="img" aria-label="tomato" className="mr-1">🍅</span><span>{task.pomoCount}</span></div></Tooltip>)}
                    <Tooltip text="Eliminar Tarea"><button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-400 hover:text-red-500 opacity-50 hover:opacity-100"><Trash2 size={18} /></button></Tooltip>
                </div>
            </div>
            {task.dueDate && (<div className="text-right text-xs mt-1 pr-8"><span className={daysRemaining.color}>{daysRemaining.text}</span></div>)}
            {isExpanded && task.notes && (
                <div className="mt-2 pt-2 border-t border-pink-300 dark:border-pink-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.notes}</p>
                </div>
            )}
        </div>
    );
};

const PomodoroTimer = ({ selectedTask, userId, darkMode }) => {
    const [timer, setTimer] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('work');
    const [workIntervals, setWorkIntervals] = useState(0);
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
                const newWorkIntervals = workIntervals + 1;
                setWorkIntervals(newWorkIntervals);
                if (selectedTask && userId) {
                    const sessionData = { userId, taskId: selectedTask.id, taskName: selectedTask.name, projectId: selectedTask.projectId, completedAt: Timestamp.now(), duration: 25 };
                    const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, selectedTask.id);
                    const sessionRef = collection(db, `/artifacts/${appId}/users/${userId}/pomoSessions`);
                    const batch = writeBatch(db);
                    batch.update(taskRef, { pomoCount: increment(1) });
                    batch.set(doc(sessionRef), sessionData);
                    batch.commit();
                }
                setMode(newWorkIntervals % 4 === 0 ? 'longBreak' : 'shortBreak');
                setTimer(newWorkIntervals % 4 === 0 ? 15 * 60 : 5 * 60);
            } else {
                setMode('work');
                setTimer(25 * 60);
            }
        }
        return () => clearInterval(intervalRef.current);
    }, [isActive, timer, mode, workIntervals, selectedTask, userId, stopTimer]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => { stopTimer(); setMode('work'); setTimer(25 * 60); setWorkIntervals(0); };
    
    const getModeStyles = () => {
        if (mode === 'work') return 'bg-red-500/10 text-red-500';
        if (mode === 'shortBreak') return 'bg-green-500/10 text-green-500';
        return 'bg-blue-500/10 text-blue-500';
    };

    const getModeText = () => {
        if (mode === 'work') return 'Enfoque';
        if (mode === 'shortBreak') return 'Descanso Corto';
        return 'Descanso Largo';
    };

    return (
        <div className={`${darkMode ? 'glass-card-dark' : 'glass-card'} p-6 rounded-2xl shadow-2xl flex flex-col items-center hover-lift transition-all duration-300`}>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold mb-4 ${getModeStyles()} backdrop-blur border border-white/20`}>
                {getModeText()}
            </div>
            <div
                className="text-7xl font-bold my-4 tabular-nums"
                style={{
                    background: 'linear-gradient(90deg, #748bfa 0%, #f472b6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 6px #a5b4fc80) drop-shadow(0 0 6px #f472b680)'
                }}
            >
                {formatTime(timer)}
            </div>
            <p className="text-gray-400 text-sm mb-6 h-5 text-center truncate w-full px-2">
                {isActive && selectedTask 
                    ? `En: ${selectedTask.name}` 
                    : (selectedTask ? 'Listo' : 'Selecciona tarea')
                }
            </p>
            <div className="flex space-x-2">
                <button 
                    onClick={toggleTimer} 
                    disabled={!selectedTask} 
                    className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg ${
                        isActive 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                    } disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none`}
                >
                    {isActive ? 'Pausa' : 'Inicio'}
                </button>
                <button 
                    onClick={resetTimer} 
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                        darkMode 
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20' 
                        : 'bg-black/10 text-gray-800 hover:bg-black/20 border border-black/20'
                    } backdrop-blur`}
                >
                    Reset
                </button>
            </div>
            <audio ref={meowRef} src="/meow.mp3" preload="auto" />
        </div>
    );
};

const CalendarView = ({ userId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [notes, setNotes] = useState({});
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [currentNote, setCurrentNote] = useState('');

    const monthId = getMonthId(currentDate);

    useEffect(() => {
        if (!userId) return;
        const notesRef = collection(db, `/artifacts/${appId}/users/${userId}/calendarNotes`);
        const q = query(notesRef, where('monthId', '==', monthId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotes = {};
            snapshot.forEach(doc => {
                newNotes[doc.id] = doc.data().note;
            });
            setNotes(newNotes);
        });
        return () => unsubscribe();
    }, [userId, monthId]);

    const handleDayClick = (day) => {
        const dateId = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateId);
        setCurrentNote(notes[dateId] || '');
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = async () => {
        if (!userId || !selectedDate) return;
        const noteRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarNotes`, selectedDate);
        await setDoc(noteRef, { monthId: monthId, note: currentNote });
        setIsNoteModalOpen(false);
        setSelectedDate(null);
        setCurrentNote('');
    };

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay(); 
    const daysInMonth = endOfMonth.getDate();
    const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&lt;</button>
                    <h3 className="text-xl font-bold">{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {days.map(day => <div key={day} className="font-bold text-sm text-gray-500 dark:text-gray-400 py-2">{day}</div>)}
                    {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                    {Array.from({ length: daysInMonth }).map((_, day) => {
                        const dayNumber = day + 1;
                        const dateId = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber).toDateString();
                        const hasNote = notes[dateId];
                        return (
                            <div key={dayNumber} onClick={() => handleDayClick(dayNumber)} className={`h-24 border border-gray-200 dark:border-gray-700 rounded-md p-1 flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                <span className={`font-semibold text-center ${isToday ? 'text-indigo-600' : ''}`}>{dayNumber}</span>
                                {hasNote && (
                                    <div className="mt-2 text-xs text-pink-600 line-clamp-2 break-words">
                                      {notes[dateId].slice(0, 40)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={`Nota para ${selectedDate}`}>
                <textarea
                    className="w-full h-40 p-2 border rounded-md bg-white dark:bg-gray-700"
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Escribe tu nota aquí..."
                />
                <button onClick={handleSaveNote} className="mt-4 w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar Nota</button>
            </Modal>
        </>
    );
};

const HistoryLog = ({ userId }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, `/artifacts/${appId}/users/${userId}/pomoSessions`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.completedAt.seconds - a.completedAt.seconds);
            setSessions(sessionsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);
    const handleDeleteSession = async (session) => {
        if (!userId || !window.confirm("¿Seguro que quieres borrar esta entrada del historial?")) return;
        const batch = writeBatch(db);
        batch.delete(doc(db, `/artifacts/${appId}/users/${userId}/pomoSessions`, session.id));
        batch.update(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, session.taskId), { pomoCount: increment(-1) });
        await batch.commit();
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">Historial de Sesiones</h3>
                {isLoading ? <p>Cargando historial...</p> : sessions.length === 0 ? <p>No hay sesiones completadas todavía.</p> : (<div className="max-h-96 overflow-y-auto space-y-2 pr-2">{sessions.map(s => (<div key={s.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"><div><p className="font-semibold">{s.taskName}</p><p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(s.completedAt)}</p></div><Tooltip text="Eliminar Entrada"><button onClick={() => handleDeleteSession(s)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></Tooltip></div>))}</div>)}
        </div>
    );
};

const CreativeAdvisor = ({ projects, tasks }) => {
    const [suggestion, setSuggestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleGenerateSuggestion = async () => {
        setIsLoading(true); setError(''); setSuggestion('');
        const recentTasks = tasks.filter(t => t.completed).slice(0, 5).map(t => t.name);
        const activeProjects = projects.map(p => p.name);
        const prompt = `Eres 'ArtFlow AI Coach', un consejero de productividad para artistas. Tu tono es inspirador, comprensivo y práctico. Entiendes que los artistas no tienen horarios fijos de 9 a 5. Aquí tienes información sobre el usuario: - Proyectos activos: ${activeProjects.join(', ') || 'Ninguno'} - Tareas completadas recientemente: ${recentTasks.join(', ') || 'Ninguna'}. Usa UNA de las siguientes técnicas de productividad de personas exitosas, pero adáptala específicamente para el contexto de un artista. NO menciones el nombre de la técnica (ej. 'Ivy Lee'), solo explica el concepto adaptado. TÉCNICAS: 1. Eat the Frog (Hacer lo más difícil primero): Abordar la tarea más intimidante o compleja al inicio del día para liberar energía creativa. 2. The Ivy Lee Method (Planificar la noche anterior): Al final del día, anotar las 3-4 cosas más importantes para el día siguiente para empezar con un plan claro. 3. Time Blocking (Bloques de tiempo): Asignar una ventana de tiempo específica (ej. 90 min) a una única tarea, tratándola como una cita inamovible para proteger el tiempo creativo. 4. The Two-Minute Rule (Regla de los dos minutos): Si una tarea administrativa o de preparación se puede hacer en menos de dos minutos, hacerla inmediatamente para despejar la mente. 5. Deep Work (Trabajo profundo): Crear un ritual para sumergirse en el trabajo sin distracciones (teléfono lejos, sin notificaciones) durante un período extendido. TAREA: Basado en todo esto, genera UNA unica sugerencia corta (2-3 frases) que sea relevante para los proyectos o tareas del usuario. Conecta la técnica con su trabajo actual. La sugerencia debe ser motivadora y fácil de aplicar hoy. Responde solo con el texto de la sugerencia.`;
        try {
            const apiUrl = '/api/gemini-proxy'; // o la URL completa de tu función serverless
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            if (!response.ok) throw new Error(`Error del proxy: ${response.statusText}`);
            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            setSuggestion(text.trim());
        } catch (e) {
            console.error("Error al generar sugerencia:", e);
            setError("No se pudo generar una sugerencia. Inténtalo de nuevo más tarde.");
        } finally { setIsLoading(false); }
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
            <Lightbulb className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="text-xl font-bold my-3">Consejero Creativo</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Obtén una dosis de inspiración y un consejo práctico para impulsar tu jornada creativa.</p>
            <button onClick={handleGenerateSuggestion} disabled={isLoading} className="w-full inline-flex justify-center items-center py-3 px-6 border-transparent shadow-sm text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105">{isLoading ? 'Pensando...' : 'Dame un consejo'}</button>
            {suggestion && (<div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-left"><p className="text-purple-800 dark:text-purple-200">{suggestion}</p></div>)}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
    );
};

const HomeMissionsContainer = ({ userId }) => {
    const [activeTab, setActiveTab] = useState('daily');
    const [reward, setReward] = useState({ text: '', show: false });
    const showReward = useCallback((text) => {
        setReward({ text, show: true });
        setTimeout(() => setReward({ text: '', show: false }), 5000);
    }, []);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-center mb-6"><h3 className="text-2xl font-bold text-pink-600 dark:text-pink-400">Comandos Mensuales</h3><p className="text-gray-600 dark:text-gray-400">¡Mantén tus responsabilidades bajo control!</p></div>
            {reward.show && (<div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-center text-yellow-800 dark:text-yellow-200 flex items-center justify-center"><Award className="mr-3 h-6 w-6" /> <p className="font-semibold">{reward.text}</p></div>)}
            <div className="flex justify-center border-b border-gray-200 dark:border-gray-700 mb-6">
                <button onClick={() => setActiveTab('daily')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'daily' ? 'border-b-2 border-pink-500 text-pink-600 dark:text-pink-400' : 'text-gray-500 hover:text-pink-600'}`}>Diarias</button>
                <button onClick={() => setActiveTab('weekly')} className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'weekly' ? 'border-b-2 border-purple-500 text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-purple-600'}`}>Semanales</button>
            </div>
            {activeTab === 'daily' && <DailyMissions userId={userId} showReward={showReward} />}
            {activeTab === 'weekly' && <WeeklyMissions userId={userId} showReward={showReward} />}
        </div>
    );
};

const initialMissions = [ { id: 'dishes', name: 'Batalla contra los Platos', icon: '🍽️' }, { id: 'laundry', name: 'Operación Montaña de Ropa', icon: '🧺' }, { id: 'studio', name: 'Domar el Caos del Estudio', icon: '🎨' }, { id: 'trash', name: 'Expedición de la Basura', icon: '🗑️' }, { id: 'shopping', name: 'Incursión de Suministros', icon: '🛒' }, { id: 'bed', name: 'Conquista de la Cama', icon: '🛏️' }];

const DailyMissions = ({ userId, showReward }) => {
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
    }, [userId, todayStr]);

    useEffect(() => { fetchMissionStatus(); }, [fetchMissionStatus]);

    const handleCompleteMission = async (missionId, missionName) => {
        if (!userId) return;
        setMissions(missions.map(m => m.id === missionId ? { ...m, completed: true } : m));
        const prompt = `Eres ArtFlow AI, un coach creativo con mucho humor. Un artista acaba de completar una tarea del hogar. Genera un mensaje de recompensa corto (1-2 frases), divertido y exageradamente épico. La tarea es: "${missionName}". Responde solo con el texto de la respuesta.`;
        try {
            const apiUrl = '/api/gemini-proxy'; // o la URL completa de tu función serverless
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            if (!response.ok) throw new Error('Failed to get reward');
            const result = await response.json();
            showReward(result.candidates[0].content.parts[0].text.trim());
        } catch (e) {
            console.error(e);
            showReward('¡Misión completada! ¡Eres increíble!');
        }
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/homeMissions`, missionId), { lastCompleted: Timestamp.now() });
    };

    return isLoading ? <p>Cargando misiones...</p> : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{missions.map(m => (<div key={m.id} className={`p-4 rounded-lg transition-all duration-300 ${m.completed ? 'bg-pink-100 dark:bg-pink-900/50' : 'bg-gray-50 dark:bg-gray-700/50'}`}><div className="flex items-center"><span className="text-3xl mr-4">{m.icon}</span><div className="flex-grow"><p className={`font-semibold ${m.completed ? 'line-through text-gray-500' : ''}`}>{m.name}</p></div>{!m.completed && (<Tooltip text="¡Misión Cumplida!"><button onClick={() => handleCompleteMission(m.id, m.name)} className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transform hover:scale-110"><CheckCircle2 size={20} /></button></Tooltip>)}</div></div>))}</div>);
};

const WeeklyMissions = ({ userId, showReward }) => {
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
    }, [userId, currentWeekId]);

    useEffect(() => { fetchWeeklyStatus(); }, [fetchWeeklyStatus]);

    const handleCompleteWeeklyMission = async (missionId, missionName) => {
        if (!userId) return;
        setWeeklyStatus(prev => ({ ...prev, [missionId]: true }));
        const prompt = `Eres ArtFlow AI, un coach creativo con mucho humor. Un artista acaba de completar una tarea semanal del hogar. Genera un mensaje de recompensa corto (1-2 frases), divertido y exageradamente épico. La tarea es: "${missionName}". Responde solo con el texto de la recompensa.`;
        try {
            const apiUrl = '/api/gemini-proxy'; // o la URL completa de tu función serverless
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) throw new Error('Failed to get reward');
            const result = await response.json();
            showReward(result.candidates[0].content.parts[0].text.trim());
        } catch (e) {
            console.error(e);
            showReward('¡Has conquistado la semana! ¡Excelente trabajo!');
        }
        await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`, currentWeekId), { [missionId]: true }, { merge: true });
    };

    return isLoading ? <p>Cargando plan semanal...</p> : (<div className="space-y-3">{weeklyMissionsList.map(m => { const isToday = m.day === currentDay; const isCompleted = weeklyStatus[m.id]; return (<div key={m.id} className={`p-4 rounded-lg transition-all duration-300 flex items-center ${isCompleted ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-gray-50 dark:bg-gray-700/50'} ${isToday && !isCompleted ? 'ring-2 ring-purple-500' : ''}`}><span className="text-3xl mr-4">{m.icon}</span><div className="flex-grow"><p className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : ''}`}>{m.name}</p><p className="text-xs text-gray-500">{['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][m.day]}</p></div>{!isCompleted && (<Tooltip text="¡Completar Misión Semanal!"><button onClick={() => handleCompleteWeeklyMission(m.id, m.name)} className="p-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transform hover:scale-110"><CheckCircle2 size={20} /></button></Tooltip>)}</div>);})}</div>);
};

const MonthlyObligations = ({ userId }) => {
    const [obligations, setObligations] = useState([]);
    const [newObligation, setNewObligation] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const currentMonthId = getMonthId(new Date());
    const configDocRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');

    const fetchObligations = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const configSnap = await getDoc(configDocRef);
        const savedTasks = configSnap.exists() ? configSnap.data().tasks : ['Pagar Monotributo', 'Enviar Facturas', 'Pagar Alquiler/Servicios'];
        const monthStatusRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyStatus`, currentMonthId);
        const monthStatusSnap = await getDoc(monthStatusRef);
        const monthStatus = monthStatusSnap.exists() ? monthStatusSnap.data() : {};
        setObligations(savedTasks.map(task => ({ name: task, completed: !!monthStatus[task] })));
        setIsLoading(false);
    }, [userId, currentMonthId, configDocRef]);

    useEffect(() => { fetchObligations(); }, [fetchObligations]);

    const handleAddObligation = async (e) => {
        e.preventDefault();
        if (!newObligation.trim() || !userId) return;
        await setDoc(configDocRef, { tasks: arrayUnion(newObligation) }, { merge: true });
        setObligations(prev => [...prev, { name: newObligation, completed: false }]);
        setNewObligation('');
    };

    const handleDeleteObligation = async (name) => {
        if (!userId || !window.confirm(`¿Seguro que quieres eliminar la obligación "${name}"?`)) return;
        await updateDoc(configDocRef, { tasks: arrayRemove(name) });
        setObligations(prev => prev.filter(ob => ob.name !== name));
    };

    const handleToggleObligation = async (name) => {
        if (!userId) return;
        const newStatus = !obligations.find(ob => ob.name === name).completed;
        setObligations(prev => prev.map(ob => ob.name === name ? { ...ob, completed: newStatus } : ob));
        const monthStatusRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyStatus`, currentMonthId);
        await setDoc(monthStatusRef, { [name]: newStatus }, { merge: true });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-center mb-6"><FileText className="mx-auto h-10 w-10 text-pink-500" /><h3 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">Comandos Mensuales</h3><p className="text-gray-600 dark:text-gray-400">¡Mantén tus responsabilidades bajo control!</p></div>
            {isLoading ? <p>Cargando...</p> : (<div className="space-y-3 mb-6">{obligations.map(ob => (<div key={ob.name} className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg"><input type="checkbox" checked={ob.completed} onChange={() => handleToggleObligation(ob.name)} className="h-5 w-5 rounded border-pink-300 text-pink-600 focus:ring-pink-500 cursor-pointer" aria-label={`Marcar obligación "${ob.name}" como completada`}/><span className={`flex-grow ml-3 ${ob.completed ? 'line-through text-gray-500' : ''}`}>{ob.name}</span><button onClick={() => handleDeleteObligation(ob.name)} className="text-gray-400 hover:text-red-500 ml-2"><Trash2 size={16} /></button></div>))}</div>)}
            <form onSubmit={handleAddObligation} className="flex gap-2"><input type="text" value={newObligation} onChange={e => setNewObligation(e.target.value)} placeholder="Añadir nueva obligación" className="flex-grow w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500" /><button type="submit" className="p-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"><Plus size={20} /></button></form>
        </div>
    );
};

const MonthlySocialGrid = ({ platformId, taskType, status, onToggle }) => {
    const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    return (
        <div className="relative">
            <h5 className="font-bold text-center mb-2">{taskType}</h5>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {days.map(day => <div key={day} className="font-semibold text-gray-500">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-1">
                {Array.from({ length: 28 }).map((_, index) => {
                    const weekIndex = Math.floor(index / 7);
                    const dayIndex = index % 7;
                    const key = `${platformId}-${taskType}-${weekIndex}-${dayIndex}`;
                    return (
                        <div key={key} className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={!!status[key]}
                                onChange={() => onToggle(key, !status[key])}
                                className="h-5 w-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                aria-label={`Marcar ${taskType} de ${platformId} semana ${weekIndex + 1} día ${days[dayIndex]} como completada`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SocialMediaPlanner = ({ userId }) => {
    const [platforms, setPlatforms] = useState([]);
    const [monthlyStatus, setMonthlyStatus] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const configDocRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'socialPlatforms');
    const currentMonthId = getMonthId(new Date());

    const fetchPlatforms = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const configSnap = await getDoc(configDocRef);
        
        const defaultPlatforms = [
            { id: 'insta1', name: '@modelovivobianca' },
            { id: 'insta2', name: '@biancatemperinionline' },
            { id: 'insta3', name: '@1moral' },
            { id: 'patreon', name: 'Patreon' },
            { id: 'onlyfans', name: 'OnlyFans' },
        ];

        if (configSnap.exists()) {
            let platformsData = configSnap.data().platforms;
            // Simple migration logic: check if the first instagram name is the old one
            const needsUpdate = platformsData.some(p => p.id === 'insta1' && p.name === 'Instagram 1');
            if (needsUpdate) {
                await setDoc(configDocRef, { platforms: defaultPlatforms });
                setPlatforms(defaultPlatforms);
            } else {
                setPlatforms(platformsData);
            }
        } else {
            await setDoc(configDocRef, { platforms: defaultPlatforms });
            setPlatforms(defaultPlatforms);
        }

        const monthStatusRef = doc(db, `/artifacts/${appId}/users/${userId}/socialStatus`, currentMonthId);
        const monthStatusSnap = await getDoc(monthStatusRef);
        setMonthlyStatus(monthStatusSnap.exists() ? monthStatusSnap.data() : {});
        setIsLoading(false);
    }, [userId, currentMonthId, configDocRef]);

    useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

    const handleToggleStatus = async (key, newStatus) => {
        if (!userId) return;
        setMonthlyStatus(prev => ({ ...prev, [key]: newStatus }));
        const monthStatusRef = doc(db, `/artifacts/${appId}/users/${userId}/socialStatus`, currentMonthId);
        await setDoc(monthStatusRef, { [key]: newStatus }, { merge: true });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-center mb-6"><Share2 className="mx-auto h-10 w-10 text-rose-500" /><h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">Centro de Redes</h3><p className="text-gray-600 dark:text-gray-400">Planifica tu conquista del mundo digital.</p></div>
            {isLoading ? <p>Cargando...</p> : (<div className="space-y-8">{platforms.map(p => {
                const isInstagram = p.name.toLowerCase().includes('instagram') || p.name.startsWith('@');
                const taskTypes = isInstagram ? ['Publicación', 'Historia'] : ['Foto', 'Video'];
                return (
                    <div key={p.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-bold text-xl mb-4 text-center">{p.name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 relative">
                            <MonthlySocialGrid
                                platformId={p.id}
                                taskType={taskTypes[0]}
                                status={monthlyStatus}
                                onToggle={handleToggleStatus}
                            />
                            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-gray-300 dark:bg-gray-600"></div>
                            <MonthlySocialGrid
                                platformId={p.id}
                                taskType={taskTypes[1]}
                                status={monthlyStatus}
                                onToggle={handleToggleStatus}
                            />
                        </div>
                    </div>
                );
            })}</div>)}
            <p className="text-xs text-center mt-6 text-gray-500">Para añadir/editar plataformas, por favor contacta al soporte (próximamente en la UI).</p>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState('timer');

    useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) { 
                setUserId(user.uid); 
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) { 
                    console.error("Authentication failed:", error); 
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !userId) { setIsLoading(userId === null); return; }
        setIsLoading(false);
        const projectsRef = collection(db, `/artifacts/${appId}/users/${userId}/projects`);
        const unsubscribeProjects = onSnapshot(query(projectsRef), (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projectsData);
            if (!activeProjectId && projectsData.length > 0) setActiveProjectId(projectsData[0].id);
            else if (projectsData.length === 0) setActiveProjectId(null);
        });
        const allTasksRef = collection(db, `/artifacts/${appId}/users/${userId}/tasks`);
        const unsubscribeAllTasks = onSnapshot(query(allTasksRef), (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTasks(tasksData);
        });
        return () => { unsubscribeProjects(); unsubscribeAllTasks(); };
    }, [isAuthReady, userId, activeProjectId]);

    useEffect(() => {
        if (activeProjectId) {
            const projectTasks = allTasks.filter(t => t.projectId === activeProjectId);
            const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
            projectTasks.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
            setTasks(projectTasks);
        } else {
            setTasks([]);
        }
    }, [activeProjectId, allTasks]);

    const handleAddOrUpdateProject = async (projectData, generatedTasks) => {
        if (!userId) return;
        if (editingProject) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/projects`, editingProject.id), projectData);
        } else {
            const newProjectRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/projects`), { ...projectData, createdAt: Timestamp.now() });
            if (generatedTasks && generatedTasks.length > 0) {
                const batch = writeBatch(db);
                generatedTasks.forEach(taskName => {
                    const newTaskRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`));
                    batch.set(newTaskRef, { name: taskName, projectId: newProjectRef.id, completed: false, createdAt: Timestamp.now(), pomoCount: 0, priority: 'Media', notes: '' });
                });
                await batch.commit();
            }
        }
        setIsProjectModalOpen(false); setEditingProject(null);
    };
    
    const handleEditProject = (project) => { setEditingProject(project); setIsProjectModalOpen(true); };

    const handleDeleteProject = async (projectId) => {
        if (!userId || !window.confirm('¿Seguro que quieres eliminar este proyecto y todas sus tareas?')) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId));
        const tasksSnapshot = await getDocs(query(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), where("projectId", "==", projectId)));
        const batch = writeBatch(db);
        tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
        await batch.commit();
        if (activeProjectId === projectId) setActiveProjectId(projects.length > 1 ? projects.find(p => p.id !== projectId).id : null);
    };

    const handleAddOrUpdateTask = async (taskData) => {
        if (!userId) return;
        if (editingTask) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, editingTask.id), taskData);
        } else {
            if (!activeProjectId) return;
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), { 
                ...taskData, 
                projectId: activeProjectId, 
                completed: false, 
                createdAt: Timestamp.now(), 
                pomoCount: 0 
            });
        }
        setIsTaskModalOpen(false);
        setEditingTask(null);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleToggleTask = async (taskId, completed) => { if (!userId) return; await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId), { completed }); };
    const handleDeleteTask = async (taskId) => { if (!userId) return; if (selectedTask && selectedTask.id === taskId) setSelectedTask(null); await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId)); };

    if (isLoading) return (<div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-center"><BrainCircuit className="mx-auto h-12 w-12 text-indigo-600 animate-pulse" /><h2 className="mt-6 text-xl font-semibold">Iniciando ArtFlow AI...</h2></div></div>);

    const navButtons = [
        { view: 'timer', icon: Target, label: 'Tareas' },
        { view: 'home', icon: Home, label: 'Hogar' },
        { view: 'obligations', icon: FileText, label: 'Obligaciones' },
        { view: 'social', icon: Share2, label: 'Redes' },
        { view: 'advisor', icon: Lightbulb, label: 'Consejero' },
        { view: 'calendar', icon: Calendar, label: 'Calendario' },
        { view: 'history', icon: History, label: 'Historial' },
    ];

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-slate-800' : 'bg-gradient-to-br from-violet-100 to-rose-100'}`}>
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <CatIcon className="h-8 w-8 text-primary" />
                            <span className="ml-3 text-2xl font-bold tracking-tight">ArtFlow AI</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-gray-500 hidden md:block">ID: {userId}</span>
                            <Tooltip text={darkMode ? "Modo Claro" : "Modo Oscuro"}>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                    aria-label={darkMode ? "Modo Claro" : "Modo Oscuro"}
                                    title={darkMode ? "Modo Claro" : "Modo Oscuro"}
                                >
                                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <PomodoroTimer selectedTask={selectedTask} userId={userId} darkMode={darkMode} />
                        
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Proyectos</h2>
                                <Tooltip text="Nuevo Proyecto">
                                  <button
                                    aria-label="Nuevo Proyecto"
                                    onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                                    className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transform hover:scale-110"
                                  >
                                    <Plus size={20} />
                                  </button>
                                </Tooltip>
                            </div>
                            <div>{projects.length > 0 ? projects.map(p => <ProjectCard key={p.id} project={p} onSelect={setActiveProjectId} onDelete={handleDeleteProject} onEdit={handleEditProject} activeProjectId={activeProjectId} />) : <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg"><Zap size={32} className="mx-auto text-gray-400" /><p className="mt-2 text-gray-600 dark:text-gray-400">¡Crea tu primer proyecto!</p></div>}</div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-2 rounded-full shadow-lg flex justify-center items-center flex-wrap gap-2">
                            {navButtons.map(btn => (
                                <button key={btn.view} onClick={() => setActiveView(btn.view)} className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${activeView === btn.view ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                    <btn.icon size={16}/><span>{btn.label}</span>
                                </button>
                            ))}
                        </div>

                        {activeView === 'timer' && (
                            activeProjectId ? (
                                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold">Tareas</h2>
                                        <Tooltip text="Nueva Tarea">
                                            <button onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transform hover:scale-110">
                                                <Plus size={20} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div>{tasks.length > 0 ? tasks.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onSelect={setSelectedTask} isSelected={selectedTask?.id === t.id} onEdit={handleEditTask} />) : <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg"><Target size={32} className="mx-auto text-gray-400" /><p className="mt-2 text-gray-600 dark:text-gray-400">Añade tareas a tu proyecto.</p></div>}</div>
                                </div>
                            ) : (
                                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg text-center h-full flex flex-col justify-center items-center">
                                    <Zap size={40} className="mx-auto text-gray-400 mb-4" />
                                    <h3 className="text-lg font-semibold">Selecciona un proyecto</h3>
                                    <p className="mt-1 text-gray-600 dark:text-gray-400">Elige un proyecto de la lista para ver sus tareas aquí.</p>
                                </div>
                            )
                        )}
                        
                        {activeView === 'home' && <HomeMissionsContainer userId={userId} />}
                        {activeView === 'obligations' && <MonthlyObligations userId={userId} />}
                        {activeView === 'social' && <SocialMediaPlanner userId={userId} />}
                        {activeView === 'advisor' && <CreativeAdvisor projects={projects} tasks={allTasks} />}
                        {activeView === 'calendar' && <CalendarView userId={userId} />}
                        {activeView === 'history' && (
                            <>
                                <PomodoroSummary tasks={allTasks} />
                                <HistoryLog userId={userId} />
                            </>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={isProjectModalOpen} onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }} title={editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}><ProjectForm onSubmit={handleAddOrUpdateProject} project={editingProject} /></Modal>
            <Modal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} title={editingTask ? "Editar Tarea" : "Nueva Tarea"}><TaskForm onSubmit={handleAddOrUpdateTask} task={editingTask} /></Modal>
        </div>
    );
}

// --- Form Components for Modals ---
const ProjectForm = ({ onSubmit, project }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [generatedTasks, setGeneratedTasks] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { if (project) { setName(project.name); setDescription(project.description || ''); } else { setName(''); setDescription(''); } setGeneratedTasks([]); }, [project]);
    const handleGenerateTasks = async () => {
        if (!name.trim()) { setError("Por favor, introduce un nombre para el proyecto."); return; }
        setError(''); setIsGenerating(true); setGeneratedTasks([]);
        const prompt = `Eres un asistente experto en gestión de proyectos para artistas. Un usuario está creando un proyecto. Basado en el título y la descripción, desglósalo en una lista de 5 a 10 tareas procesables para un flujo de trabajo creativo. Devuelve un array JSON de strings. Título: "${name}", Descripción: "${description}". Responde únicamente con el array JSON.`;
        try {
            const apiUrl = '/api/gemini-proxy'; // o la URL completa de tu función serverless
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            if (!response.ok) throw new Error(`Error del proxy: ${response.statusText}`);
            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            const jsonString = text.replace(/```json|```/g, '').trim();
            setGeneratedTasks(JSON.parse(jsonString));
        } catch (e) { console.error("Error al generar tareas:", e); setError("No se pudieron generar las tareas."); } 
        finally { setIsGenerating(false); }
    };
    const handleSubmit = (e) => { e.preventDefault(); if (!name.trim()) return; onSubmit({ name, description }, project ? [] : generatedTasks); setName(''); setDescription(''); setGeneratedTasks([]); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium">Nombre del Proyecto</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: Serie de retratos" required /></div>
            <div><label className="block text-sm font-medium">Descripción (Opcional)</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Metas para este proyecto." /></div>
            {!project && (<div className="space-y-4 pt-2"><button type="button" onClick={handleGenerateTasks} disabled={isGenerating || !name} className="w-full inline-flex justify-center items-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"><Sparkles className="mr-2 h-5 w-5" />{isGenerating ? 'Generando...' : '✨ Desglosar Proyecto con IA'}</button>{error && <p className="text-sm text-red-500">{error}</p>}{generatedTasks.length > 0 && (<div className="space-y-2"><h4 className="text-sm font-medium">Tareas sugeridas:</h4><div className="max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50 dark:bg-gray-900/50">{generatedTasks.map((task, index) => <p key={index} className="text-sm py-1">- {task}</p>)}</div></div>)}</div>)}
            <div className="flex justify-end pt-2"><button type="submit" className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">{project ? 'Actualizar' : 'Crear Proyecto'}</button></div>
        </form>
    );
};

const TaskForm = ({ onSubmit, task }) => {
    const [name, setName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Media');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (task) {
            setName(task.name);
            setNotes(task.notes || '');
            setPriority(task.priority || 'Media');
            setDueDate(task.dueDate ? new Date(task.dueDate.seconds * 1000).toISOString().split('T')[0] : '');
        } else {
            setName('');
            setNotes('');
            setPriority('Media');
            setDueDate('');
        }
    }, [task]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const taskData = { name, priority, notes };
        if (dueDate) {
            taskData.dueDate = Timestamp.fromDate(new Date(dueDate));
        } else {
            taskData.dueDate = null;
        }
        onSubmit(taskData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="taskName" className="block text-sm font-medium">Nombre de la Tarea</label><input type="text" id="taskName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: Bocetar ideas iniciales" required /></div>
            <div><label htmlFor="dueDate" className="block text-sm font-medium">Fecha Límite (Opcional)</label><input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" /></div>
            <div>
                <label htmlFor="priority" className="block text-sm font-medium">Prioridad</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500">
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                </select>
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium">Notas (Opcional)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Añade detalles, ideas o enlaces..."></textarea>
            </div>
            <div className="flex justify-end pt-2"><button type="submit" className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">{task ? 'Actualizar Tarea' : 'Añadir Tarea'}</button></div>
        </form>
    );
};

const CatIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 32} height={props.size || 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className || "lucide lucide-cat-icon lucide-cat"} {...props}>
    <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/>
    <path d="M8 14v.5"/>
    <path d="M16 14v.5"/>
    <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
  </svg>
);

const PomodoroSummary = ({ tasks }) => {
  const completedWithPomos = tasks.filter(t => t.completed && t.pomoCount > 0);

  if (completedWithPomos.length === 0) return null;

  return (
    <div className="mb-6">
      <h4 className="text-lg font-bold mb-2">Pomodoros por Tarea Completada</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {completedWithPomos.map(task => (
          <div
            key={task.id}
            className="flex items-center bg-pink-50 dark:bg-pink-900/30 border-l-4 border-pink-400 rounded-lg p-4 shadow transition"
          >
            <span className="flex-1 font-semibold truncate">{task.name}</span>
            <span className="ml-4 flex items-center text-pink-600 dark:text-pink-300 font-bold text-lg">
              <span role="img" aria-label="tomato" className="mr-1">🍅</span>
              {task.pomoCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

