import React, { useState, useEffect } from 'react';
import { onSnapshot, query, writeBatch, increment, orderBy, collection, doc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import Tooltip from './Tooltip';

const HistoryLog = ({ userId, db, appId, formatDate }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, `/artifacts/${appId}/users/${userId}/pomoSessions`), orderBy("completedAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSessions(sessionsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [userId, db, appId]);

    const handleDeleteSession = async (session) => {
        if (!userId || !window.confirm("¿Seguro que quieres borrar esta entrada del historial?")) return;
        const batch = writeBatch(db);
        batch.delete(doc(db, `/artifacts/${appId}/users/${userId}/pomoSessions`, session.id));
        if(session.taskId) { // Check if taskId exists to avoid errors
            const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, session.taskId);
            batch.update(taskRef, { pomoCount: increment(-1) });
        }
        await batch.commit();
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">Historial de Sesiones</h3>
            {isLoading ? <p>Cargando historial...</p> : sessions.length === 0 ? <p>No hay sesiones completadas todavía.</p> : (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {sessions.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                            <div>
                                <p className="font-semibold">{s.taskName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(s.completedAt)}</p>
                            </div>
                            <Tooltip text="Eliminar Entrada">
                                <button onClick={() => handleDeleteSession(s)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                            </Tooltip>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryLog;

