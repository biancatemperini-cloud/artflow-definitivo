import React from 'react';
import { Flame, Pencil } from 'lucide-react'; // Importar Pencil

// Pequeña función para saber si un hábito ya se completó hoy
const isCompletedToday = (lastCompleted) => {
    if (!lastCompleted) return false;
    const today = new Date();
    const completedDate = new Date(lastCompleted.seconds * 1000);
    return today.toDateString() === completedDate.toDateString();
};

const HabitItem = ({ habit, onToggle, onEdit }) => { // Añadir onEdit
    const completed = isCompletedToday(habit.lastCompleted);

    return (
        <div className={`group flex items-center p-3 rounded-lg transition-colors duration-300 ${completed ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
            <button
                onClick={() => onToggle(habit, completed)}
                aria-label={`Marcar hábito ${habit.name}`}
                className={`w-8 h-8 rounded-full border-2 flex-shrink-0 mr-4 flex items-center justify-center transition-all duration-300
                    ${completed ? 'bg-green-500 border-green-600 text-white' : 'border-gray-300 dark:border-gray-500 hover:bg-green-200'}`}
            >
                <Flame size={16} className={completed ? 'fill-current' : ''} />
            </button>
            <div className="flex-grow">
                <p className={`font-semibold ${completed ? 'line-through text-gray-500' : ''}`}>{habit.name}</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
                    <span>Racha actual: <strong className="text-orange-500">{habit.currentStreak || 0} 🔥</strong></span>
                    <span>Racha máxima: <strong className="text-purple-500">{habit.longestStreak || 0} 🚀</strong></span>
                </div>
            </div>
             {/* --- BOTÓN DE EDICIÓN --- */}
            <button
                onClick={() => onEdit(habit)}
                aria-label={`Editar hábito ${habit.name}`}
                className="ml-2 p-2 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
            >
                <Pencil size={16} />
            </button>
        </div>
    );
};

export default HabitItem;
