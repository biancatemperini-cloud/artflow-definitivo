import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from './context/AuthContext';
// CORRECCIÓN 1: Se agregó 'auth' a esta línea de importación.
import { db, auth } from './firebase-config'; 
import { collection, onSnapshot, doc, query, orderBy, updateDoc, Timestamp, addDoc, deleteDoc, getDoc, setDoc, writeBatch, where, getDocs } from 'firebase/firestore';

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
import HomeMissionsWidget from './components/HomeMissionsWidget';
// CORRECCIÓN 2: Se agregó la importación del componente HomeMissionsContainer.
import HomeMissionsContainer from './components/HomeMissionsContainer'; 
import HistoryLog from './components/HistoryLog';

// Iconos y helpers
import { LayoutDashboard, Calendar, BrainCircuit, Timer, Bot, ListTodo, FileText, Menu, X, Sun, Moon, LogOut, Target, Plus, Home, Compass, History, ClipboardList } from 'lucide-react';
import { getWeekId, getMonthId, getYearId, formatDate, dateToYMD } from './utils/helpers';

const appId = 'artflow-ai';

const initialHomeMissions = [
    { id: 'dishes', name: 'Lavar los platos', icon: '🍽️', type: 'daily' },
    { id: 'studio', name: 'Limpiar el estudio', icon: '🎨', type: 'daily' },
    { id: 'shopping', name: 'Hacer las Compras', icon: '🛒', type: 'daily' },
    { id: 'laundry', name: 'Lavar Ropa', icon: '🧺', type: 'daily' },
    { id: 'trash', name: 'Sacar La Basura', icon: '🗑️', type: 'daily' },
    { id: 'bed', name: 'Hacer la cama', icon: '🛏️', type: 'daily' },
    { id: 'litterbox', name: 'Limpiar la caja de arena', icon: '🐾', type: 'daily' }
];

const weeklyMissionsList = [
    { id: 'kitchen', name: 'Limpieza Profunda: Cocina', day: 1, icon: '🍳', type: 'weekly' },
    { id: 'bathroom', name: 'Operación Brillo: Baño', day: 2, icon: '🚽', type: 'weekly' },
    { id: 'bedroom', name: 'Santuario Personal: Habitación', day: 3, icon: '🛏️', type: 'weekly' },
    { id: 'livingroom', name: 'Zona de Relax: Living', day: 4, icon: '🛋️', type: 'weekly' },
    { id: 'common', name: 'Armonía Espacial: Áreas Comunes', day: 5, icon: '🧹', type: 'weekly' },
    { id: 'cats', name: 'Misión Felina: Caja de Arena', day: 6, icon: '🐾', type: 'weekly' },
    { id: 'planning', name: 'Revisión y Descanso', day: 0, icon: '🧘', type: 'weekly' }
];

const welcomeMessages = [
  "Cada día es un lienzo en blanco. ¿Qué obra maestra crearás hoy?",
  "La creatividad no se gasta. Cuanta más usas, más tienes.",
  "Confía en el proceso. Tu arte está evolucionando contigo.",
];

const projectCategories = [
    { name: 'TRABAJO' },
    { name: 'PERSONAL' },
    { name: 'FUTURO' },
    { name: 'OTRO' }
];

