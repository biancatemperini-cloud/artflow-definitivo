import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FileText, Edit2, Trash2, Plus } from 'lucide-react';
import Modal from './Modal';

const ObligationForm = ({ onSubmit, obligation }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (obligation) {
            setName(obligation.name);
            setAmount(obligation.amount);
            setDueDate(obligation.dueDate);
        } else {
            setName('');
            setAmount('');
            setDueDate('');
        }
    }, [obligation]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ name, amount: Number(amount) || 0, dueDate: Number(dueDate) || 1 });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: Monotributo" required />
            </div>
            <div>
                <label className="block text-sm font-medium">Monto</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: 25000" required />
            </div>
            <div>
                <label className="block text-sm font-medium">Día de Vencimiento</label>
                <input type="number" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min="1" max="31" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" placeholder="Ej: 20" required />
            </div>
            <div className="flex justify-end pt-2">
                <button type="submit" className="inline-flex justify-center py-2 px-4 border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700">{obligation ? 'Actualizar' : 'Guardar'}</button>
            </div>
        </form>
    );
};

const PaymentsCenter = ({ userId, db, appId, getMonthId, payments: initialPayments }) => {
    const [obligations, setObligations] = useState(initialPayments);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObligation, setEditingObligation] = useState(null);

    useEffect(() => {
        setObligations(initialPayments);
        setIsLoading(false);
    }, [initialPayments]);
    

    const handleAddOrUpdateObligation = async (data) => {
        if (!userId) return;

        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        
        if (editingObligation) { 
            const updatedObligations = obligations.map(o => o.id === editingObligation.id ? { ...o, ...data } : o);
            await setDoc(configRef, { obligations: updatedObligations });
        } else { 
            const newObligation = { ...data, id: crypto.randomUUID() };
            await updateDoc(configRef, { obligations: arrayUnion(newObligation) });
        }
        
        setEditingObligation(null);
        setIsModalOpen(false);
    };

    const handleDeleteObligation = async (obligationToDelete) => {
        if (!userId || !window.confirm(`¿Seguro que quieres eliminar "${obligationToDelete.name}" de tus obligaciones recurrentes?`)) return;
        const configRef = doc(db, `/artifacts/${appId}/users/${userId}/configs`, 'monthlyObligations');
        const obligationsToKeep = obligations.filter(ob => ob.id !== obligationToDelete.id).map(({paid, ...rest}) => rest); // remove paid status before saving
        await setDoc(configRef, { obligations: obligationsToKeep });
    };

    const handleTogglePaid = async (obligationId, newPaidStatus) => {
        if (!userId) return;
        const currentMonthId = getMonthId(new Date());
        const statusRef = doc(db, `/artifacts/${appId}/users/${userId}/monthlyStatus`, currentMonthId);
        await setDoc(statusRef, { [obligationId]: newPaidStatus }, { merge: true });

        setObligations(obligations.map(ob => ob.id === obligationId ? { ...ob, paid: newPaidStatus } : ob));
    };

    const totalAmount = obligations.reduce((sum, ob) => sum + (Number(ob.amount) || 0), 0);
    const paidAmount = obligations.reduce((sum, ob) => ob.paid ? sum + (Number(ob.amount) || 0) : sum, 0);

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <div className="text-center mb-6">
                    <FileText className="mx-auto h-10 w-10 text-pink-500" />
                    <h3 className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">Centro de Pagos Mensuales</h3>
                    <p className="text-gray-600 dark:text-gray-400">Controla tus gastos fijos del mes.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-300">Total a Pagar</p>
                        <p className="text-2xl font-bold">${totalAmount.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-300">Total Pagado</p>
                        <p className="text-2xl font-bold">${paidAmount.toLocaleString('es-AR')}</p>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {isLoading ? <p>Cargando...</p> : obligations.map(ob => (
                        <div key={ob.id} className={`p-3 rounded-lg flex items-center gap-4 transition-colors ${ob.paid ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-700'}`}>
                            <input type="checkbox" checked={ob.paid} onChange={() => handleTogglePaid(ob.id, !ob.paid)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"/>
                            <div className="flex-1">
                                <p className={`font-semibold ${ob.paid ? 'line-through text-gray-500' : ''}`}>{ob.name}</p>
                                <p className="text-xs text-gray-500">Vence el día {ob.dueDate}</p>
                            </div>
                            <p className={`font-semibold text-lg flex-shrink-0 ${ob.paid ? 'text-gray-500' : ''}`}>${(Number(ob.amount) || 0).toLocaleString('es-AR')}</p>
                            <button onClick={() => { setEditingObligation(ob); setIsModalOpen(true); }} className="text-gray-400 hover:text-indigo-500"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteObligation(ob)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={() => { setEditingObligation(null); setIsModalOpen(true); }} className="w-full py-2 px-4 bg-pink-600 text-white rounded-md hover:bg-pink-700 flex items-center justify-center gap-2">
                    <Plus size={20} /> Añadir Obligación
                </button>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingObligation ? "Editar Obligación" : "Nueva Obligación"}>
                <ObligationForm onSubmit={handleAddOrUpdateObligation} obligation={editingObligation} />
            </Modal>
        </>
    );
};

export default PaymentsCenter;

