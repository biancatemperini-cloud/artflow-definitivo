import React, { useState } from 'react';
import Tooltip from './Tooltip';
import { getDaysRemaining } from '../utils/helpers'; // Assuming you create a helpers file
import { MessageSquare, ArrowUp, ArrowDown, Minus, ListTree, Edit2, Trash2, GripVertical, CheckCircle, Circle, Plus } from 'lucide-react';

const TaskItem = ({ task, onToggle, onDelete, onSelect, isSelected, onEdit, onAddSubtask, onToggleSubtask, onDeleteSubtask, onDragStart, onDrop, isDragging }) => {
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [subtasksExpanded, setSubtasksExpanded] = useState(false);
    const [newSubtaskName, setNewSubtaskName] = useState("");
    
    const daysRemaining = getDaysRemaining(task.dueDate);

    const handleAddSubtaskSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (newSubtaskName.trim()) {
            onAddSubtask(task.id, newSubtaskName);
            setNewSubtaskName("");
        }
    };

    const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    const PriorityIcon = ({ priority }) => {
        switch (priority) {
            case 'Alta': return <Tooltip text="Prioridad Alta"><ArrowUp size={16} className="text-red-500" /></Tooltip>;
            case 'Baja': return <Tooltip text="Prioridad Baja"><ArrowDown size={16} className="text-green-500" /></Tooltip>;
            default: return <Tooltip text="Prioridad Media"><Minus size={16} className="text-blue-500" /></Tooltip>;
        }
    };

    return (
        <li 
            draggable="true"
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`flex flex-col p-3 rounded-lg transition-all duration-200 mb-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${ isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50' : task.completed ? 'bg-gray-200 dark:bg-gray-800' : 'bg-pink-300 dark:bg-pink-800' } ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center flex-1 min-w-0" >
                    <span className="cursor-grab text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}><GripVertical size={20}/></span>
                    <div className="flex items-center flex-1 min-w-0" onClick={() => onSelect(task)}>
                        <button onClick={(e) => { e.stopPropagation(); onToggle(task.id, !task.completed); }} className="flex-shrink-0">
                            {task.completed ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-400" />}
                        </button>
                        <span className={`ml-3 text-base cursor-pointer card-text-wrap ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.name}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                    {task.priority && <PriorityIcon priority={task.priority} />}
                    {task.notes && (<Tooltip text={notesExpanded ? "Ocultar notas" : "Mostrar notas"}><button aria-label={notesExpanded ? `Ocultar notas de ${task.name}` : `Mostrar notas de ${task.name}`} onClick={(e) => { e.stopPropagation(); setNotesExpanded(!notesExpanded); }} className="text-gray-500 dark:text-gray-400 hover:text-indigo-500"><MessageSquare size={16} /></button></Tooltip>)}
                    {(task.subtasks && task.subtasks.length > 0) && (<Tooltip text="Subtareas"><div className="flex items-center text-xs text-gray-500 dark:text-gray-400"><ListTree size={16} className="mr-1"/><span>{completedSubtasks}/{totalSubtasks}</span></div></Tooltip>)}
                    <Tooltip text="Editar Tarea"><button aria-label={`Editar tarea ${task.name}`} onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-gray-500 dark:text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button></Tooltip>
                    {task.pomoCount > 0 && (<Tooltip text={`${task.pomoCount} sesiones Pomodoro`}><div className="flex items-center text-sm"><span role="img" aria-label="tomato" className="mr-1">🍅</span><span>{task.pomoCount}</span></div></Tooltip>)}
                    <Tooltip text={subtasksExpanded ? "Ocultar subtareas" : "Mostrar subtareas"}><button aria-label={subtasksExpanded ? `Ocultar subtareas de ${task.name}` : `Mostrar subtareas de ${task.name}`} onClick={(e) => { e.stopPropagation(); setSubtasksExpanded(!subtasksExpanded); }} className="text-gray-500 dark:text-gray-400 hover:text-indigo-500"><ListTree size={18} /></button></Tooltip>
                    <Tooltip text="Eliminar Tarea"><button aria-label={`Eliminar tarea ${task.name}`} onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-500 dark:text-gray-400 hover:text-red-500 opacity-50 hover:opacity-100"><Trash2 size={18} /></button></Tooltip>
                </div>
            </div>
            {task.dueDate && (<div className="text-right text-xs mt-1 pr-8"><span className={daysRemaining.color}>{daysRemaining.text}</span></div>)}
            {notesExpanded && task.notes && (<div className="mt-2 pt-2 border-t border-pink-300 dark:border-pink-700"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.notes}</p></div>)}
            
            {subtasksExpanded && (
                <div className="mt-3 pt-3 pl-6 border-t border-pink-300/50 dark:border-pink-700/50 space-y-2">
                    {totalSubtasks > 0 && (
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>Progreso</span>
                                <span>{completedSubtasks} de {totalSubtasks}</span>
                            </div>
                            <div className="w-full bg-pink-100 dark:bg-pink-900/50 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                        </div>
                    )}
                    {task.subtasks?.map(subtask => (
                        <li key={subtask.id} className="flex items-center justify-between group list-none">
                             <div className="flex items-center flex-grow">
                                <input type="checkbox" checked={subtask.completed} onChange={(e) => {e.stopPropagation(); onToggleSubtask(task.id, subtask.id, !subtask.completed)}} className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                                <span className={`ml-2 text-sm ${subtask.completed ? 'line-through text-gray-500' : ''}`}>{subtask.name}</span>
                            </div>
                            <button aria-label={`Eliminar subtarea ${subtask.name}`} onClick={(e) => {e.stopPropagation(); onDeleteSubtask(task.id, subtask.id)}} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                        </li>
                    ))}
                    <form onSubmit={handleAddSubtaskSubmit} className="flex items-center space-x-2 pt-2">
                        <input type="text" value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Añadir nueva subtarea..." className="w-full text-sm px-2 py-1 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500"/>
                        <button aria-label="Añadir subtarea" type="submit" className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"><Plus size={16} /></button>
                    </form>
                </div>
            )}
        </li>
    );
};

export default TaskItem;
