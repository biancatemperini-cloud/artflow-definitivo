import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';

const TaskForm = ({ onSubmit, task, projects, isNewTask, activeProjectId }) => {
    const [name, setName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Media');
    const [notes, setNotes] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');

    useEffect(() => {
        // Set initial values for text fields, notes, etc. based on task prop
        setName(task?.name || '');
        setNotes(task?.notes || '');
        setPriority(task?.priority || 'Media');
        setDueDate(task?.dueDate ? new Date(task.dueDate.seconds * 1000).toISOString().split('T')[0] : '');

        // Logic to determine the default selected project
        if (isNewTask) {
            // For any new task (from project view or BrainDump), default to the currently active project
            setSelectedProjectId(activeProjectId || (projects && projects.length > 0 ? projects[0].id : ''));
        } else {
            // When editing an existing task, always use its own project ID
            setSelectedProjectId(task?.projectId || '');
        }
    }, [task, projects, activeProjectId, isNewTask]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const taskData = { name, priority, notes };
        if (dueDate) {
            const localDate = new Date(dueDate);
            const userTimezoneOffset = localDate.getTimezoneOffset() * 60000;
            const utcDate = new Date(localDate.getTime() + userTimezoneOffset);
            taskData.dueDate = Timestamp.fromDate(utcDate);
        } else {
            taskData.dueDate = null;
        }

        if (isNewTask) {
            taskData.projectId = selectedProjectId;
        }

        onSubmit(taskData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label htmlFor="taskName" className="block text-sm font-medium">Nombre de la Tarea</label><input type="text" id="taskName" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: Bocetar ideas iniciales" required /></div>
            
            {isNewTask && projects && projects.length > 0 && (
                <div>
                    <label htmlFor="project" className="block text-sm font-medium">Proyecto</label>
                    <select id="project" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}

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
            <div className="flex justify-end pt-2"><button type="submit" className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">{!isNewTask ? 'Actualizar Tarea' : 'Añadir Tarea'}</button></div>
        </form>
    );
};

export default TaskForm;

