import React, { useState } from 'react';
import { BrainCircuit, Trash2, CheckCircle2, FolderPlus } from 'lucide-react';
import Tooltip from './Tooltip';

const BrainDumpView = ({ items = [], onAddItem, onDeleteItem, onConvertToTask, onConvertToProject }) => {
    const [newItemText, setNewItemText] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (newItemText.trim() && onAddItem) {
            onAddItem(newItemText);
            setNewItemText('');
        }
    };

    const colorClasses = ['post-it-pink', 'post-it-blue', 'post-it-violet'];
    const rotations = ['-2deg', '1deg', '3deg', '-1.5deg', '2.5deg'];

    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <div className="text-center mb-6">
                <BrainCircuit className="mx-auto h-10 w-10 text-indigo-500" />
                <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">Cerebro</h3>
                <p className="text-gray-600 dark:text-gray-400">Un lugar para tus ideas fugaces y recordatorios.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
                <input 
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Escribe una idea rápida..."
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">
                    Añadir
                </button>
            </form>

            {items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {items.map((item, index) => {
                        const colorClass = colorClasses[index % colorClasses.length];
                        const rotation = rotations[index % rotations.length];
                        return (
                            <div 
                                key={item.id}
                                className="post-it-wrapper"
                                style={{ transform: `rotate(${rotation})` }}
                            >
                                <div className={`post-it ${colorClass}`}>
                                    <p className="flex-grow text-lg break-words min-h-[80px]">{item.text}</p>
                                    <div className="flex justify-end gap-2 mt-auto">
                                        <Tooltip text="Eliminar">
                                            <button onClick={() => onDeleteItem && onDeleteItem(item.id)} className="p-1.5 text-red-500 hover:text-red-700">
                                                <Trash2 size={18} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Convertir a Proyecto">
                                            <button onClick={() => onConvertToProject && onConvertToProject(item)} className="p-1.5 text-purple-600 hover:text-purple-800">
                                                <FolderPlus size={18} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Convertir a Tarea">
                                            <button onClick={() => onConvertToTask && onConvertToTask(item)} className="p-1.5 text-green-600 hover:text-green-800">
                                                <CheckCircle2 size={18} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                    <BrainCircuit size={32} className="mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Tu cerebro está despejado. ¡Añade tu primera idea!</p>
                </div>
            )}
        </div>
    );
};

export default BrainDumpView;

