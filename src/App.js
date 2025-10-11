import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from './context/AuthContext';
import { db, auth } from './firebase-config';
import { collection, onSnapshot, doc, query, orderBy, updateDoc, Timestamp, addDoc, deleteDoc, getDoc, setDoc, writeBatch, where } from 'firebase/firestore';

// Componentes
import AuthForm from './AuthForm';
import DashboardView from './components/DashboardView';
import PlannerView from './components/PlannerView';
import CalendarView from './components/CalendarView';
import PomodoroTimer from './components/PomodoroTimer';
import CreativeAdvisor from './components/CreativeAdvisor';
import BrainDumpView from './components/BrainDumpView';
import ProjectCard from './components/ProjectCard';
import ProjectForm from './components/forms/ProjectForm';
import TaskForm from './components/forms/TaskForm';
import HabitForm from './components/forms/HabitForm';
import AnnualGoalForm from './components/forms/AnnualGoalForm';
import TaskItem from './components/TaskItem';
import PaymentsCenter from './components/PaymentsCenter';
import CatIcon from './components/CatIcon';
import Confetti from './components/Confetti';
import Modal from './components/Modal';
import WelcomeBanner from './components/WelcomeBanner';
import HomeMissionsContainer from './components/HomeMissionsContainer';
import HistoryLog from './components/HistoryLog';

// Iconos y helpers
import { LayoutDashboard, Calendar, BrainCircuit, Timer, Bot, ListTodo, FileText, Menu, X, Sun, Moon, LogOut, Target, Plus, Home, Compass, History, ClipboardList } from 'lucide-react';
import { getWeekId, getMonthId, getYearId, formatDate } from './utils/helpers';

const appId = 'artflow-ai';

const welcomeMessages = [
  "Cada día es un lienzo en blanco. ¿Qué obra maestra crearás hoy?",
  "La creatividad no se gasta. Cuanta más usas, más tienes.",
  "Confía en el proceso. Tu arte está evolucionando contigo.",
];

