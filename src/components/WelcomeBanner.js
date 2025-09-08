import React from 'react';
import { Sparkles, X } from 'lucide-react';

const WelcomeBanner = ({ message, onDismiss }) => {
    return (
        <div className="relative bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center">
                <Sparkles className="h-6 w-6 mr-3 flex-shrink-0" />
                <p className="font-medium text-sm">{message}</p>
            </div>
            <button
                onClick={onDismiss}
                aria-label="Cerrar mensaje de bienvenida"
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
};

export default WelcomeBanner;
