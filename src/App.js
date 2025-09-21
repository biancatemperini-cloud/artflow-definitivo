import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch, Timestamp, arrayUnion, arrayRemove, orderBy, getDoc } from 'firebase/firestore';
import { LayoutDashboard, Target, BrainCircuit, Home, FileText, Compass, Calendar, History, Moon, Sun, Plus, Zap, LogOut, ClipboardList } from 'lucide-react';

// Component Imports
import AuthForm from './AuthForm';
import Modal from './components/Modal';
import Tooltip from './components/Tooltip';
import ProjectCard from './components/ProjectCard';
import TaskItem from './components/TaskItem';
import PomodoroTimer from './components/PomodoroTimer';
import DashboardView from './components/DashboardView';
import BrainDumpView from './components/BrainDumpView';
import PaymentsCenter from './components/PaymentsCenter';
import HomeMissionsContainer from './components/HomeMissionsContainer';
import CreativeAdvisor from './components/CreativeAdvisor';
import CalendarView from './components/CalendarView';
import HistoryLog from './components/HistoryLog';
import ProjectForm from './components/forms/ProjectForm';
import TaskForm from './components/forms/TaskForm';
import HabitForm from './components/forms/HabitForm';
import AnnualGoalForm from './components/forms/AnnualGoalForm';
import WelcomeBanner from './components/WelcomeBanner';
import PlannerView from './components/PlannerView';
import { CatIcon } from './components/CatIcon';
import { formatDate, getMonthId, getWeekId, timestampToDateString } from './utils/helpers';
import Confetti from './components/Confetti';

// --- Frases Motivadoras ---
const welcomeMessages = [
  "Cada día es un lienzo en blanco. ¿Qué obra maestra crearás hoy?",
  "La creatividad no se gasta. Cuanta más usas, más tienes.",
  "El único error real es aquel del que no aprendemos nada.",
  "Confía en el proceso. Tu arte está evolucionando contigo.",
  "No esperes la inspiración. Ve a por ella con un plan.",
  "Un pequeño paso cada día construye una gran obra.",
  "Tu voz creativa es única. No dejes que nadie la silencie.",
  "Permítete crear basura. Los diamantes se forman bajo presión.",
  "El futuro pertenece a quienes creen en la belleza de sus sueños.",
  "La diferencia entre lo posible y lo imposible está en la determinación de una persona.",
  "No hay nada más verdaderamente artístico que amar a las personas.",
  "Pinta tu propia visión del mundo, no la de otros.",
  "Cada obra maestra fue una vez el trabajo de un amateur que no se rindió.",
  "Eres coautora de cada obra en la que participas.",
  "La belleza no está en la perfección, sino en la autenticidad"
];


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// --- App ID for Firestore paths ---
const appId = "artflow-ai";

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: browserLocalPersistence });
const db = getFirestore(app);

export const categories = [
    { name: 'Creatividad', color: 'bg-pink-200 text-pink-800' },
    { name: 'Trabajo', color: 'bg-blue-200 text-blue-800' },
    { name: 'Casa', color: 'bg-green-200 text-green-800' },
    { name: 'Personal', color: 'bg-yellow-200 text-yellow-800' },
    { name: 'Estudios', color: 'bg-purple-200 text-purple-800' },
];

const areDatesConsecutive = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1.seconds * 1000);
    const d2 = new Date(date2.seconds * 1000);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() - d2.getTime() === 24 * 60 * 60 * 1000;
};