export default function App() {
  const { userId, currentUser } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [annualGoals, setAnnualGoals] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [brainDumpItems, setBrainDumpItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectPrefill, setProjectPrefill] = useState(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskPrefill, setTaskPrefill] = useState(null);
  
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  const [convertingItem, setConvertingItem] = useState(null);
  const [projectTemplates, setProjectTemplates] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    setWelcomeMessage(welcomeMessages[dayOfYear % welcomeMessages.length]);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!userId) {
      setProjects([]); setAllTasks([]); setHabits([]); setAnnualGoals([]); setDailyTasks([]); setBrainDumpItems([]); setPayments([]); setActiveProject(null);
      return;
    }

    const listeners = [
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/projects`), orderBy("order", "asc")), snap => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(data);
        setActiveProject(current => (!current && data.length > 0) ? data[0] : (current && !data.some(p => p.id === current.id)) ? data[0] || null : current);
      }),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), orderBy("createdAt", "desc")), snap => setAllTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/habits`), orderBy("createdAt")), snap => setHabits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/annualGoals`), orderBy("createdAt")), snap => setAnnualGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/projectTemplates`), orderBy("name")), snap => setProjectTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`), orderBy("createdAt")), snap => setDailyTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, `/artifacts/${appId}/users/${userId}/brainDump`), orderBy("createdAt", "desc")), snap => setBrainDumpItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations'), async (configSnap) => {
          const statusRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyStatus`, getMonthId(new Date()));
          const statusSnap = await getDoc(statusRef);
          const savedObligations = (configSnap.exists() && configSnap.data().obligations) || [];
          const monthStatus = statusSnap.exists() ? statusSnap.data() : {};
          const updatedObligations = savedObligations.map(ob => ({ ...ob, paid: !!monthStatus[ob.id] }));
          setPayments(updatedObligations);
      })
    ];
    return () => listeners.forEach(unsub => unsub());
  }, [userId]);

  const tasksForActiveProject = useMemo(() => {
    if (!activeProject) return [];
    return allTasks.filter(t => t.projectId === activeProject.id);
  }, [activeProject, allTasks]);

  const todaysHabits = useMemo(() => {
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = dayMap[new Date().getDay()];
    return habits.filter(h => h.frequency?.includes(todayStr));
  }, [habits]);

  // --- Handlers ---
  const handleSelectProject = (project) => { setActiveProject(project); setActiveView('tasks'); };
  const handleToggleTask = async (taskId, completed) => { if (!userId) return; await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId), { completed, completedAt: completed ? Timestamp.now() : null }); };
  const handleToggleGoal = async (goalId, completed) => { await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/annualGoals`, goalId), { completed }); };
  const handleEditProject = (project) => { setEditingProject(project); setIsProjectModalOpen(true); };
  const handleEditTask = (task) => { setEditingTask(task); setIsTaskModalOpen(true); };
  const handleOpenHabitModal = (habit = null) => { setEditingHabit(habit); setIsHabitModalOpen(true); };
  const handleOpenGoalModal = (goal = null) => { setEditingGoal(goal); setIsGoalModalOpen(true); };
  
  const handleTaskDragStart = (e, task) => { e.dataTransfer.setData("task", JSON.stringify(task)); };
  const handleAddDailyTask = async (taskData) => { if (!userId) return; await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`), { ...taskData, createdAt: Timestamp.now() }); };
  const handleToggleDailyTask = async (taskId, completed) => { if (!userId) return; await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, taskId), { completed }); };
  const handleDeleteDailyTask = async (taskId) => { if (!userId) return; await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, taskId)); };
  const handleDropTaskOnPlanner = async (taskData, column) => {
    if (!userId) return;
    const exists = dailyTasks.some(t => t.originalTaskId === taskData.id && t.column === column);
    if (exists) return;
    await handleAddDailyTask({ text: taskData.name || taskData.text, completed: false, column, originalTaskId: taskData.id });
  };
  
  // 👇 **CORRECCIÓN: Se restauran las funciones para "Cerebro"**
  const handleAddBrainDumpItem = async (text) => { if (!userId) return; await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/brainDump`), { text, createdAt: Timestamp.now() }); };
  const handleDeleteBrainDumpItem = async (itemId) => { if (!userId) return; await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/brainDump`, itemId)); };
  const handleOpenConvertToTask = (item) => { setTaskPrefill({ name: item.text }); setConvertingItem({ ...item, type: 'task' }); setIsTaskModalOpen(true); };
  const handleOpenConvertToProject = (item) => { setProjectPrefill({ name: item.text }); setConvertingItem({ ...item, type: 'project' }); setIsProjectModalOpen(true); };
  
  if (!currentUser) return <AuthForm auth={auth} user={currentUser} />;

  const navItems = [
    { view: 'dashboard', icon: LayoutDashboard, label: 'Mi Día' },
    { view: 'tasks', icon: Target, label: 'Tareas' },
    { view: 'planner', icon: ClipboardList, label: 'Planificador' },
    { view: 'home', icon: Home, label: 'Hogar' },
    { view: 'calendar', icon: Calendar, label: 'Calendario' },
    { view: 'advisor', icon: Compass, label: 'Mentor' },
    { view: 'brain', icon: BrainCircuit, label: 'Cerebro' },
    { view: 'payments', icon: FileText, label: 'Pagos' },
    { view: 'history', icon: History, label: 'Historial' }
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView tasks={tasksForActiveProject} activeProjectName={activeProject?.name} habits={todaysHabits} onToggleHabit={() => {}} onManageHabits={handleOpenHabitModal} onEditHabit={handleOpenHabitModal} annualGoals={annualGoals} onToggleGoal={handleToggleGoal} onManageGoals={handleOpenGoalModal} showWelcomeBanner={showWelcomeBanner} welcomeMessage={welcomeMessage} onDismissWelcome={() => setShowWelcomeBanner(false)} />;
      case 'tasks':
        if (!activeProject) return <div className="text-center p-8">Selecciona un proyecto.</div>;
        return (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{activeProject.name}</h2><button onClick={() => setIsTaskModalOpen(true)} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600"><Plus size={20} /></button></div>
            <ul className="space-y-2">{tasksForActiveProject.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={() => {}} onSelect={setSelectedTask} isSelected={selectedTask?.id === t.id} onEdit={handleEditTask} />)}</ul>
          </div>);
      case 'planner': return <PlannerView projects={projects} allTasks={allTasks} dailyTasks={dailyTasks} onDropTask={handleDropTaskOnPlanner} onAddDailyTask={handleAddDailyTask} onToggleDailyTask={handleToggleDailyTask} onDeleteDailyTask={handleDeleteDailyTask} onTaskDragStart={handleTaskDragStart} />;
      case 'home': return <HomeMissionsContainer userId={userId} db={db} appId={appId} getWeekId={getWeekId} />;
      case 'calendar': return <CalendarView userId={userId} tasks={allTasks} db={db} appId={appId} getMonthId={getMonthId} />;
      case 'advisor': return <CreativeAdvisor userId={userId} projects={projects} tasks={allTasks} habits={habits} db={db} appId={appId} getWeekId={getWeekId} getMonthId={getMonthId} />;
      // 👇 **CORRECCIÓN: Se pasan las funciones correctas a "Cerebro"**
      case 'brain': return <BrainDumpView items={brainDumpItems} onAddItem={handleAddBrainDumpItem} onDeleteItem={handleDeleteBrainDumpItem} onConvertToTask={handleOpenConvertToTask} onConvertToProject={handleOpenConvertToProject} />;
      case 'payments': return <PaymentsCenter userId={userId} db={db} appId={appId} getMonthId={getMonthId} getYearId={getYearId} initialPayments={payments} />;
      case 'history': return <HistoryLog userId={userId} db={db} appId={appId} formatDate={formatDate} />;
      default: return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-slate-800 text-gray-100' : 'bg-gradient-to-br from-violet-100 to-rose-100 text-gray-900'}`}>
        {showConfetti && <Confetti />}
        
        <aside className='w-72 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 hidden lg:flex flex-col'>
          <div className="p-4 flex-shrink-0 flex items-center gap-2"><CatIcon className="h-8 w-8 text-violet-500" /> <span className="text-xl font-bold">ArtFlow AI</span></div>
          <nav className="flex-grow p-4 space-y-2">
            {navItems.map(btn => <button key={btn.view} onClick={() => setActiveView(btn.view)} className={`flex items-center w-full space-x-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeView === btn.view ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><btn.icon size={20} /><span>{btn.label}</span></button>)}
          </nav>
          <div className="p-4 flex-shrink-0">
             <PomodoroTimer selectedTask={selectedTask} userId={userId} db={db} appId={appId} />
          </div>
        </aside>
        
        <main className="flex-1 grid grid-cols-12 gap-8 p-8 overflow-y-auto">
            <div className="col-span-12 lg:col-span-4">
              <div className="sticky top-8 flex flex-col gap-6">
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
                  <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold">Proyectos</h2><button onClick={() => setIsProjectModalOpen(true)} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600"><Plus size={20} /></button></div>
                  <ul className="h-[calc(100vh-12rem)] overflow-y-auto pr-2 -mr-2">{projects.map(p => <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} onDelete={() => {}} onEdit={handleEditProject} activeProject={activeProject} />)}</ul>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              {renderView()}
            </div>
        </main>

        {isProjectModalOpen && <Modal isOpen={isProjectModalOpen} onClose={() => {setIsProjectModalOpen(false); setEditingProject(null);}} title={editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}><ProjectForm onSubmit={() => {setIsProjectModalOpen(false); setEditingProject(null);}} project={editingProject} templates={projectTemplates} userId={userId} db={db} appId={appId} /></Modal>}
        {isTaskModalOpen && <Modal isOpen={isTaskModalOpen} onClose={() => {setIsTaskModalOpen(false); setEditingTask(null);}} title={editingTask ? "Editar Tarea" : "Nueva Tarea"}><TaskForm onSubmit={() => {setIsTaskModalOpen(false); setEditingTask(null);}} task={editingTask} projects={projects} isNewTask={!editingTask} activeProjectId={activeProject?.id} userId={userId} db={db} appId={appId} /></Modal>}
        {isHabitModalOpen && <Modal isOpen={isHabitModalOpen} onClose={() => {setIsHabitModalOpen(false); setEditingHabit(null);}} title={editingHabit ? "Editar Hábito" : "Gestionar Hábitos"}><HabitForm habit={editingHabit} userId={userId} db={db} appId={appId} onClose={() => {setIsHabitModalOpen(false); setEditingHabit(null);}} habits={habits} /></Modal>}
        {isGoalModalOpen && <Modal isOpen={isGoalModalOpen} onClose={() => {setIsGoalModalOpen(false); setEditingGoal(null);}} title={editingGoal ? "Editar Meta Anual" : "Gestionar Metas"}><AnnualGoalForm goal={editingGoal} userId={userId} db={db} appId={appId} onClose={() => {setIsGoalModalOpen(false); setEditingGoal(null);}} goals={annualGoals} /></Modal>}
      </div>
    </DndProvider>
  );
}

