import React, { useState } from 'react';
import { Plus, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import DailyTaskItem from './DailyTaskItem';

const CollapsibleProject = ({ project, tasks, onTaskDragStart }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-4 bg-white/50 dark:bg-gray-700/30 rounded-lg p-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left font-semibold text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600/50"
            >
                <span>{project.name}</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <ul className="space-y-2 mt-2">
                    {(tasks || []).map(task => (
                        <li 
                            key={task.id} 
                            draggable="true" 
                            onDragStart={(e) => onTaskDragStart(e, task)} 
                            className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-700 cursor-grab active:cursor-grabbing shadow-sm"
                        >
                            <GripVertical size={16} className="text-gray-400" />
                            <span className="text-sm">{task.name}</span>
                        </li>
                    ))}
                    {(tasks || []).length === 0 && <p className="px-2 py-1 text-xs text-gray-500">No hay tareas pendientes.</p>}
                </ul>
            )}
        </div>
    );
};

const PlannerView = ({ 
    projects, 
    allTasks = [], 
    dailyTasks = [], // 👈 **AQUÍ ESTÁ LA CORRECCIÓN**
    onDropTask, 
    onAddDailyTask, 
    onToggleDailyTask, 
    onDeleteDailyTask,
    onTaskDragStart
}) => {
    const [newTaskToday, setNewTaskToday] = useState('');
    const [newTaskTomorrow, setNewTaskTomorrow] = useState('');

    const handleAddTask = (text, column) => {
        if (!text.trim() || !onAddDailyTask) return;
        onAddDailyTask({ text, completed: false, column });
        if (column === 'today') setNewTaskToday('');
        if (column === 'tomorrow') setNewTaskTomorrow('');
    };

    const handleDrop = (e, column) => {
        e.preventDefault();
        if (!onDropTask) return;
        const taskData = JSON.parse(e.dataTransfer.getData("task"));
        onDropTask(taskData, column);
    };

    const todayTasks = dailyTasks.filter(t => t.column === 'today');
    const tomorrowTasks = dailyTasks.filter(t => t.column === 'tomorrow');

    return (
        <div className="grid grid-cols-12 gap-6 h-full">
            <div className="col-span-12 lg:col-span-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-lg flex flex-col h-full">
                <h3 className="text-lg font-bold mb-4 px-2 flex-shrink-0">Arrastra desde tus Proyectos</h3>
                <div className="flex-grow overflow-y-auto pr-2 min-h-0">
                    {(projects || []).map(project => (
                        <CollapsibleProject
                            key={project.id}
                            project={project}
                            tasks={allTasks.filter(t => t.projectId === project.id && !t.completed)}
                            onTaskDragStart={onTaskDragStart}
                        />
                    ))}
                </div>
            </div>
            <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div 
                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-lg flex flex-col h-full"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'today')}
                >
                    <h3 className="text-lg font-bold mb-4 flex-shrink-0">Hoy</h3>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-2 min-h-0">
                        {todayTasks.map(task => <DailyTaskItem key={task.id} task={task} onToggle={onToggleDailyTask} onDelete={onDeleteDailyTask} />)}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddTask(newTaskToday, 'today'); }} className="flex items-center gap-2 mt-4 flex-shrink-0">
                        <input value={newTaskToday} onChange={(e) => setNewTaskToday(e.target.value)} type="text" placeholder="Nueva tarea para hoy..." className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        <button type="submit" className="p-2 bg-violet-500 text-white rounded-full hover:bg-violet-600"><Plus size={18} /></button>
                    </form>
                </div>
                <div 
                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-lg flex flex-col h-full"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'tomorrow')}
                >
                    <h3 className="text-lg font-bold mb-4 flex-shrink-0">Mañana</h3>
                     <div className="flex-grow overflow-y-auto pr-2 space-y-2 min-h-0">
                        {tomorrowTasks.map(task => <DailyTaskItem key={task.id} task={task} onToggle={onToggleDailyTask} onDelete={onDeleteDailyTask} />)}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddTask(newTaskTomorrow, 'tomorrow'); }} className="flex items-center gap-2 mt-4 flex-shrink-0">
                        <input value={newTaskTomorrow} onChange={(e) => setNewTaskTomorrow(e.target.value)} type="text" placeholder="Nueva tarea para mañana..." className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-700/80 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        <button type="submit" className="p-2 bg-violet-500 text-white rounded-full hover:bg-violet-600"><Plus size={18} /></button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PlannerView;
