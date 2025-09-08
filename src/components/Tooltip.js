import React from 'react';

const Tooltip = ({ text, children }) => (
    <div className="relative group flex justify-center">
        {children}
        <span className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
            {text}
        </span>
    </div>
);

export default Tooltip;