import React, { useState, useMemo, useEffect } from 'react';
import { onSnapshot, query, where, setDoc, deleteDoc, collection, doc, addDoc, writeBatch, getDocs, Timestamp, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import { ChevronLeft, ChevronRight, Calendar, List, Columns, PlusCircle, Trash2, Edit2, Repeat, CalendarPlus, Star, CheckCircle, Circle } from 'lucide-react';

// --- Helpers de Fecha ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    d.setHours(0, 0, 0, 0);
    return new Date(d.setDate(diff));
};
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
const dateToYMD = (date) => date.toISOString().split('T')[0];

const EventItem = ({ event, onEdit, onDelete, labels }) => {
    const label = labels.find(l => l.id === event.labelId);
    const bgColor = label ? label.colorClass : 'bg-blue-100 dark:bg-blue-900/40';
    return (
        <div className={`flex items-center justify-between p-2 rounded-lg ${bgColor}`}>
            <div className="flex items-center gap-2">
                {event.recurrence && <Repeat size={12} className="text-gray-500" />}
                <span className="text-sm">{event.title}</span>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(event)} className="text-gray-500 hover:text-violet-600"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(event)} className="text-gray-500 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
        </div>
    );
};

const MonthView = ({ currentDate, calculatedEventsByDate, handleDayClick, isToday, labels }) => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    return (
        <div className="grid grid-cols-7 gap-1 text-center">
            {days.map(day => <div key={day} className="font-bold text-sm text-gray-500 dark:text-gray-400 py-2">{day}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
            {Array.from({ length: daysInMonth }).map((_, day) => {
                const dayNumber = day + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                const dateId = dateToYMD(date);
                const today = isToday(date);
                const dayEvents = calculatedEventsByDate[dateId] || [];
                
                return (
                    <div key={dayNumber} onClick={() => handleDayClick(date)} className={`relative min-h-[140px] border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${today ? 'bg-violet-50 dark:bg-violet-900/40' : ''}`}>
                        <span className={`font-semibold text-center text-sm ${today ? 'text-violet-600' : ''}`}>{dayNumber}</span>
                        <div className="mt-1 space-y-1 overflow-hidden flex-grow">
                            {dayEvents.slice(0, 2).map(event => {
                                const label = labels.find(l => l.id === event.labelId);
                                const bgColor = label ? label.colorClass : (event.type === 'task' ? 'bg-pink-100 dark:bg-pink-900/40' : 'bg-gray-100 dark:bg-gray-600');
                                return (
                                    <div key={event.id + event.instanceDate} className={`px-1.5 py-0.5 rounded-md text-xs text-left ${bgColor} text-gray-800 dark:text-gray-200 truncate`}>
                                        {event.type === 'task' ? event.name : event.title}
                                    </div>
                                );
                            })}
                            {dayEvents.length > 2 && (
                                <div className="text-xs text-gray-500 text-center mt-1">+ {dayEvents.length - 2} más...</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const WeekView = ({ currentDate, calculatedEventsByDate, isToday, handleDayClick, labels }) => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));
    const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-7 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 md:divide-x md:divide-pink-200 md:dark:divide-pink-900/40">
            {days.map((day, i) => {
                const dateStr = dateToYMD(day);
                const today = isToday(day);
                const items = calculatedEventsByDate[dateStr] || [];
                return (
                    <div key={dateStr} onClick={() => handleDayClick(day)} className={`p-3 min-h-[200px] flex flex-col cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 ${today ? 'bg-violet-50 dark:bg-violet-900/40' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                        <div>
                            <p className={`font-bold text-center text-sm ${today ? 'text-violet-600' : ''}`}>{dayNames[i]} <span className="text-gray-500 font-normal">{day.getDate()}</span></p>
                        </div>
                        <ul className="mt-2 space-y-2 flex-grow">
                            {items.map(item => {
                                const label = item.type === 'event' ? labels.find(l => l.id === item.labelId) : null;
                                const bgColor = label ? label.colorClass : 'bg-pink-50 dark:bg-pink-900/40';
                                return (
                                    <li key={`${item.id}-${item.instanceDate}`} className={`text-xs p-2 rounded shadow-sm ${bgColor}`}>
                                        {item.type === 'task' ? item.name : item.title}
                                    </li>
                                );
                            })}
                            {items.length === 0 && <div className="text-xs text-center text-gray-400 pt-8">Sin actividades</div>}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
};

const AgendaView = ({ calculatedEvents, handleDayClick, labels }) => {
    const groupedItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = calculatedEvents
            .filter(item => item.date >= today)
            .sort((a,b) => a.date - b.date);

        return upcoming.reduce((acc, item) => {
            const dateId = dateToYMD(item.date);
            if (!acc[dateId]) {
                acc[dateId] = {
                    displayDate: item.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    dateObject: item.date,
                    items: []
                };
            }
            acc[dateId].items.push(item);
            return acc;
        }, {});
    }, [calculatedEvents]);

    return (
        <div className="space-y-6">
            {Object.keys(groupedItems).length > 0 ? Object.entries(groupedItems).map(([dateId, group]) => (
                <div key={dateId}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-pink-200 dark:border-pink-900/40">
                        <h4 className="font-bold text-lg uppercase text-gray-800 dark:text-gray-200">{group.displayDate}</h4>
                        <button onClick={() => handleDayClick(group.dateObject)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={`Editar día ${group.displayDate}`}>
                            <CalendarPlus size={16} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {group.items.map(item => {
                             const label = item.type === 'event' ? labels.find(l => l.id === item.labelId) : null;
                             const bgColor = label ? label.colorClass : 'bg-pink-50 dark:bg-pink-900/40';
                             return (
                                <li key={`${item.id}-${item.instanceDate}`} className={`flex items-center p-3 rounded-lg shadow-sm ${bgColor}`}>
                                    <span className={`w-2 h-2 rounded-full mr-3 ${item.type === 'task' ? (item.completed ? 'bg-green-500' : 'bg-pink-500') : 'bg-blue-500'}`}></span>
                                    <span className={`${item.type === 'task' && item.completed ? 'line-through text-gray-500' : ''}`}>
                                        {item.type === 'task' ? item.name : item.title}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )) : <p className="text-center py-8">No hay tareas o actividades futuras programadas.</p>}
        </div>
    );
};

const CalendarView = ({ userId, tasks, db, appId, getMonthId }) => {
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [notes, setNotes] = useState({});
    const [events, setEvents] = useState([]);
    const [eventExceptions, setEventExceptions] = useState([]);
    const [monthlyGoals, setMonthlyGoals] = useState([]);
    const [eventLabels, setEventLabels] = useState([]);
    const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [currentNote, setCurrentNote] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventRecurrence, setEventRecurrence] = useState([]);
    const [selectedLabel, setSelectedLabel] = useState('');
    const [recurrenceActionTarget, setRecurrenceActionTarget] = useState(null);
    const [editingGoal, setEditingGoal] = useState(null);
    const [goalText, setGoalText] = useState('');

    const monthId = getMonthId(currentDate);
    const isToday = (date) => new Date().toDateString() === date.toDateString();

    const calculatedEvents = useMemo(() => {
        const instances = [];
        const exceptionsByParentId = eventExceptions.reduce((acc, ex) => {
            if (!acc[ex.parentId]) acc[ex.parentId] = {};
            acc[ex.parentId][ex.date] = ex;
            return acc;
        }, {});
        const endOfView = view === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) : addDays(getStartOfWeek(currentDate), 80);
        events.forEach(event => {
            if (!event.startDate) { console.warn("Skipping event with missing startDate:", event.id); return; }
            if (event.recurrence && event.recurrence.days?.length > 0) {
                let current = new Date(event.startDate.seconds * 1000);
                while (current <= endOfView) {
                    const dayOfWeek = current.getDay();
                    const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
                    if (event.recurrence.days.includes(dayStr)) {
                        const dateId = dateToYMD(current);
                        const exception = exceptionsByParentId[event.id]?.[dateId];
                        if (!exception || !exception.deleted) {
                            instances.push({ ...event, id: exception?.id || event.id, title: exception?.title || event.title, date: current, instanceDate: dateId, type: 'event', originalId: event.id });
                        }
                    }
                    current = addDays(current, 1);
                }
            } else { instances.push({ ...event, date: new Date(event.startDate.seconds * 1000), instanceDate: dateToYMD(new Date(event.startDate.seconds * 1000)), type: 'event' }); }
        });
        const allTasks = tasks.map(t => t.dueDate ? ({ ...t, date: new Date(t.dueDate.seconds * 1000), instanceDate: dateToYMD(new Date(t.dueDate.seconds * 1000)), type: 'task' }) : null).filter(Boolean);
        return [...instances, ...allTasks];
    }, [events, eventExceptions, tasks, currentDate, view]);

    const calculatedEventsByDate = useMemo(() => {
        return calculatedEvents.reduce((acc, item) => {
            const dateStr = item.instanceDate;
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(item);
            return acc;
        }, {});
    }, [calculatedEvents]);

    useEffect(() => {
        if (!userId) return;
        const notesRef = collection(db, `/artifacts/${appId}/users/${userId}/calendarNotes`);
        const qNotes = query(notesRef, where('monthId', '==', monthId));
        const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
            const newNotes = {};
            snapshot.forEach(doc => { newNotes[doc.id] = doc.data().note; });
            setNotes(newNotes);
        });

        const eventsRef = collection(db, `/artifacts/${appId}/users/${userId}/calendarEvents`);
        const unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const exceptionsRef = collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`);
        const unsubscribeExceptions = onSnapshot(exceptionsRef, (snapshot) => setEventExceptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const goalsRef = collection(db, `/artifacts/${appId}/users/${userId}/monthlyGoals`);
        const qGoals = query(goalsRef, where('monthId', '==', monthId));
        const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => setMonthlyGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const labelsRef = collection(db, `/artifacts/${appId}/users/${userId}/eventLabels`);
        const unsubscribeLabels = onSnapshot(labelsRef, (snapshot) => {
            if (snapshot.empty) {
                const defaultLabels = [
                    { name: 'Trabajo', colorClass: 'bg-blue-100 dark:bg-blue-900/40' },
                    { name: 'Personal', colorClass: 'bg-green-100 dark:bg-green-900/40' },
                    { name: 'Importante', colorClass: 'bg-red-100 dark:bg-red-900/40' },
                ];
                const batch = writeBatch(db);
                defaultLabels.forEach(label => {
                    const newLabelRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/eventLabels`));
                    batch.set(newLabelRef, label);
                });
                batch.commit();
            } else {
                setEventLabels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        });

        return () => { unsubscribeNotes(); unsubscribeEvents(); unsubscribeExceptions(); unsubscribeGoals(); unsubscribeLabels(); };
    }, [userId, monthId, db, appId]);
    
    const handleDayClick = (date) => {
        const dateId = dateToYMD(date);
        setSelectedDate(dateId);
        setCurrentNote(notes[dateId] || '');
        setIsDayDetailModalOpen(true);
    };

    const handleSaveNote = async () => {
        if (!userId || !selectedDate) return;
        const noteRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarNotes`, selectedDate);
        if (currentNote.trim()) {
            await setDoc(noteRef, { monthId, note: currentNote });
        } else {
            await deleteDoc(noteRef);
        }
        setIsDayDetailModalOpen(false);
    };
    
    const handleOpenEventModal = (event = null) => {
        if (event) {
            setEditingEvent(event);
            setEventTitle(event.title);
            setEventRecurrence(event.recurrence?.days || []);
            setSelectedLabel(event.labelId || '');
        } else {
            setEditingEvent(null);
            setEventTitle('');
            setEventRecurrence([]);
            setSelectedLabel(eventLabels[0]?.id || '');
        }
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (!userId || !selectedDate || !eventTitle.trim()) return;
        
        const eventData = { title: eventTitle, startDate: new Date(selectedDate + 'T00:00:00'), recurrence: eventRecurrence.length > 0 ? { type: 'weekly', days: eventRecurrence } : null, labelId: selectedLabel };

        if (editingEvent) {
            const originalId = editingEvent.originalId || editingEvent.id;
            const eventRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarEvents`, originalId);
            await updateDoc(eventRef, eventData);
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/calendarEvents`), eventData);
        }
        setIsEventModalOpen(false);
    };

    const handleDeleteEvent = (event) => {
        if (event.recurrence) {
            setRecurrenceActionTarget(event);
            setIsRecurrenceModalOpen(true);
        } else {
            if (!window.confirm("¿Seguro que quieres eliminar esta actividad?")) return;
            deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/calendarEvents`, event.id));
        }
    };
    
    const handleRecurrenceDelete = async (type) => {
        if (!userId || !recurrenceActionTarget) return;
        const { originalId, id, instanceDate } = recurrenceActionTarget;
        if (type === 'one') {
            const exceptionData = { parentId: originalId || id, date: instanceDate, deleted: true };
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`), exceptionData);
        } else if (type === 'all') {
            if (!window.confirm("¿Estás seguro? Esto eliminará el evento base y todas sus repeticiones.")) return;
            const batch = writeBatch(db);
            const parentId = originalId || id;
            const baseRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarEvents`, parentId);
            batch.delete(baseRef);
            const exceptionsQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`), where("parentId", "==", parentId));
            const exceptionsSnapshot = await getDocs(exceptionsQuery);
            exceptionsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        setIsRecurrenceModalOpen(false);
        setRecurrenceActionTarget(null);
    };

    const handleSaveGoal = async (e) => {
        e.preventDefault();
        if (!goalText.trim()) return;
        if (editingGoal) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/monthlyGoals`, editingGoal.id), { text: goalText });
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/monthlyGoals`), { text: goalText, monthId, completed: false, createdAt: Timestamp.now() });
        }
        setIsGoalModalOpen(false);
        setEditingGoal(null);
        setGoalText('');
    };
    
    const handleToggleGoal = async (goalId, completed) => {
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/monthlyGoals`, goalId), { completed });
    };

    const handleDeleteGoal = async (goalId) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta meta?")) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/monthlyGoals`, goalId));
    }

    const changeDate = (offset) => {
        if (view === 'month') { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)); } 
        else if (view === 'week') { setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + (offset * 7)))); }
     };

    const headerText = useMemo(() => {
        if (view === 'month') return currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        if (view === 'week') {
            const start = getStartOfWeek(currentDate);
            const end = addDays(start, 6);
            return `${start.toLocaleDateString('es-ES', {day:'numeric', month:'short'})} - ${end.toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'})}`;
        }
        return "Agenda de Tareas";
     }, [currentDate, view]);
    const viewButtons = [ { id: 'month', icon: Calendar, label: 'Mes' }, { id: 'week', icon: Columns, label: 'Semana' }, { id: 'agenda', icon: List, label: 'Agenda' } ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 rounded-2xl shadow-lg mb-6">
                 <div className="flex justify-between items-center">
                    <h3 className="flex items-center text-lg font-bold"><Star className="mr-2 text-yellow-400" /> Foco del Mes</h3>
                    <button onClick={() => { setEditingGoal(null); setGoalText(''); setIsGoalModalOpen(true); }} className="text-sm font-semibold text-violet-600 hover:text-violet-800">Gestionar</button>
                </div>
                {monthlyGoals.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                        {monthlyGoals.map(goal => (
                            <li key={goal.id} className="text-sm p-2 flex items-center group">
                                <button onClick={() => handleToggleGoal(goal.id, !goal.completed)} className="mr-2">{goal.completed ? <CheckCircle size={18} className="text-green-500"/> : <Circle size={18} className="text-gray-400"/>}</button>
                                <span className={goal.completed ? 'line-through text-gray-500' : ''}>{goal.text}</span>
                                <button onClick={() => { setEditingGoal(goal); setGoalText(goal.text); setIsGoalModalOpen(true); }} className="ml-auto text-gray-400 opacity-0 group-hover:opacity-100"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteGoal(goal.id)} className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-center py-2 text-gray-500">Define tus metas para este mes.</p>}
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        {view !== 'agenda' && (<>
                            <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeft size={20} /></button>
                            <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRight size={20} /></button>
                        </>)}
                        <h3 className="text-xl font-bold w-full sm:w-auto text-center">{headerText}</h3>
                    </div>
                    <div className="flex items-center bg-gray-200 dark:bg-gray-900 p-1 rounded-full">{viewButtons.map(b => (
                        <button key={b.id} onClick={() => setView(b.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${view === b.id ? 'bg-white dark:bg-gray-700 shadow' : 'text-gray-600 dark:text-gray-300'}`}>
                            <b.icon size={16} />{b.label}
                        </button>))}
                    </div>
                </div>

                {view === 'month' && <MonthView currentDate={currentDate} calculatedEventsByDate={calculatedEventsByDate} notes={notes} handleDayClick={handleDayClick} isToday={isToday} labels={eventLabels} />}
                {view === 'week' && <WeekView currentDate={currentDate} calculatedEventsByDate={calculatedEventsByDate} isToday={isToday} handleDayClick={handleDayClick} labels={eventLabels} />}
                {view === 'agenda' && <AgendaView calculatedEvents={calculatedEvents} handleDayClick={handleDayClick} labels={eventLabels} />}
            </div>
            
            <Modal isOpen={isDayDetailModalOpen} onClose={() => setIsDayDetailModalOpen(false)} title={`Detalles para ${selectedDate}`}>
                <div className="mb-4">
                    <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Tareas que vencen este día:</h4>
                    <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                        {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'task').map(task => <li key={task.id}>{task.name}</li>)}
                    </ul>
                    {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'task').length === 0 && <p className="text-sm text-gray-400">No hay tareas este día.</p>}
                </div>

                <div className="my-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Actividades:</h4>
                        <button onClick={() => handleOpenEventModal()} className="flex items-center gap-1 text-sm text-violet-600 font-semibold"><PlusCircle size={16} /> Añadir</button>
                    </div>
                    <div className="space-y-2">
                        {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'event').map(event => <EventItem key={`${event.id}-${event.instanceDate}`} event={event} onEdit={handleOpenEventModal} onDelete={handleDeleteEvent} labels={eventLabels} />)}
                        {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'event').length === 0 && <p className="text-sm text-gray-400">No hay actividades este día.</p>}
                    </div>
                </div>
                
                <div className="mt-4">
                    <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Notas:</h4>
                    <textarea value={currentNote} onChange={(e) => setCurrentNote(e.target.value)} placeholder="Escribe tu nota aquí..." className="w-full h-24 p-2 border rounded-md bg-white dark:bg-gray-700" />
                    <button onClick={handleSaveNote} className="mt-2 w-full py-2 px-4 bg-violet-600 text-white rounded-md hover:bg-violet-700">Guardar Nota</button>
                </div>
            </Modal>
            
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={editingEvent ? 'Editar Actividad' : 'Nueva Actividad'}>
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    <div>
                        <label>Título</label>
                        <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Etiqueta</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {eventLabels.map(label => (
                                <button key={label.id} type="button" onClick={() => setSelectedLabel(label.id)} className={`px-3 py-1 text-sm rounded-full border-2 ${selectedLabel === label.id ? 'border-violet-500 ring-2 ring-violet-200' : 'border-transparent'} ${label.colorClass}`}>
                                    {label.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label>Repetir semanalmente</label>
                        <div className="flex justify-around mt-2">
                            {dayNames.map(day => ( <button type="button" key={day} onClick={() => setEventRecurrence(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} className={`w-10 h-10 rounded-full font-semibold transition-colors ${eventRecurrence.includes(day) ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}> {day.charAt(0)} </button> ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full py-2 px-4 bg-violet-600 text-white rounded-md hover:bg-violet-700">Guardar</button>
                </form>
            </Modal>
            
            <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title={editingGoal ? "Editar Meta Mensual" : "Nueva Meta Mensual"}>
                <form onSubmit={handleSaveGoal} className="space-y-4">
                     <input value={goalText} onChange={e => setGoalText(e.target.value)} placeholder="Ej: Lanzar nueva colección..." className="w-full text-sm px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" autoFocus/>
                    <button type="submit" className="w-full py-2 px-4 bg-violet-600 text-white rounded-md hover:bg-violet-700">Guardar</button>
                </form>
            </Modal>

            <Modal isOpen={isRecurrenceModalOpen} onClose={() => setIsRecurrenceModalOpen(false)} title="Eliminar actividad recurrente">
                <div className="space-y-4">
                    <p>Esta es una actividad recurrente. ¿Qué quieres eliminar?</p>
                    <button onClick={() => handleRecurrenceDelete('one')} className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-lg">Solo esta instancia</button>
                    <button onClick={() => handleRecurrenceDelete('all')} className="w-full text-left p-3 bg-gray-100 hover:bg-red-100 rounded-lg text-red-700">Todas las instancias</button>
                </div>
            </Modal>
        </>
    );
};

export default CalendarView;