// --- Main App Component ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [activeView, setActiveView] = useState('dashboard');
    const [draggingProjectId, setDraggingProjectId] = useState(null);
    const [draggingTaskId, setDraggingTaskId] = useState(null);
    const [brainDumpItems, setBrainDumpItems] = useState([]);
    const [taskPrefill, setTaskPrefill] = useState(null);
    const [projectPrefill, setProjectPrefill] = useState(null);
    const [convertingItem, setConvertingItem] = useState(null);
    const [payments, setPayments] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [showConfetti, setShowConfetti] = useState(false);
    const [habits, setHabits] = useState([]);
    const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [projectTemplates, setProjectTemplates] = useState([]);
    const [annualGoals, setAnnualGoals] = useState([]);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
    const [dailyTasks, setDailyTasks] = useState([]);


    const todaysHabits = useMemo(() => {
        const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayStr = dayMap[new Date().getDay()];
        return habits.filter(h => h.frequency && h.frequency.includes(todayStr));
    }, [habits]);

    useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);
    
    useEffect(() => {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const messageIndex = dayOfYear % welcomeMessages.length;
        setWelcomeMessage(welcomeMessages[messageIndex]);
        setShowWelcomeBanner(true);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
                setCurrentUser(user);
            } else {
                setUserId(null);
                setCurrentUser(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const migrateData = useCallback(async (userId) => { /* Migration logic */ }, []);

    useEffect(() => {
        if (!isAuthReady || !userId) return;

        migrateData(userId);

        const projectsRef = collection(db, `/artifacts/${appId}/users/${userId}/projects`);
        const unsubscribeProjects = onSnapshot(query(projectsRef, orderBy("order")), (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjects(projectsData);
            if (!activeProjectId && projectsData.length > 0) setActiveProjectId(projectsData[0].id);
            else if (projectsData.length === 0) setActiveProjectId(null);
        });

        const allTasksRef = collection(db, `/artifacts/${appId}/users/${userId}/tasks`);
        const unsubscribeAllTasks = onSnapshot(allTasksRef, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTasks(tasksData);
        });

        const templatesRef = collection(db, `/artifacts/${appId}/users/${userId}/projectTemplates`);
        const unsubscribeTemplates = onSnapshot(query(templatesRef, orderBy("name")), (snapshot) => {
            const templatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProjectTemplates(templatesData);
        });

        const brainDumpRef = collection(db, `/artifacts/${appId}/users/${userId}/brainDump`);
        const unsubscribeBrainDump = onSnapshot(query(brainDumpRef, orderBy("createdAt", "desc")), (snapshot) => {
            const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBrainDumpItems(itemsData);
        });

        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        const unsubscribePayments = onSnapshot(configRef, async (configSnap) => {
            const statusRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyStatus`, getMonthId(new Date()));
            const statusSnap = await getDoc(statusRef);
            const savedObligations = (configSnap.exists() && configSnap.data().obligations) || [];
            const monthStatus = statusSnap.exists() ? statusSnap.data() : {};
            const updatedObligations = savedObligations.map(ob => ({ ...ob, paid: !!monthStatus[ob.id] }));
            setPayments(updatedObligations);
        });

        const habitsRef = collection(db, `/artifacts/${appId}/users/${userId}/habits`);
        const unsubscribeHabits = onSnapshot(query(habitsRef, orderBy("createdAt")), (snapshot) => {
            const habitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHabits(habitsData);
        });
        
        const goalsRef = collection(db, `/artifacts/${appId}/users/${userId}/annualGoals`);
        const unsubscribeGoals = onSnapshot(query(goalsRef, orderBy("createdAt")), (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAnnualGoals(goalsData);
        });

        const dailyTasksRef = collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`);
        const unsubscribeDailyTasks = onSnapshot(query(dailyTasksRef, orderBy("createdAt")), (snapshot) => {
            setDailyTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });


        return () => {
            unsubscribeProjects();
            unsubscribeAllTasks();
            unsubscribeBrainDump();
            unsubscribePayments();
            unsubscribeHabits();
            unsubscribeTemplates();
            unsubscribeGoals();
            unsubscribeDailyTasks();
        };
    }, [isAuthReady, userId, activeProjectId, migrateData]);

    useEffect(() => {
        if (activeProjectId) {
            const projectTasks = allTasks.filter(t => t.projectId === activeProjectId);
            const priorityOrder = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
            projectTasks.sort((a, b) => {
                const priorityA = priorityOrder[a.priority] || 3;
                const priorityB = priorityOrder[b.priority] || 3;
                if (priorityA !== priorityB) return priorityA - priorityB;
                return (a.order || 0) - (b.order || 0);
            });
            setTasks(projectTasks);
        } else {
            setTasks([]);
        }
    }, [activeProjectId, allTasks]);
    
    const handleAddDailyTask = async (taskData) => {
        if (!userId) return;
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/dailyTasks`), {
            ...taskData,
            createdAt: Timestamp.now()
        });
    };
    
    const handleToggleDailyTask = async (taskId, completed) => {
        if (!userId) return;
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, taskId), { completed });
    };

    const handleDeleteDailyTask = async (taskId) => {
        if (!userId) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/dailyTasks`, taskId));
    };
    
    const handleTaskDragStart = (e, task) => {
        e.dataTransfer.setData("task", JSON.stringify(task));
    };

    const handleDropTaskOnPlanner = async (taskData, column) => {
        if (!userId) return;
        const exists = dailyTasks.some(t => t.originalTaskId === taskData.id && t.column === column);
        if (exists) return;
        await handleAddDailyTask({ text: taskData.name, completed: false, column, originalTaskId: taskData.id });
    };

    const handleAddOrUpdateHabit = async (habitData) => {
        if (!userId) return;
        if (editingHabit) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/habits`, editingHabit.id), habitData);
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/habits`), { ...habitData, createdAt: Timestamp.now(), currentStreak: 0, longestStreak: 0, lastCompleted: null });
        }
        setIsHabitModalOpen(false);
        setEditingHabit(null);
    };

    const handleDeleteHabit = async (habitId) => {
        if (!userId || !window.confirm('¿Seguro que quieres eliminar este hábito?')) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/habits`, habitId));
        setIsHabitModalOpen(false);
        setEditingHabit(null);
    };

    const handleToggleHabit = async (habit, isCompleted) => {
        if (!userId || isCompleted) return;
        const habitRef = doc(db, `/artifacts/${appId}/users/${userId}/habits`, habit.id);
        const today = Timestamp.now();
        let newCurrentStreak = 1;
        if (areDatesConsecutive(today, habit.lastCompleted)) {
            newCurrentStreak = (habit.currentStreak || 0) + 1;
        }
        const newLongestStreak = Math.max(habit.longestStreak || 0, newCurrentStreak);
        await updateDoc(habitRef, { lastCompleted: today, currentStreak: newCurrentStreak, longestStreak: newLongestStreak });
    };

    const handleOpenHabitModal = (habit = null) => {
        setEditingHabit(habit);
        setIsHabitModalOpen(true);
    };
    
    const handleAddOrUpdateGoal = async (goalData) => {
        if (!userId) return;
        if (editingGoal) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/annualGoals`, editingGoal.id), goalData);
        } else {
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/annualGoals`), {
                ...goalData,
                completed: false,
                createdAt: Timestamp.now(),
            });
        }
        setIsGoalModalOpen(false);
        setEditingGoal(null);
    };

    const handleToggleGoal = async (goalId, completed) => {
        if (!userId) return;
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/annualGoals`, goalId), { completed });
    };

    const handleOpenGoalModal = (goal = null) => {
        setEditingGoal(goal);
        setIsGoalModalOpen(true);
    };

    const handleSelectProject = (projectId) => {
        setActiveProjectId(projectId);
        setActiveView('timer');
    };

    const handleToggleTask = async (taskId, completed) => {
        if (!userId) return;
        if (completed) {
            const task = allTasks.find(t => t.id === taskId);
            if (task) {
                const otherUncompletedTasks = allTasks.filter(t => t.projectId === task.projectId && !t.completed && t.id !== taskId);
                if (otherUncompletedTasks.length === 0) {
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 7000);
                }
            }
        }
        await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId), { completed });
    };

    const handleAddBrainDumpItem = async (text) => {
        if (!userId) return;
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/brainDump`), { text: text, createdAt: Timestamp.now() });
    };

    const handleDeleteBrainDumpItem = async (itemId) => {
        if (!userId) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/brainDump`, itemId));
    };

    const handleOpenConvertToTask = (item) => {
        setTaskPrefill({ name: item.text });
        setConvertingItem({ ...item, type: 'task' });
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleOpenConvertToProject = (item) => {
        setProjectPrefill({ name: item.text });
        setConvertingItem({ ...item, type: 'project' });
        setEditingProject(null);
        setIsProjectModalOpen(true);
    };

    const handleSaveAsTemplate = async (projectId) => {
        if (!userId) return;
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        
        const templateName = prompt("Ingresa un nombre para esta plantilla:", project.name);
        if (!templateName || !templateName.trim()) return;

        const projectTasks = allTasks
            .filter(t => t.projectId === projectId)
            .map(t => t.name);

        const templateData = { name: templateName, category: project.category, tasks: projectTasks };
        await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/projectTemplates`), templateData);
        alert(`¡Plantilla "${templateName}" guardada!`);
    };

    const handleAddOrUpdateProject = async (projectData, generatedTasks, templateId) => {
        if (!userId) return;
        if (editingProject) {
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/projects`, editingProject.id), projectData);
        } else {
            const newProjectData = { ...projectData, createdAt: Timestamp.now(), order: projects.length, objectives: [] };
            const newProjectRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/projects`), newProjectData);
            
            let tasksToCreate = [];
            if (templateId) {
                const template = projectTemplates.find(t => t.id === templateId);
                if (template) tasksToCreate = template.tasks;
            } else {
                tasksToCreate = generatedTasks;
            }

            if (tasksToCreate && tasksToCreate.length > 0) {
                const batch = writeBatch(db);
                tasksToCreate.forEach((taskName, index) => {
                    const newTaskRef = doc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`));
                    batch.set(newTaskRef, { name: taskName, projectId: newProjectRef.id, completed: false, createdAt: Timestamp.now(), pomoCount: 0, priority: 'Media', notes: '', order: index, subtasks: [] });
                });
                await batch.commit();
            }

            if (convertingItem && convertingItem.type === 'project') {
                await handleDeleteBrainDumpItem(convertingItem.id);
            }
        }
        setIsProjectModalOpen(false);
        setEditingProject(null);
        setProjectPrefill(null);
        setConvertingItem(null);
    };

    const handleAddOrUpdateTask = async (taskData) => {
        if (!userId) return;
        if (editingTask) {
            const originalTask = allTasks.find(t => t.id === editingTask.id);
            const dataToUpdate = { ...taskData };
            if (originalTask && originalTask.priority !== taskData.priority) dataToUpdate.order = 0;
            await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, editingTask.id), dataToUpdate);
        } else {
            const projectId = taskData.projectId || activeProjectId;
            if (!projectId) return;
            const { projectId: _, ...restOfTaskData } = taskData;
            await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), { ...restOfTaskData, projectId: projectId, completed: false, createdAt: Timestamp.now(), pomoCount: 0, subtasks: [], order: tasks.length });
            if (convertingItem && convertingItem.type === 'task') {
                await handleDeleteBrainDumpItem(convertingItem.id);
            }
        }
        setIsTaskModalOpen(false);
        setEditingTask(null);
        setTaskPrefill(null);
        setConvertingItem(null);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserId(null);
            setCurrentUser(null);
            setProjects([]);
            setAllTasks([]);
            setTasks([]);
            setActiveProjectId(null);
            setHabits([]);
            setProjectTemplates([]);
            setAnnualGoals([]);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };
    
    const handleEditProject = (project) => { setEditingProject(project); setProjectPrefill(null); setIsProjectModalOpen(true); };
    const handleDeleteProject = async (projectId) => {
        if (!userId || !window.confirm('¿Seguro que quieres eliminar este proyecto y todas sus tareas?')) return;
        await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId));
        const tasksSnapshot = await getDocs(query(collection(db, `/artifacts/${appId}/users/${userId}/tasks`), where("projectId", "==", projectId)));
        const batch = writeBatch(db);
        tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
        await batch.commit();
        if (activeProjectId === projectId) setActiveProjectId(projects.length > 1 ? projects.find(p => p.id !== projectId).id : null);
    };

    const handleEditTask = (task) => { setEditingTask(task); setTaskPrefill(null); setIsTaskModalOpen(true); };
    const handleDeleteTask = async (taskId) => { if (!userId) return; if (selectedTask && selectedTask.id === taskId) setSelectedTask(null); await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId)); };
    const handleAddSubtask = async (taskId, subtaskName) => { if (!userId) return; const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId); const newSubtask = { id: crypto.randomUUID(), name: subtaskName, completed: false }; await updateDoc(taskRef, { subtasks: arrayUnion(newSubtask) }); };
    const handleToggleSubtask = async (taskId, subtaskId, newCompletedState) => { if (!userId) return; const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId); const taskSnap = await getDoc(taskRef); if (taskSnap.exists()) { const taskData = taskSnap.data(); const updatedSubtasks = taskData.subtasks.map(st => st.id === subtaskId ? { ...st, completed: newCompletedState } : st); await updateDoc(taskRef, { subtasks: updatedSubtasks }); } };
    const handleDeleteSubtask = async (taskId, subtaskId) => { if (!userId) return; const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, taskId); const taskSnap = await getDoc(taskRef); if (taskSnap.exists()) { const taskData = taskSnap.data(); const updatedSubtasks = taskData.subtasks.filter(st => st.id !== subtaskId); await updateDoc(taskRef, { subtasks: updatedSubtasks }); } };
    const handleAddObjective = async (projectId, objectiveText) => { if (!userId) return; const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId); const newObjective = { id: crypto.randomUUID(), text: objectiveText, completed: false, completedAt: null }; await updateDoc(projectRef, { objectives: arrayUnion(newObjective) }); };
    const handleToggleObjective = async (projectId, objectiveId, newCompletedState) => { if (!userId) return; const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId); const projectSnap = await getDoc(projectRef); if (projectSnap.exists()) { const projectData = projectSnap.data(); const updatedObjectives = projectData.objectives.map(obj => obj.id === objectiveId ? { ...obj, completed: newCompletedState, completedAt: newCompletedState ? Timestamp.now() : null } : obj); await updateDoc(projectRef, { objectives: updatedObjectives }); } };
    const handleDeleteObjective = async (projectId, objectiveId) => { if (!userId) return; const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, projectId); const projectSnap = await getDoc(projectRef); if (projectSnap.exists()) { const projectData = projectSnap.data(); const objectiveToDelete = projectData.objectives.find(obj => obj.id === objectiveId); if (objectiveToDelete) await updateDoc(projectRef, { objectives: arrayRemove(objectiveToDelete) }); } };

    const handleProjectDrop = async (droppedOnProject) => {
        if (!draggingProjectId || draggingProjectId === droppedOnProject.id) return;
        const draggedIndex = projects.findIndex(p => p.id === draggingProjectId);
        const droppedOnIndex = projects.findIndex(p => p.id === droppedOnProject.id);
        const newProjects = [...projects];
        const [draggedProject] = newProjects.splice(draggedIndex, 1);
        newProjects.splice(droppedOnIndex, 0, draggedProject);
        setProjects(newProjects);
        const batch = writeBatch(db);
        newProjects.forEach((p, index) => { const projectRef = doc(db, `/artifacts/${appId}/users/${userId}/projects`, p.id); batch.update(projectRef, { order: index }); });
        await batch.commit();
        setDraggingProjectId(null);
    };

    const handleTaskDrop = async (droppedOnTask) => {
        const draggedTask = tasks.find(t => t.id === draggingTaskId);
        if (!draggingTaskId || draggingTaskId === droppedOnTask.id || draggedTask.priority !== droppedOnTask.priority) { setDraggingTaskId(null); return; }
        const samePriorityTasks = tasks.filter(t => t.priority === draggedTask.priority);
        const draggedIndex = samePriorityTasks.findIndex(t => t.id === draggingTaskId);
        const droppedOnIndex = samePriorityTasks.findIndex(t => t.id === droppedOnTask.id);
        const reorderedTasks = [...samePriorityTasks];
        const [removed] = reorderedTasks.splice(draggedIndex, 1);
        reorderedTasks.splice(droppedOnIndex, 0, removed);
        const batch = writeBatch(db);
        reorderedTasks.forEach((task, index) => { const taskRef = doc(db, `/artifacts/${appId}/users/${userId}/tasks`, task.id); batch.update(taskRef, { order: index }); });
        await batch.commit();
        setDraggingTaskId(null);
    };

    if (!isAuthReady) {
        return (<div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-center"><BrainCircuit className="mx-auto h-12 w-12 text-violet-600 animate-pulse" /><h2 className="mt-6 text-xl font-semibold">Iniciando ArtFlow AI...</h2></div></div>);
    }

    if (!userId) {
        return <AuthForm auth={auth} user={currentUser} />;
    }

    const navButtons = [
        { view: 'dashboard', icon: LayoutDashboard, label: 'Mi Día' }, { view: 'planner', icon: ClipboardList, label: 'Planificador' }, { view: 'timer', icon: Target, label: 'Tareas' }, { view: 'brain', icon: BrainCircuit, label: 'Cerebro' }, { view: 'home', icon: Home, label: 'Hogar' }, { view: 'payments', icon: FileText, label: 'Pagos' }, { view: 'advisor', icon: Compass, label: 'Mentor' }, { view: 'calendar', icon: Calendar, label: 'Calendario' }, { view: 'history', icon: History, label: 'Historial' },
    ];

    const activeProjectName = projects.find(p => p.id === activeProjectId)?.name;
    const filteredProjects = projects.filter(p => categoryFilter === 'Todos' || p.category === categoryFilter);

    const renderContent = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView tasks={tasks} activeProjectName={activeProjectName} habits={todaysHabits} onToggleHabit={handleToggleHabit} onManageHabits={() => handleOpenHabitModal()} onEditHabit={handleOpenHabitModal} annualGoals={annualGoals} onToggleGoal={handleToggleGoal} onManageGoals={handleOpenGoalModal} showWelcomeBanner={showWelcomeBanner} welcomeMessage={welcomeMessage} onDismissWelcome={() => setShowWelcomeBanner(false)} />;
            case 'planner': return <PlannerView projects={projects} allTasks={allTasks} dailyTasks={dailyTasks} onDropTask={handleDropTaskOnPlanner} onAddDailyTask={handleAddDailyTask} onToggleDailyTask={handleToggleDailyTask} onDeleteDailyTask={handleDeleteDailyTask} onTaskDragStart={handleTaskDragStart} />;
            case 'timer': return activeProjectId ? ( <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg"> <div className="flex justify-between items-center mb-4"> <h2 className="text-xl font-bold">Tareas</h2> <Tooltip text="Nueva Tarea"> <button onClick={() => { setEditingTask(null); setTaskPrefill(null); setIsTaskModalOpen(true); }} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transform hover:scale-110"> <Plus size={20} /> </button> </Tooltip> </div> <ul className="space-y-2">{tasks.length > 0 ? tasks.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} onSelect={setSelectedTask} isSelected={selectedTask?.id === t.id} onEdit={handleEditTask} onAddSubtask={handleAddSubtask} onToggleSubtask={handleToggleSubtask} onDeleteSubtask={handleDeleteSubtask} onDragStart={(e) => handleTaskDragStart(e, t)} onDrop={() => handleTaskDrop(t)} isDragging={draggingTaskId === t.id} />) : <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg"><Target size={32} className="mx-auto text-gray-400" /><p className="mt-2 text-gray-600 dark:text-gray-400">Añade tareas a tu proyecto.</p></div>}</ul> </div> ) : ( <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg text-center h-full flex flex-col justify-center items-center"> <Zap size={40} className="mx-auto text-gray-400 mb-4" /> <h3 className="text-lg font-semibold">Selecciona un proyecto</h3> <p className="mt-1 text-gray-600 dark:text-gray-400">Usa los filtros de categoría o crea un nuevo proyecto.</p> </div> );
            case 'brain': return <BrainDumpView items={brainDumpItems} onAddItem={handleAddBrainDumpItem} onDeleteItem={handleDeleteBrainDumpItem} onConvertToTask={handleOpenConvertToTask} onConvertToProject={handleOpenConvertToProject} />;
            case 'home': return <HomeMissionsContainer userId={userId} db={db} appId={appId} getWeekId={getWeekId} />;
            case 'payments': return <PaymentsCenter userId={userId} payments={payments} db={db} appId={appId} getMonthId={getMonthId} />;
            case 'advisor': return <CreativeAdvisor userId={userId} projects={projects} tasks={allTasks} habits={habits} db={db} appId={appId} getWeekId={getWeekId} getMonthId={getMonthId} />;
            case 'calendar': return <CalendarView userId={userId} tasks={allTasks} db={db} appId={appId} getMonthId={getMonthId} timestampToDateString={timestampToDateString} />;
            case 'history': return ( <> <PomodoroSummary tasks={allTasks} /> <HistoryLog userId={userId} db={db} appId={appId} formatDate={formatDate} /> </> );
            default: return null;
        }
    };

    return (
        <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-slate-800' : 'bg-gradient-to-br from-violet-100 to-rose-100'}`}>
            {showConfetti && <Confetti message="¡Listo! Un paso más cerca de tu meta." />}
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
                <div className="main-content">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <CatIcon className="h-8 w-8 text-primary" />
                            <span className="ml-3 text-2xl font-bold tracking-tight">ArtFlow AI</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-gray-500 hidden md:block">
                                {currentUser && !currentUser.isAnonymous ? currentUser.email : `Invitado: ${userId.substring(0, 6)}...`}
                            </span>
                            <Tooltip text={darkMode ? "Modo Claro" : "Modo Oscuro"}>
                                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={darkMode ? "Modo Claro" : "Modo Oscuro"} title={darkMode ? "Modo Claro" : "Modo Oscuro"}>
                                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            </Tooltip>
                            <Tooltip text="Cerrar Sesión">
                                <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Cerrar Sesión" title="Cerrar Sesión">
                                    <LogOut size={20} className="text-red-500" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </header>

            <main className="main-content py-8">
                {/* El banner se renderiza ahora en DashboardView */}
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-5 xl:col-span-4">
                        <div className="sticky top-24 flex flex-col h-[calc(100vh-7rem-4rem)]">
                            <div className="mb-6 flex-shrink-0">
                                <PomodoroTimer selectedTask={selectedTask} userId={userId} darkMode={darkMode} db={db} appId={appId} />
                            </div>
                            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col flex-grow min-h-0">
                                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                    <h2 className="text-xl font-bold">Proyectos</h2>
                                    <Tooltip text="Nuevo Proyecto">
                                        <button aria-label="Nuevo Proyecto" onClick={() => { setEditingProject(null); setProjectPrefill(null); setIsProjectModalOpen(true); }} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transform hover:scale-110">
                                            <Plus size={20} />
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className="flex-shrink-0 mb-4 overflow-x-auto pb-2">
                                    <div className="flex space-x-2">
                                        <button onClick={() => setCategoryFilter('Todos')} className={`px-3 py-1 text-sm rounded-full ${categoryFilter === 'Todos' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button>
                                        {categories.map(cat => (
                                            <button key={cat.name} onClick={() => setCategoryFilter(cat.name)} className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${categoryFilter === cat.name ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{cat.name}</button>
                                        ))}
                                    </div>
                                </div>
                                <ul className="flex-grow overflow-y-auto pr-2 -mr-2">
                                    {filteredProjects.length > 0 ? filteredProjects.map(p => {
                                        const projectTasks = allTasks.filter(t => t.projectId === p.id);
                                        const completedTasks = projectTasks.filter(t => t.completed).length;
                                        const totalTasks = projectTasks.length;
                                        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                                        return <ProjectCard key={p.id} project={p} categories={categories} onSelect={handleSelectProject} onDelete={handleDeleteProject} onEdit={handleEditProject} onSaveAsTemplate={handleSaveAsTemplate} activeProjectId={activeProjectId} progress={progress} completedTasks={completedTasks} totalTasks={totalTasks} onDragStart={() => setDraggingProjectId(p.id)} onDrop={() => handleProjectDrop(p)} isDragging={draggingProjectId === p.id} onAddObjective={handleAddObjective} onToggleObjective={handleToggleObjective} onDeleteObjective={handleDeleteObjective} />
                                    }) : <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg"><Zap size={32} className="mx-auto text-gray-400" /><p className="mt-2 text-gray-600 dark:text-gray-400">No hay proyectos en esta categoría.</p></div>}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
                        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-2 rounded-full shadow-lg flex justify-center items-center flex-wrap gap-2 sticky top-24 z-30">
                            {navButtons.map(btn => (
                                <button key={btn.view} onClick={() => setActiveView(btn.view)} className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors text-sm font-medium ${activeView === btn.view ? 'bg-indigo-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                    <btn.icon size={16} /><span>{btn.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex-grow min-h-0">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </main>

            <Modal isOpen={isProjectModalOpen} onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); setProjectPrefill(null); setConvertingItem(null); }} title={editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}>
                <ProjectForm onSubmit={handleAddOrUpdateProject} project={editingProject} prefill={projectPrefill} categories={categories} templates={projectTemplates} />
            </Modal>
            <Modal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setTaskPrefill(null); setConvertingItem(null); }} title={editingTask ? "Editar Tarea" : "Nueva Tarea"}>
                <TaskForm onSubmit={handleAddOrUpdateTask} task={editingTask || taskPrefill} projects={projects} isNewTask={!editingTask} activeProjectId={activeProjectId} />
            </Modal>
            <Modal isOpen={isHabitModalOpen} onClose={() => setIsHabitModalOpen(false)} title={editingHabit ? "Editar Hábito" : "Nuevo Hábito"}>
                <HabitForm onSubmit={handleAddOrUpdateHabit} habit={editingHabit} onDelete={handleDeleteHabit} />
            </Modal>
            <Modal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} title={editingGoal ? "Editar Meta Anual" : "Nueva Meta Anual"}>
                <AnnualGoalForm 
                    onSubmit={handleAddOrUpdateGoal}
                    goal={editingGoal}
                />
            </Modal>
        </div>
    );
}

const PomodoroSummary = ({ tasks }) => {
    const completedWithPomos = tasks.filter(t => t.completed && t.pomoCount > 0);
    if (completedWithPomos.length === 0) return null;
    return (
        <div className="mb-6">
            <h4 className="text-lg font-bold mb-2">Pomodoros por Tarea Completada</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedWithPomos.map(task => (
                    <div key={task.id} className="flex items-center bg-pink-50 dark:bg-pink-900/30 border-l-4 border-pink-400 rounded-lg p-4 shadow transition">
                        <span className="flex-1 font-semibold truncate">{task.name}</span>
                        <span className="ml-4 flex items-center text-pink-600 dark:text-pink-300 font-bold text-lg">
                            <span role="img" aria-label="tomato" className="mr-1">🍅</span>
                            {task.pomoCount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

