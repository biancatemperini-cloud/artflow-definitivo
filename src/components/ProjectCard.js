import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Edit2, Trash2, GripVertical, Save } from 'lucide-react';
import Tooltip from './Tooltip';

const ProjectObjectives = ({ project, onAddObjective, onToggleObjective, onDeleteObjective }) => {
    // Esta parte se mantiene igual, la incluyo para que el componente esté completo.
    const [newObjective, setNewObjective] = useState('');
    const handleObjectiveSubmit = (e) => {
        e.preventDefault();
        if (newObjective.trim() && onAddObjective) {
            onAddObjective(project.id, newObjective);
            setNewObjective('');
        }
    };
    return (
        <div>
            <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300 flex items-center"><Trophy size={16} className="mr-2 text-amber-500" /> Objetivos del Proyecto</h4>
            <div className="space-y-1">
                {(project.objectives || []).map((obj, index) => (
                    <div key={index} className="flex items-center group">
                        <input type="checkbox" checked={obj.completed} onChange={() => onToggleObjective && onToggleObjective(project.id, index)} className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
                        <span className={`ml-2 text-sm ${obj.completed ? 'line-through text-gray-500' : ''}`}>{obj.text}</span>
                        <button onClick={() => onDeleteObjective && onDeleteObjective(project.id, index)} className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
            <form onSubmit={handleObjectiveSubmit} className="flex items-center space-x-2 mt-2">
                <input value={newObjective} onChange={(e) => setNewObjective(e.target.value)} type="text" placeholder="Añadir un objetivo..." className="w-full text-sm px-2 py-1 bg-white/50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500"/>
            </form>
        </div>
    );
};


const ProjectCard = ({ project, onSelect, onDelete, onEdit, onSaveAsTemplate, activeProjectId, progress, completedTasks, totalTasks, onDragStart, onDrop, isDragging, onAddObjective, onToggleObjective, onDeleteObjective }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <li 
            draggable="true"
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl shadow-lg transition-all duration-300 mb-4 border-l-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${activeProjectId === project.id ? 'border-pink-500' : 'border-pink-200'} ${isDragging ? 'opacity-50' : ''}`}
        >
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center flex-1 min-w-0" >
                   <span className="cursor-grab text-gray-400 mr-2" onMouseDown={(e) => e.stopPropagation()}><GripVertical size={20}/></span>
                   <h3 className="font-bold text-lg cursor-pointer card-text-wrap" onClick={() => onSelect(project)}>{project.name}</h3>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <Tooltip text="Guardar como Plantilla"><button aria-label={`Guardar proyecto ${project.name} como plantilla`} onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(project.id); }} className="text-gray-400 hover:text-green-500"><Save size={16} /></button></Tooltip>
                    
                    <Tooltip text="Editar Proyecto"><button aria-label={`Editar proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button></Tooltip>
                    <Tooltip text="Eliminar Proyecto"><button aria-label={`Eliminar proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></Tooltip>
                    <Tooltip text={isExpanded ? "Contraer" : "Expandir"}><button aria-label={isExpanded ? `Contraer detalles del proyecto ${project.name}` : `Expandir detalles del proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></Tooltip>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-3">
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words">{project.description || "Sin descripción."}</p>
                     {totalTasks > 0 && (
                         <div className="mb-4">
                             <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                 <span>Progreso del Proyecto</span>
                                 <span>{completedTasks} de {totalTasks} tareas ({Math.round(progress)}%)</span>
                             </div>
                             <div className="w-full bg-pink-100 dark:bg-pink-900/50 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div></div>
                         </div>
                     )}
                     <ProjectObjectives 
                         project={project}
                         onAddObjective={onAddObjective}
                         onToggleObjective={onToggleObjective}
                         onDeleteObjective={onDeleteObjective}
                     />
                 </div>
            )}
        </li>
    );
};

export default ProjectCard;