export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date.seconds * 1000);
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const getMonthId = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const getWeekId = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export const timestampToDateString = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getDaysRemaining = (dueDate) => {
    if (!dueDate) return { text: '', color: 'text-gray-400' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.seconds * 1000);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Atrasado por ${Math.abs(diffDays)} días`, color: 'text-red-500 font-semibold' };
    if (diffDays === 0) return { text: 'Vence hoy', color: 'text-red-500 font-bold' };
    if (diffDays === 1) return { text: 'Vence mañana', color: 'text-blue-500 font-semibold' };
    return { text: `Vence en ${diffDays} días`, color: 'text-pink-500' };
};
