import React from 'react';

/**
 * Pro Badge Component
 * Displays a stylish "PRO" badge for upgraded users.
 */
export default function ProBadge({ className = '', size = 'md' }) {
    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-3 py-1'
    };

    return (
        <span className={`
            inline-flex items-center justify-center
            font-black tracking-wider text-white
            bg-gradient-to-r from-amber-400 via-orange-500 to-red-500
            rounded-md shadow-sm
            uppercase select-none
            animate-shine bg-[length:200%_100%]
            ${sizeClasses[size]}
            ${className}
        `}>
            PRO
        </span>
    );
}

// Add CSS animation for shine effect if not already present globally
const style = document.createElement('style');
style.textContent = `
    @keyframes shine {
        0% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .animate-shine {
        animation: shine 3s infinite linear;
    }
`;
document.head.appendChild(style);
