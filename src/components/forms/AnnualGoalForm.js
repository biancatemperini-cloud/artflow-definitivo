import React, { useState, useEffect } from 'react';

const AnnualGoalForm = ({ onSubmit, goal }) => {
    const [text, setText] = useState('');

    useEffect(() => {
        if (goal) {
            setText(goal.text);
        } else {
            setText('');
        }
    }, [goal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSubmit({ text });
        setText('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="goal-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tu Meta para este Año
                </label>
                <input
                    id="goal-text"
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ej: Completar mi primera serie de retratos"
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500"
                    required
                    autoFocus
                />
            </div>
            <div className="flex justify-end">
                <button 
                    type="submit" 
                    className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700"
                >
                    {goal ? 'Guardar Cambios' : 'Añadir Meta'}
                </button>
            </div>
        </form>
    );
};

export default AnnualGoalForm;

