import React, { useState, useMemo, useEffect } from 'react';
import { onSnapshot, query, where, setDoc, deleteDoc, collection, doc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import Modal from './Modal';
import { ChevronLeft, ChevronRight, Calendar, List, Columns, PlusCircle, Trash2, Edit2, Repeat, CalendarPlus } from 'lucide-react';

// --- Helpers de Fecha ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Asumir que la semana empieza en Lunes
    d.setHours(0, 0, 0, 0);
    return new Date(d.setDate(diff));
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const dateToYMD = (date) => date.toISOString().split('T')[0];

// --- Sub-componente: Evento Individual ---
const EventItem = ({ event, onEdit, onDelete }) => (
    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
        <div className="flex items-center gap-2">
            {event.recurrence && <Repeat size={12} className="text-gray-500" />}
            <span className="text-sm">{event.title}</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => onEdit(event)} className="text-gray-500 hover:text-violet-600 transition-colors"><Edit2 size={14} /></button>
            <button onClick={() => onDelete(event)} className="text-gray-500 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
        </div>
    </div>
);


// --- Sub-componente: Vista Mensual ---
const MonthView = ({ currentDate, calculatedEventsByDate, notes, handleDayClick, isToday }) => {
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
                const hasNote = notes[dateId];
                const dayEvents = calculatedEventsByDate[dateId] || [];
                const hasTasks = dayEvents.some(e => e.type === 'task');
                const hasEvents = dayEvents.some(e => e.type === 'event');
                
                return (
                    <div key={dayNumber} onClick={() => handleDayClick(date)} className={`relative min-h-[140px] border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${today ? 'bg-violet-50 dark:bg-violet-900/40' : ''}`}>
                        <span className={`font-semibold text-center text-sm ${today ? 'text-violet-600' : ''}`}>{dayNumber}</span>
                        {hasNote && <div className="mt-1 text-xs text-pink-600 line-clamp-2 break-words">{notes[dateId].slice(0, 20)}...</div>}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center space-x-1">
                            {hasTasks && <div className="w-2 h-2 bg-pink-500 rounded-full" title="Hay tareas este día"></div>}
                            {hasEvents && <div className="w-2 h-2 bg-blue-500 rounded-full" title="Hay actividades este día"></div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Sub-componente: Vista Semanal ---
const WeekView = ({ currentDate, calculatedEventsByDate, isToday, handleDayClick }) => {
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
                            {items.map(item => (
                                <li key={`${item.id}-${item.instanceDate}`} className={`text-xs p-2 rounded shadow-sm ${item.type === 'task' ? 'bg-pink-50 dark:bg-pink-900/40' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                    {item.type === 'task' ? item.name : item.title}
                                </li>
                            ))}
                            {items.length === 0 && <div className="text-xs text-center text-gray-400 pt-8">Sin actividades</div>}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
};


// --- Sub-componente: Vista de Agenda ---
const AgendaView = ({ calculatedEvents, handleDayClick }) => {
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
                        {group.items.map(item => (
                            <li key={`${item.id}-${item.instanceDate}`} className={`flex items-center p-3 rounded-lg shadow-sm ${item.type === 'task' ? 'bg-pink-50 dark:bg-pink-900/40' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                <span className={`w-2 h-2 rounded-full mr-3 ${item.type === 'task' ? (item.completed ? 'bg-green-500' : 'bg-pink-500') : 'bg-blue-500'}`}></span>
                                <span className={`${item.type === 'task' && item.completed ? 'line-through text-gray-500' : ''}`}>
                                    {item.type === 'task' ? item.name : item.title}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )) : <p className="text-center py-8">No hay tareas o actividades futuras programadas.</p>}
        </div>
    );
};

// --- Componente Principal ---
const CalendarView = ({ userId, tasks, db, appId, getMonthId, timestampToDateString }) => {
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [notes, setNotes] = useState({});
    const [events, setEvents] = useState([]);
    const [eventExceptions, setEventExceptions] = useState([]);
    
    const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(null);
    const [currentNote, setCurrentNote] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventRecurrence, setEventRecurrence] = useState([]);
    const [recurrenceActionTarget, setRecurrenceActionTarget] = useState(null);

    const monthId = getMonthId(currentDate);
    const isToday = (date) => new Date().toDateString() === date.toDateString();

    const calculatedEvents = useMemo(() => {
        const instances = [];
        const exceptionsByParentId = eventExceptions.reduce((acc, ex) => {
            if (!acc[ex.parentId]) acc[ex.parentId] = {};
            acc[ex.parentId][ex.date] = ex;
            return acc;
        }, {});

        const endOfView = view === 'month' 
            ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
            : addDays(getStartOfWeek(currentDate), 80); // Cargar varios días para la agenda
        
        events.forEach(event => {
            if (!event.startDate) {
                console.warn("Skipping event with missing startDate:", event.id);
                return;
            }

            if (event.recurrence && event.recurrence.days?.length > 0) {
                let current = new Date(event.startDate.seconds * 1000);
                while (current <= endOfView) {
                    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon...
                    const dayStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
                    
                    if (event.recurrence.days.includes(dayStr)) {
                        const dateId = dateToYMD(current);
                        const exception = exceptionsByParentId[event.id]?.[dateId];
                        
                        if (!exception || !exception.deleted) {
                            instances.push({
                                ...event,
                                id: exception?.id || event.id,
                                title: exception?.title || event.title,
                                date: current,
                                instanceDate: dateId,
                                type: 'event',
                                originalId: event.id
                            });
                        }
                    }
                    current = addDays(current, 1);
                }
            } else {
                 instances.push({ ...event, date: new Date(event.startDate.seconds * 1000), instanceDate: dateToYMD(new Date(event.startDate.seconds * 1000)), type: 'event' });
            }
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
        const q = query(notesRef, where('monthId', '==', monthId));
        const unsubscribeNotes = onSnapshot(q, (snapshot) => {
            const newNotes = {};
            snapshot.forEach(doc => { newNotes[doc.id] = doc.data().note; });
            setNotes(newNotes);
        });

        const eventsRef = collection(db, `/artifacts/${appId}/users/${userId}/calendarEvents`);
        const unsubscribeEvents = onSnapshot(eventsRef, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const exceptionsRef = collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`);
        const unsubscribeExceptions = onSnapshot(exceptionsRef, (snapshot) => {
            setEventExceptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeNotes();
            unsubscribeEvents();
            unsubscribeExceptions();
        };
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
        } else {
            setEditingEvent(null);
            setEventTitle('');
            setEventRecurrence([]);
        }
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (!userId || !selectedDate || !eventTitle.trim()) return;
        
        const eventData = {
            title: eventTitle,
            startDate: new Date(selectedDate + 'T00:00:00'),
            recurrence: eventRecurrence.length > 0 ? { type: 'weekly', days: eventRecurrence } : null
        };

        if (editingEvent) {
            const eventRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarEvents`, editingEvent.id);
            await setDoc(eventRef, eventData, { merge: true });
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
            const exceptionData = {
                parentId: originalId || id,
                date: instanceDate,
                deleted: true
            };
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`), exceptionData);
        } else if (type === 'all') {
            // This is a destructive action, ensure it is what user wants.
            if (!window.confirm("¿Estás seguro? Esto eliminará el evento base y todas sus repeticiones.")) return;
            
            const batch = writeBatch(db);
            const parentId = originalId || id;
            
            // Delete base event
            const baseRef = doc(db, `/artifacts/${appId}/users/${userId}/calendarEvents`, parentId);
            batch.delete(baseRef);
            
            // Delete all exceptions for this parent
            const exceptionsQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/eventExceptions`), where("parentId", "==", parentId));
            const exceptionsSnapshot = await getDocs(exceptionsQuery);
            exceptionsSnapshot.forEach(doc => batch.delete(doc.ref));

            await batch.commit();
        }
    
        setIsRecurrenceModalOpen(false);
        setRecurrenceActionTarget(null);
    };


    const changeDate = (offset) => {
        if (view === 'month') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
        } else if (view === 'week') {
            setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + (offset * 7))));
        }
     };
    const headerText = useMemo(() => {
        if (view === 'month') {
            return currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        }
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
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                {/* Header and View Buttons (same as before) */}
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

                {view === 'month' && <MonthView currentDate={currentDate} calculatedEventsByDate={calculatedEventsByDate} notes={notes} handleDayClick={handleDayClick} isToday={isToday} />}
                {view === 'week' && <WeekView currentDate={currentDate} calculatedEventsByDate={calculatedEventsByDate} isToday={isToday} handleDayClick={handleDayClick} />}
                {view === 'agenda' && <AgendaView calculatedEvents={calculatedEvents} handleDayClick={handleDayClick} />}
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
                        {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'event').map(event => <EventItem key={`${event.id}-${event.instanceDate}`} event={event} onEdit={handleOpenEventModal} onDelete={handleDeleteEvent} />)}
                        {(calculatedEventsByDate[selectedDate] || []).filter(e => e.type === 'event').length === 0 && <p className="text-sm text-gray-400">No hay actividades este día.</p>}
                    </div>
                </div>
                
                <div className="mt-4">
                    <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Notas:</h4>
                    <textarea
                        className="w-full h-24 p-2 border rounded-md bg-white dark:bg-gray-700"
                        value={currentNote}
                        onChange={(e) => setCurrentNote(e.target.value)}
                        placeholder="Escribe tu nota aquí..."
                    />
                    <button
                        onClick={handleSaveNote}
                        className="mt-2 w-full py-2 px-4 bg-violet-600 text-white rounded-md hover:bg-violet-700"
                    >
                        Guardar Nota
                    </button>
                </div>
            </Modal>
            
            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={editingEvent ? 'Editar Actividad' : 'Nueva Actividad'}>
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    <div>
                        <label htmlFor="event-title">Título</label>
                        <input id="event-title" type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label>Repetir semanalmente</label>
                        <div className="flex justify-around mt-2">
                            {dayNames.map(day => (
                                <button
                                    type="button"
                                    key={day}
                                    onClick={() => setEventRecurrence(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                    className={`w-10 h-10 rounded-full font-semibold transition-colors ${eventRecurrence.includes(day) ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                                >
                                    {day.charAt(0)}
                                </button>
                            ))}
                        </div>
                    </div>
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

