import React from 'react';
import { Target, Flame, PlusCircle, Star } from 'lucide-react';
import HabitItem from './HabitItem';
import GoalItem from './GoalItem';
import WelcomeBanner from './WelcomeBanner';
import HomeMissionsWidget from './HomeMissionsWidget'; // Importamos el nuevo widget

const getDaysRemaining = (dueDate) => {
    if (!dueDate) return { text: '', color: 'text-gray-400' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.seconds * 1000);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Atrasado por ${Math.abs(diffDays)} días`, color: 'text-red-500 font-semibold' };
    if (diffDays === 0) return { text: 'Vence hoy', color: 'text-orange-500 font-bold' };
    if (diffDays === 1) return { text: 'Vence mañana', color: 'text-blue-500 font-semibold' };
    return { text: `Vence en ${diffDays} días`, color: 'text-pink-500' };
};

const DashboardView = ({ 
    tasks, 
    activeProjectName, 
    habits,
    onToggleHabit,
    onManageHabits,
    onEditHabit,
    annualGoals,
    onToggleGoal,
    onManageGoals,
    showWelcomeBanner,
    welcomeMessage,
    onDismissWelcome,
    homeMissions,
    onCompleteHomeMission
}) => {
    const focusTasks = tasks
        .filter(t => !t.completed)
        .sort((a, b) => {
            const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return (a.dueDate?.seconds || Infinity) - (b.dueDate?.seconds || Infinity);
        })
        .slice(0, 3);
        
    return (
        <div className="space-y-6">
            {showWelcomeBanner && <WelcomeBanner message={welcomeMessage} onDismiss={onDismissWelcome} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-pink-100 to-violet-200 dark:from-pink-900/50 dark:to-violet-900/50 p-6 rounded-2xl shadow-2xl shadow-violet-400/80 dark:shadow-violet-800/40">
                    <h3 className="flex items-center text-xl font-bold mb-4 text-gray-800 dark:text-white"><Target className="mr-2" /> Foco del Día</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Tus próximas tareas para: <span className="font-bold">{activeProjectName || "ningún proyecto"}</span></p>
                    {focusTasks.length > 0 ? (
                        <ul className="space-y-3">
                            {focusTasks.map(task => (
                                <li key={task.id} className="flex items-center p-3 bg-white/70 dark:bg-gray-800/50 rounded-lg">
                                    <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{task.name}</span>
                                    {task.dueDate && <span className={`text-xs font-semibold ${getDaysRemaining(task.dueDate).color}`}>{getDaysRemaining(task.dueDate).text}</span>}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center py-4 text-gray-700 dark:text-gray-300">¡Todo listo por aquí!</p>}
                </div>

                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="flex items-center text-xl font-bold"><Flame className="mr-2 text-orange-500" /> Hábitos de Hoy</h3>
                        <button onClick={onManageHabits} className="flex items-center text-sm font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200">
                            <PlusCircle size={18} className="mr-1" />
                            Gestionar
                        </button>
                    </div>
                    <div className="flex-grow">
                        {habits.length > 0 ? (
                            <ul className="space-y-3">
                                {habits.map(habit => (
                                    <HabitItem key={habit.id} habit={habit} onToggle={onToggleHabit} onEdit={onEditHabit} />
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center h-full flex flex-col justify-center items-center py-4">
                                <p className="font-semibold">Define tus hábitos diarios.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {homeMissions && homeMissions.length > 0 && (
                 <HomeMissionsWidget 
                    missions={homeMissions} 
                    onCompleteMission={onCompleteHomeMission} 
                 />
            )}

            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-xl font-bold"><Star className="mr-2 text-yellow-400" /> Metas Anuales</h3>
                    <button onClick={() => onManageGoals()} className="flex items-center text-sm font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200">
                        <PlusCircle size={18} className="mr-1" />
                        Gestionar Metas
                    </button>
                </div>
                <div className="space-y-1">
                    {annualGoals.length > 0 ? (
                        annualGoals.map(goal => (
                            <GoalItem 
                                key={goal.id}
                                goal={goal}
                                onToggle={onToggleGoal}
                                onEdit={() => onManageGoals(goal)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-6">
                            <p className="font-semibold">Define tus grandes metas para este año.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">¿Qué quieres lograr en tu viaje creativo?</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