export default function App() {
  const { userId, currentUser } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [annualGoals, setAnnualGoals] = useState([]);
  const [dailyTasks, setDailyTasks] = useState(null);
  const [brainDumpItems, setBrainDumpItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [todaysHomeMissions, setTodaysHomeMissions] = useState([]);
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
  const [rewardMessage, setRewardMessage] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  const [draggingProjectId, setDraggingProjectId] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!userId) return;

    const checkAndRolloverTasks = async () => {
        const todayStr = dateToYMD(new Date());
        const dailyTasksRef = collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`);
        const q = query(dailyTasksRef, where("completed", "==", false));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        let hasChanges = false;
        snapshot.forEach(document => {
            const task = document.data();
            if (task.planDate && task.planDate < todayStr) {
                const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, document.id);
                batch.update(taskRef, { planDate: todayStr });
                hasChanges = true;
            }
        });

        if (hasChanges) {
          await batch.commit().catch(console.error);
        }
    };
    checkAndRolloverTasks();
  }, [userId, db, appId]);

  useEffect(() => {
    if (!userId || dailyTasks === null) return;

    const addHomeMissionsToPlanner = async () => {
      const today = new Date();
      const todayStr = dateToYMD(today);
      const lastCheck = localStorage.getItem('lastHomeMissionCheck');

      if (lastCheck === todayStr) return;

      const currentDay = today.getDay();
      const missionsToAdd = [];

      initialHomeMissions.forEach(mission => {
        missionsToAdd.push({
          text: mission.name,
          originalTaskId: `home-daily-${mission.id}`,
          isHomeMission: true,
        });
      });

      const weeklyMissionToday = weeklyMissionsList.find(m => m.day === currentDay);
      if (weeklyMissionToday) {
        missionsToAdd.push({
          text: `Dedicarle al menos 5 minutos a ${weeklyMissionToday.name}`,
          originalTaskId: `home-weekly-${weeklyMissionToday.id}`,
          isHomeMission: true,
        });
      }

      const existingTodayTaskIds = new Set(
        dailyTasks
          .filter(t => t.planDate === todayStr && t.originalTaskId?.startsWith('home-'))
          .map(t => t.originalTaskId)
      );

      const batch = writeBatch(db);
      let missionsAdded = false;
      missionsToAdd.forEach(mission => {
        if (!existingTodayTaskIds.has(mission.originalTaskId)) {
          const newTaskRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`));
          batch.set(newTaskRef, {
            text: mission.text,
            completed: false,
            planDate: todayStr,
            originalTaskId: mission.originalTaskId,
            isHomeMission: true,
            createdAt: Timestamp.now()
          });
          missionsAdded = true;
        }
      });

      if (missionsAdded) {
        await batch.commit();
      }

      localStorage.setItem('lastHomeMissionCheck', todayStr);
    };

    addHomeMissionsToPlanner();
  }, [userId, db, appId, dailyTasks]);


  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    setWelcomeMessage(welcomeMessages[dayOfYear % welcomeMessages.length]);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!userId) {
      setProjects([]); setAllTasks([]); setHabits([]); setAnnualGoals([]); setDailyTasks([]); setBrainDumpItems([]); setPayments([]); setTodaysHomeMissions([]); setActiveProject(null);
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
  
  useEffect(() => {
    if (!userId) return;

    const fetchHomeMissionsStatus = async () => {
        const today = new Date();
        const todayStr = today.toDateString();
        const currentDay = today.getDay();
        const weekId = getWeekId(today);

        const dailyPromises = initialHomeMissions.map(async (mission) => {
            const missionSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/homeMissions`, mission.id));
            const completed = missionSnap.exists() && missionSnap.data().lastCompleted.toDate().toDateString() === todayStr;
            return { ...mission, completed };
        });

        const weeklyMissionToday = weeklyMissionsList.find(m => m.day === currentDay);
        let weeklyMissionWithStatus = null;
        if (weeklyMissionToday) {
            const weekDocSnap = await getDoc(doc(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`, weekId));
            const weeklyStatus = weekDocSnap.exists() ? weekDocSnap.data() : {};
            weeklyMissionWithStatus = { ...weeklyMissionToday, completed: !!weeklyStatus[weeklyMissionToday.id] };
        }
        
        const dailyResults = await Promise.all(dailyPromises);
        
        const missionsForToday = dailyResults.filter(m => !m.completed);
        if (weeklyMissionWithStatus && !weeklyMissionWithStatus.completed) {
            missionsForToday.push(weeklyMissionWithStatus);
        }

        setTodaysHomeMissions(missionsForToday);
    };

    fetchHomeMissionsStatus();
    
    const dailyUnsub = onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/homeMissions`), fetchHomeMissionsStatus);
    const weeklyUnsub = onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`), fetchHomeMissionsStatus);

    return () => { dailyUnsub(); weeklyUnsub(); };

  }, [userId, db, appId]);

  const showReward = useCallback((text) => {
    setRewardMessage(text);
    setShowConfetti(true);
    setTimeout(() => {
        setShowConfetti(false);
        setRewardMessage('');
    }, 8000);
  }, []);

  const handleCompleteHomeMission = async (mission) => {
      if (!userId) return;
      setTodaysHomeMissions(prev => prev.filter(m => m.id !== mission.id));

      const prompt = `Eres ArtFlow AI, un coach creativo con mucho humor. Un artista acaba de completar una tarea del hogar. Genera un mensaje de recompensa corto (1-2 frases), divertido y exageradamente épico. La tarea es: "${mission.name}". Responde solo con el texto de la respuesta.`;
      try {
          const apiUrl = '/api/gemini-proxy';
          const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
          if (!response.ok) throw new Error(`Error del proxy: ${response.statusText}`);
          const result = await response.json();
          const text = result.candidates[0].content.parts[0].text;
          showReward(text.trim());
      } catch (e) {
          console.error(e.message);
          showReward('¡Misión completada! ¡Eres increíble!');
      }
      
      if (mission.type === 'daily') {
          await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/homeMissions`, mission.id), { lastCompleted: Timestamp.now() });
      } else if (mission.type === 'weekly') {
          const weekId = getWeekId(new Date());
          await setDoc(doc(db, `/artifacts/${appId}/users/${userId}/weeklyMissions`, weekId), { [mission.id]: true }, { merge: true });
      }
  };

  const tasksForActiveProject = useMemo(() => {
    if (!activeProject) return [];
    return allTasks.filter(t => t.projectId === activeProject.id);
  }, [activeProject, allTasks]);

  const todaysHabits = useMemo(() => {
    const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = dayMap[new Date().getDay()];
    return habits.filter(h => h.frequency?.includes(todayStr));
  }, [habits]);

    const handleProjectSubmit = async (projectData, tasksToCreate = [], templateId) => {
        if (!userId) return;
        const batch = writeBatch(db);
        try {
            if (editingProject) {
                const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, editingProject.id);
                batch.update(projectRef, projectData);
            } else {
                const newProjectRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/projects`));
                const newProjectOrder = projects.length > 0 ? Math.max(...projects.map(p => p.order || 0)) + 1 : 1;
                batch.set(newProjectRef, { 
                    ...projectData, 
                    createdAt: Timestamp.now(), 
                    order: newProjectOrder 
                });
    
                let tasksFromTemplate = [];
                if (templateId) {
                    const template = projectTemplates.find(t => t.id === templateId);
                    if (template && template.tasks) {
                        tasksFromTemplate = template.tasks;
                    }
                }
                
                const finalTasks = [...tasksToCreate, ...tasksFromTemplate];

                finalTasks.forEach(taskText => {
                    const newTaskRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`));
                    batch.set(newTaskRef, {
                        name: taskText,
                        completed: false,
                        projectId: newProjectRef.id,
                        createdAt: Timestamp.now(),
                        priority: 'Media',
                        notes: ''
                    });
                });
    
                if (convertingItem && convertingItem.type === 'project') {
                    const brainDumpRef = doc(db, `/artifacts/${appId}/users/${userId}/brainDump`, convertingItem.id);
                    batch.delete(brainDumpRef);
                }
            }
            await batch.commit();
        } catch (error) {
            console.error("Error al guardar el proyecto:", error);
        } finally {
            setIsProjectModalOpen(false);
            setEditingProject(null);
            setProjectPrefill(null);
            setConvertingItem(null);
        }
    };

    const handleDeleteProject = async (projectId) => {
        if (!userId || !window.confirm("¿Estás seguro? Esto eliminará el proyecto y todas sus tareas asociadas.")) return;
        try {
            const batch = writeBatch(db);
            const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId);
            batch.delete(projectRef);
    
            const tasksQuery = query(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), where("projectId", "==", projectId));
            const tasksSnapshot = await getDocs(tasksQuery);
            tasksSnapshot.forEach(taskDoc => {
                batch.delete(taskDoc.ref);
            });
    
            await batch.commit();
            if (activeProject?.id === projectId) {
                setActiveProject(projects.length > 1 ? projects[0] : null);
            }
        } catch (error) {
            console.error("Error al eliminar el proyecto:", error);
        }
    };

    const handleTaskSubmit = async (taskData) => {
        if (!userId) return;
        try {
            if (editingTask) {
                const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, editingTask.id);
                await updateDoc(taskRef, taskData);
            } else {
                await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), {
                    ...taskData,
                    completed: false,
                    createdAt: Timestamp.now(),
                    pomoCount: 0,
                    order: tasksForActiveProject.length,
                });
                if (convertingItem && convertingItem.type === 'task') {
                    await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/brainDump`, convertingItem.id));
                }
            }
        } catch (error) {
            console.error("Error al guardar la tarea:", error);
        } finally {
            setIsTaskModalOpen(false);
            setEditingTask(null);
            setTaskPrefill(null);
            setConvertingItem(null);
        }
    };
    
    const handleDeleteTask = async (taskId) => {
        if (!userId || !window.confirm("¿Seguro que quieres eliminar esta tarea?")) return;
        try {
            await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId));
        } catch (error) {
            console.error("Error al eliminar la tarea:", error);
        }
    };
    
    const handleProjectDragStart = (e, project) => {
        setDraggingProjectId(project.id);
    };

    const handleProjectDrop = async (e, targetProject) => {
        if (!draggingProjectId || draggingProjectId === targetProject.id) {
            setDraggingProjectId(null);
            return;
        }

        const reorderedProjects = [...projects];
        const draggedIndex = reorderedProjects.findIndex(p => p.id === draggingProjectId);
        const targetIndex = reorderedProjects.findIndex(p => p.id === targetProject.id);

        const [draggedProject] = reorderedProjects.splice(draggedIndex, 1);
        reorderedProjects.splice(targetIndex, 0, draggedProject);

        const batch = writeBatch(db);
        reorderedProjects.forEach((p, index) => {
            const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, p.id);
            batch.update(projectRef, { order: index });
        });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error al reordenar proyectos:", error);
        } finally {
            setDraggingProjectId(null);
        }
    };

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
  
  const handleDropTaskOnPlanner = async (taskData, date) => {
    if (!userId) return;
    const dateString = dateToYMD(date);
    const exists = dailyTasks.some(t => t.originalTaskId === taskData.id && t.planDate === dateString);
    if (exists) return;
    await handleAddDailyTask({ text: taskData.name || taskData.text, completed: false, planDate: dateString, originalTaskId: taskData.id });
  };
  
  const handleMoveDailyTask = async (taskId, newDate) => {
      if (!userId) return;
      const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, taskId);
      await updateDoc(taskRef, { planDate: dateToYMD(newDate) });
  };
  
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
      case 'dashboard': return <DashboardView tasks={tasksForActiveProject} activeProjectName={activeProject?.name} habits={todaysHabits} onToggleHabit={() => {}} onManageHabits={handleOpenHabitModal} onEditHabit={handleOpenHabitModal} annualGoals={annualGoals} onToggleGoal={handleToggleGoal} onManageGoals={handleOpenGoalModal} showWelcomeBanner={showWelcomeBanner} welcomeMessage={welcomeMessage} onDismissWelcome={() => setShowWelcomeBanner(false)} homeMissions={todaysHomeMissions} onCompleteHomeMission={handleCompleteHomeMission} />;
      case 'tasks':
        if (!activeProject) return <div className="text-center p-8">Selecciona un proyecto.</div>;
        return (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{activeProject.name}</h2><button onClick={() => setIsTaskModalOpen(true)} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600"><Plus size={20} /></button></div>
            <ul className="space-y-2">{tasksForActiveProject.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onSelect={setSelectedTask} isSelected={selectedTask?.id === t.id} onEdit={handleEditTask} />)}</ul>
          </div>);
      case 'planner': return <PlannerView projects={projects} allTasks={allTasks} dailyTasks={dailyTasks || []} onDropTask={handleDropTaskOnPlanner} onAddDailyTask={handleAddDailyTask} onToggleDailyTask={handleToggleDailyTask} onDeleteDailyTask={handleDeleteDailyTask} onTaskDragStart={handleTaskDragStart} onMoveDailyTask={handleMoveDailyTask} />;
      case 'home': return <HomeMissionsContainer userId={userId} db={db} appId={appId} getWeekId={getWeekId} />;
      case 'calendar': return <CalendarView userId={userId} tasks={allTasks} db={db} appId={appId} getMonthId={getMonthId} />;
      case 'advisor': return <CreativeAdvisor userId={userId} projects={projects} tasks={allTasks} habits={habits} db={db} appId={appId} getWeekId={getWeekId} getMonthId={getMonthId} />;
      case 'brain': return <BrainDumpView items={brainDumpItems} onAddItem={handleAddBrainDumpItem} onDeleteItem={handleDeleteBrainDumpItem} onConvertToTask={handleOpenConvertToTask} onConvertToProject={handleOpenConvertToProject} />;
      case 'payments': return <PaymentsCenter userId={userId} db={db} appId={appId} getMonthId={getMonthId} getYearId={getYearId} initialPayments={payments} />;
      case 'history': return <HistoryLog userId={userId} db={db} appId={appId} formatDate={formatDate} />;
      default: return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-slate-800 text-gray-100' : 'bg-gradient-to-br from-violet-100 to-rose-100 text-gray-900'}`}>
        {showConfetti && <Confetti message={rewardMessage} />}
        
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
                  <ul className="h-[calc(100vh-12rem)] overflow-y-auto pr-2 -mr-2">{projects.map(p => <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} onDelete={handleDeleteProject} onEdit={handleEditProject} activeProjectId={activeProject?.id} onDragStart={(e) => handleProjectDragStart(e, p)} onDrop={(e) => handleProjectDrop(e, p)} isDragging={draggingProjectId === p.id} />)}</ul>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              {renderView()}
            </div>
        </main>

        {isProjectModalOpen && <Modal isOpen={isProjectModalOpen} onClose={() => {setIsProjectModalOpen(false); setEditingProject(null); setProjectPrefill(null);}} title={editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}><ProjectForm onSubmit={handleProjectSubmit} project={editingProject} prefill={projectPrefill} categories={projectCategories} templates={projectTemplates} userId={userId} db={db} appId={appId} /></Modal>}
        {isTaskModalOpen && <Modal isOpen={isTaskModalOpen} onClose={() => {setIsTaskModalOpen(false); setEditingTask(null); setTaskPrefill(null);}} title={editingTask ? "Editar Tarea" : "Nueva Tarea"}><TaskForm onSubmit={handleTaskSubmit} task={editingTask} prefill={taskPrefill} projects={projects} isNewTask={!editingTask} activeProjectId={activeProject?.id} userId={userId} db={db} appId={appId} /></Modal>}
        {isHabitModalOpen && <Modal isOpen={isHabitModalOpen} onClose={() => {setIsHabitModalOpen(false); setEditingHabit(null);}} title={editingHabit ? "Editar Hábito" : "Gestionar Hábitos"}><HabitForm habit={editingHabit} userId={userId} db={db} appId={appId} onClose={() => {setIsHabitModalOpen(false); setEditingHabit(null);}} habits={habits} /></Modal>}
        {isGoalModalOpen && <Modal isOpen={isGoalModalOpen} onClose={() => {setIsGoalModalOpen(false); setEditingGoal(null);}} title={editingGoal ? "Editar Meta Anual" : "Gestionar Metas"}><AnnualGoalForm goal={editingGoal} userId={userId} db={db} appId={appId} onClose={() => {setIsGoalModalOpen(false); setEditingGoal(null);}} goals={annualGoals} /></Modal>}
      </div>
    </DndProvider>
  );
}