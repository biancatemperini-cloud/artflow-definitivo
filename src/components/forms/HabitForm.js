// src/components/forms/HabitForm.js
import React, { useState, useEffect } from 'react';

const daysOfWeek = [
    { id: 'Sun', name: 'D' }, { id: 'Mon', name: 'L' }, { id: 'Tue', name: 'M' },
    { id: 'Wed', name: 'X' }, { id: 'Thu', name: 'J' }, { id: 'Fri', name: 'V' },
    { id: 'Sat', name: 'S' }
];

const HabitForm = ({ onSubmit, habit, onDelete }) => {
    const [name, setName] = useState('');
    const [frequency, setFrequency] = useState([]);

    useEffect(() => {
        if (habit) {
            setName(habit.name);
            setFrequency(habit.frequency || []);
        } else {
            setName('');
            setFrequency(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']); // Por defecto todos los días
        }
    }, [habit]);

    const handleFrequencyToggle = (dayId) => {
        setFrequency(prev =>
            prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || frequency.length === 0) return;
        onSubmit({ name, frequency });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="habit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Hábito</label>
                <input
                    id="habit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Leer 15 minutos"
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Frecuencia</label>
                <div className="mt-2 flex justify-around bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                    {daysOfWeek.map(day => (
                        <button
                            type="button"
                            key={day.id}
                            onClick={() => handleFrequencyToggle(day.id)}
                            className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${frequency.includes(day.id)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-transparent hover:bg-indigo-200 dark:hover:bg-indigo-500/50'
                                }`}
                        >
                            {day.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-4">
                {habit && onDelete && (
                    <button type="button" onClick={() => onDelete(habit.id)} className="px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50">
                        Eliminar
                    </button>
                )}
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                    {habit ? 'Guardar Cambios' : 'Crear Hábito'}
                </button>
            </div>
        </form>
    );
};

export default HabitForm;