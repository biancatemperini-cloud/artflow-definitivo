import React from 'react';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';

const DailyTaskItem = ({ task, onToggle, onDelete }) => {
    return (
        <div className="flex items-center p-3 rounded-lg bg-white dark:bg-gray-700 shadow-sm group">
            <button
                onClick={() => onToggle(task.id, !task.completed)}
                aria-label={`Marcar tarea ${task.text}`}
                className="flex-shrink-0 mr-3"
            >
                {task.completed 
                    ? <CheckCircle size={20} className="text-green-500" /> 
                    : <Circle size={20} className="text-gray-300 dark:text-gray-500 group-hover:text-green-400 transition-colors" />
                }
            </button>
            <span className={`flex-grow text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                {task.text}
            </span>
            <button
                onClick={() => onDelete(task.id)}
                className="ml-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Eliminar tarea ${task.text}`}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export default DailyTaskItem;
