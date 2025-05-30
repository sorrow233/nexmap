import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, Undo2 } from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

// Toast Types Configuration
const TOAST_CONFIG = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-emerald-500',
        borderClass: 'border-emerald-400',
        textClass: 'text-white'
    },
    error: {
        icon: XCircle,
        bgClass: 'bg-red-500',
        borderClass: 'border-red-400',
        textClass: 'text-white'
    },
    warning: {
        icon: AlertCircle,
        bgClass: 'bg-amber-500',
        borderClass: 'border-amber-400',
        textClass: 'text-white'
    },
    info: {
        icon: Info,
        bgClass: 'bg-blue-500',
        borderClass: 'border-blue-400',
        textClass: 'text-white'
    }
};

// Individual Toast Component
function Toast({ id, message, type = 'info', duration = 3000, onClose, onUndo }) {
    const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
    const Icon = config.icon;
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => onClose(id), 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, id, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border
                transform transition-all duration-300 ease-out
                ${config.bgClass} ${config.borderClass} ${config.textClass}
                ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
                backdrop-blur-sm
            `}
            role="alert"
        >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{message}</span>
            {onUndo && (
                <button
                    onClick={() => {
                        onUndo();
                        handleClose();
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
                >
                    <Undo2 size={12} />
                    Undo
                </button>
            )}
            <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-2 pointer-events-auto">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
}

// Toast Provider Component
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, options = {}) => {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            message,
            type: options.type || 'info',
            duration: options.duration ?? 3000,
            onUndo: options.onUndo
        };
        setToasts(prev => [...prev, toast]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Use useMemo to create stable context value with convenience methods
    const contextValue = React.useMemo(() => {
        const toast = (message, options) => addToast(message, options);
        toast.success = (message, options) => addToast(message, { ...options, type: 'success' });
        toast.error = (message, options) => addToast(message, { ...options, type: 'error' });
        toast.warning = (message, options) => addToast(message, { ...options, type: 'warning' });
        toast.info = (message, options) => addToast(message, { ...options, type: 'info' });
        return toast;
    }, [addToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export default Toast;
