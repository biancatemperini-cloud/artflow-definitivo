import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { PlusCircle, Edit, Trash2, X } from 'lucide-react';

const PaymentsCenter = ({ userId, db, appId, getMonthId, getYearId }) => {
    const [obligations, setObligations] = useState([]);
    const [payments, setPayments] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentObligation, setCurrentObligation] = useState({ name: '', amount: '', dueDate: '10' });
    const [editingId, setEditingId] = useState(null);

    const monthId = getMonthId(new Date());
    const yearId = getYearId(new Date());

    useEffect(() => {
        if (!userId) return;
        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        const unsubscribe = onSnapshot(configRef, (doc) => {
            if (doc.exists()) {
                setObligations(doc.data().obligations || []);
            }
        });
        return unsubscribe;
    }, [userId, db, appId]);

    const fetchPayments = useCallback(async () => {
        if (!userId) return;
        const paymentsRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyPayments`, monthId);
        const unsubscribe = onSnapshot(paymentsRef, (doc) => {
            if (doc.exists()) {
                setPayments(doc.data().payments || []);
            } else {
                const initialPayments = obligations.map(ob => ({...ob, paid: false}));
                setPayments(initialPayments);
                if (initialPayments.length > 0) {
                     setDoc(paymentsRef, { payments: initialPayments, year: yearId });
                }
            }
        });
        return unsubscribe;
    }, [userId, db, appId, monthId, yearId, obligations]);

    useEffect(() => {
        const unsubscribe = fetchPayments();
        return () => unsubscribe.then(unsub => unsub && unsub());
    }, [fetchPayments]);
    

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!userId) return;

        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        const obligationToSave = {
            id: editingId || new Date().getTime().toString(),
            name: currentObligation.name,
            amount: parseFloat(currentObligation.amount),
            dueDate: parseInt(currentObligation.dueDate, 10)
        };
        
        if (editingId) {
            const oldObligation = obligations.find(ob => ob.id === editingId);
            await updateDoc(configRef, {
                obligations: arrayRemove(oldObligation)
            });
            await updateDoc(configRef, {
                obligations: arrayUnion(obligationToSave)
            });
        } else {
            await updateDoc(configRef, {
                obligations: arrayUnion(obligationToSave)
            });
        }
        
        resetForm();
    };
    
    const handleDeleteObligation = async (obligationToDelete) => {
        if (!userId || !window.confirm(`¿Seguro que quieres eliminar "${obligationToDelete.name}" de tus obligaciones recurrentes?`)) return;

        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        
        // El objeto a eliminar debe coincidir exactamente con el almacenado en Firestore
        const obligationToRemove = {
            id: obligationToDelete.id,
            name: obligationToDelete.name,
            amount: obligationToDelete.amount,
            dueDate: obligationToDelete.dueDate
        };
        
        await updateDoc(configRef, {
            obligations: arrayRemove(obligationToRemove)
        });
    };

    const handleTogglePaid = async (paymentId) => {
        const paymentsRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyPayments`, monthId);
        const updatedPayments = payments.map(p => 
            p.id === paymentId ? { ...p, paid: !p.paid } : p
        );
        await setDoc(paymentsRef, { payments: updatedPayments, year: yearId }, { merge: true });
    };

    const resetForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setCurrentObligation({ name: '', amount: '', dueDate: '10' });
    };

    const openEditForm = (obligation) => {
        setEditingId(obligation.id);
        setCurrentObligation(obligation);
        setIsFormOpen(true);
    };

    const totalObligations = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payments.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalObligations - totalPaid;

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Centro de Pagos Mensual</h2>

            {/* Resumen Financiero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total del Mes</p>
                    <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">${totalObligations.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-100 dark:bg-green-900/40 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-300">Total Pagado</p>
                    <p className="text-2xl font-semibold text-green-800 dark:text-green-200">${totalPaid.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-300">Restante</p>
                    <p className="text-2xl font-semibold text-red-800 dark:text-red-200">${remaining.toFixed(2)}</p>
                </div>
            </div>

            {/* Lista de Pagos del Mes */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Pagos de este Mes</h3>
                <div className="space-y-2">
                    {payments.sort((a,b) => a.dueDate - b.dueDate).map(payment => (
                        <div key={payment.id} className={`flex items-center p-3 rounded-lg ${payment.paid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                            <input type="checkbox" checked={payment.paid} onChange={() => handleTogglePaid(payment.id)} className="h-5 w-5 rounded text-violet-600 focus:ring-violet-500 border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-offset-gray-800" />
                            <span className={`flex-1 ml-3 ${payment.paid ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{payment.name}</span>
                            <span className={`font-medium mr-4 ${payment.paid ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>${payment.amount.toFixed(2)}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Vence el {payment.dueDate}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Configuración de Obligaciones Recurrentes */}
            <div>
                <h3 className="text-xl font-semibold mb-3">Configurar Obligaciones Recurrentes</h3>
                <div className="space-y-2 mb-4">
                    {obligations.map(ob => (
                        <div key={ob.id} className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <span className="flex-1 text-gray-800 dark:text-gray-200">{ob.name} - ${ob.amount.toFixed(2)} (Vence el {ob.dueDate})</span>
                            <button onClick={() => openEditForm(ob)} className="p-1 text-gray-500 hover:text-blue-500"><Edit size={16}/></button>
                            <button onClick={() => handleDeleteObligation(ob)} className="p-1 text-gray-500 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                {!isFormOpen && (
                    <button onClick={() => setIsFormOpen(true)} className="flex items-center text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200">
                        <PlusCircle size={20} className="mr-2"/> Añadir obligación recurrente
                    </button>
                )}
                {isFormOpen && (
                    <form onSubmit={handleFormSubmit} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold">{editingId ? 'Editar' : 'Nueva'} Obligación</h4>
                            <button type="button" onClick={resetForm}><X size={18}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input type="text" placeholder="Nombre (ej. Alquiler)" value={currentObligation.name} onChange={e => setCurrentObligation({...currentObligation, name: e.target.value})} required className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            <input type="number" placeholder="Monto" value={currentObligation.amount} onChange={e => setCurrentObligation({...currentObligation, amount: e.target.value})} required className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            <input type="number" placeholder="Día de Vencimiento" value={currentObligation.dueDate} onChange={e => setCurrentObligation({...currentObligation, dueDate: e.target.value})} required min="1" max="31" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <button type="submit" className="mt-3 w-full px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 dark:focus:ring-offset-gray-800">{editingId ? 'Actualizar' : 'Guardar'} Obligación</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PaymentsCenter;