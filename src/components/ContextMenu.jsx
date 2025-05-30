import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Copy,
    Trash2,
    Star,
    Sparkles,
    Link,
    StickyNote,
    MessageSquare,
    Clipboard,
    Unlink
} from 'lucide-react';

// Context Menu Context for global state
const ContextMenuContext = React.createContext(null);

export function useContextMenu() {
    const context = React.useContext(ContextMenuContext);
    if (!context) {
        throw new Error('useContextMenu must be used within a ContextMenuProvider');
    }
    return context;
}

// Menu Item Component
function MenuItem({ icon: Icon, label, onClick, danger = false, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-150 text-left
                ${disabled
                    ? 'text-slate-400 cursor-not-allowed'
                    : danger
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }
            `}
        >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
        </button>
    );
}

// Separator Component
function Separator() {
    return <div className="h-px bg-slate-200 dark:bg-slate-600 my-1" />;
}

// Context Menu Panel
function ContextMenuPanel({ x, y, items, onClose }) {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    const [adjustedPos, setAdjustedPos] = useState({ x, y });

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = x;
            let newY = y;

            if (x + rect.width > viewportWidth) {
                newX = viewportWidth - rect.width - 10;
            }
            if (y + rect.height > viewportHeight) {
                newY = viewportHeight - rect.height - 10;
            }

            setAdjustedPos({ x: newX, y: newY });
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] py-2 px-1 bg-white dark:bg-slate-800 
                       rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
                       animate-scale-in backdrop-blur-sm"
            style={{
                left: adjustedPos.x,
                top: adjustedPos.y,
                transformOrigin: 'top left'
            }}
        >
            {items.map((item, index) => {
                if (item.type === 'separator') {
                    return <Separator key={index} />;
                }
                return (
                    <MenuItem
                        key={index}
                        icon={item.icon}
                        label={item.label}
                        onClick={() => {
                            item.onClick?.();
                            onClose();
                        }}
                        danger={item.danger}
                        disabled={item.disabled}
                    />
                );
            })}
        </div>
    );
}

// Context Menu Provider
export function ContextMenuProvider({ children }) {
    const [menu, setMenu] = useState(null);

    const showContextMenu = useCallback((x, y, items) => {
        setMenu({ x, y, items });
    }, []);

    const hideContextMenu = useCallback(() => {
        setMenu(null);
    }, []);

    // Card context menu items generator
    const getCardMenuItems = useCallback((card, handlers) => {
        const { onCopy, onDelete, onToggleFavorite, onExpand, onConnect, isFavorite } = handlers;
        return [
            { icon: Copy, label: '复制内容', onClick: onCopy },
            { type: 'separator' },
            { icon: Star, label: isFavorite ? '取消收藏' : '收藏', onClick: onToggleFavorite },
            { icon: Sparkles, label: 'AI 扩展', onClick: onExpand },
            { icon: Link, label: '创建连接', onClick: onConnect },
            { type: 'separator' },
            { icon: Trash2, label: '删除', onClick: onDelete, danger: true }
        ];
    }, []);

    // Canvas context menu items generator
    const getCanvasMenuItems = useCallback((position, handlers) => {
        const { onCreateCard, onCreateNote, onPaste, canPaste } = handlers;
        return [
            { icon: MessageSquare, label: '新建卡片', onClick: () => onCreateCard(position) },
            { icon: StickyNote, label: '新建便签', onClick: () => onCreateNote(position) },
            { type: 'separator' },
            { icon: Clipboard, label: '粘贴', onClick: onPaste, disabled: !canPaste }
        ];
    }, []);

    // Connection context menu items generator
    const getConnectionMenuItems = useCallback((connection, handlers) => {
        const { onDelete } = handlers;
        return [
            { icon: Unlink, label: '删除连线', onClick: onDelete, danger: true }
        ];
    }, []);

    const value = {
        showContextMenu,
        hideContextMenu,
        getCardMenuItems,
        getCanvasMenuItems,
        getConnectionMenuItems
    };

    return (
        <ContextMenuContext.Provider value={value}>
            {children}
            {menu && (
                <ContextMenuPanel
                    x={menu.x}
                    y={menu.y}
                    items={menu.items}
                    onClose={hideContextMenu}
                />
            )}
        </ContextMenuContext.Provider>
    );
}

export default ContextMenuPanel;
