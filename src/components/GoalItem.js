import React from 'react';
import { CheckCircle, Circle, Edit2 } from 'lucide-react';

const GoalItem = ({ goal, onToggle, onEdit }) => {
    return (
        <div className="flex items-center p-3 group">
            <button
                onClick={() => onToggle(goal.id, !goal.completed)}
                aria-label={`Marcar meta ${goal.text}`}
                className="flex-shrink-0 mr-4"
            >
                {goal.completed 
                    ? <CheckCircle size={22} className="text-green-500" /> 
                    : <Circle size={22} className="text-gray-300 dark:text-gray-600 group-hover:text-green-400 transition-colors" />
                }
            </button>
            <span className={`flex-grow ${goal.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                {goal.text}
            </span>
            <button 
                onClick={() => onEdit(goal)}
                className="ml-4 text-gray-400 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Editar meta ${goal.text}`}
            >
                <Edit2 size={16} />
            </button>
        </div>
    );
};

export default GoalItem;
