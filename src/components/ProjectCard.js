import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Edit2, Trash2, GripVertical, Save } from 'lucide-react';
import Tooltip from './Tooltip';

const ProjectObjectives = ({ project, onAddObjective, onToggleObjective, onDeleteObjective }) => {
    // ... (código sin cambios)
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
                    {/* --- NUEVO BOTÓN --- */}
                    <Tooltip text="Guardar como Plantilla"><button aria-label={`Guardar proyecto ${project.name} como plantilla`} onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(project.id); }} className="text-gray-400 hover:text-green-500"><Save size={16} /></button></Tooltip>
                    
                    <Tooltip text="Editar Proyecto"><button aria-label={`Editar proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); onEdit(project); }} className="text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button></Tooltip>
                    <Tooltip text="Eliminar Proyecto"><button aria-label={`Eliminar proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></Tooltip>
                    <Tooltip text={isExpanded ? "Contraer" : "Expandir"}><button aria-label={isExpanded ? `Contraer detalles del proyecto ${project.name}` : `Expandir detalles del proyecto ${project.name}`} onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button></Tooltip>
                </div>
            </div>
            {isExpanded && (
                // ... (código del panel expandido sin cambios)
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
