import React from 'react';
import { Home, CheckCircle2 } from 'lucide-react';
import Tooltip from './Tooltip';

const HomeMissionItem = ({ mission, onComplete }) => {
    return (
        <div className={`flex items-center p-3 rounded-lg transition-all duration-300 ${mission.completed ? 'bg-green-50 dark:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
            <span className="text-2xl mr-3">{mission.icon}</span>
            <div className="flex-grow">
                <p className={`font-semibold text-sm ${mission.completed ? 'line-through text-gray-500' : ''}`}>{mission.name}</p>
                {mission.type === 'weekly' && (
                    <span className="text-xs text-purple-500 font-semibold">Misión Semanal</span>
                )}
            </div>
            {!mission.completed && (
                <Tooltip text="¡Misión Cumplida!">
                    <button 
                        onClick={() => onComplete(mission)} 
                        className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transform hover:scale-110 transition-transform"
                    >
                        <CheckCircle2 size={18} />
                    </button>
                </Tooltip>
            )}
        </div>
    );
};


const HomeMissionsWidget = ({ missions, onCompleteMission }) => {
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <h3 className="flex items-center text-xl font-bold mb-4"><Home className="mr-2 text-pink-500" /> Misiones del Hogar</h3>
            {missions.length > 0 ? (
                <div className="space-y-2">
                    {missions.map(mission => (
                        <HomeMissionItem key={mission.id} mission={mission} onComplete={onCompleteMission} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <p>¡Todas las misiones del hogar por hoy están completas!</p>
                </div>
            )}
        </div>
    );
};

export default HomeMissionsWidget;
