const { useState, useEffect, useRef } = React;

// We export this to the global scope since we don't have a module bundler
// usage: <window.Card ... /> or just <Card ... /> if we destructure it in App

window.Card = ({
    id,
    data,
    x, y,
    isSelected,
    onSelect,
    onMove,
    onExpand,
    onDelete
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    // Initial Z-Index boost when selected
    const zIndex = isSelected ? 50 : 10;

    const handleMouseDown = (e) => {
        // Prevent drag if clicking buttons
        if (e.target.closest('button') || e.target.closest('.no-drag')) return;

        e.stopPropagation(); // Prevent canvas drag
        onSelect(e); // Trigger selection (logic handled in parent for multi-select)

        const rect = cardRef.current.getBoundingClientRect();
        // Calculate offset from the top-left of the card
        // We need to account that x,y are absolute canvas coordinates
        // Mouse event is viewport relative.
        // We'll rely on parent passing valid screen handling or just generic delta tracking.
        // Easier: Track delta from mouse down.

        setIsDragging(true);
        setDragOffset({
            startX: e.clientX,
            startY: e.clientY,
            origX: x,
            origY: y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - dragOffset.startX;
            const dy = e.clientY - dragOffset.startY;

            onMove(id, dragOffset.origX + dx, dragOffset.origY + dy);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, id, onMove]);

    // Parse the last message for the preview
    const lastMessage = data.messages && data.messages.length > 0
        ? data.messages[data.messages.length - 1].content
        : "Empty conversation";

    // Truncate for preview
    const previewText = lastMessage.length > 150
        ? lastMessage.substring(0, 150) + "..."
        : lastMessage;

    return (
        <div
            ref={cardRef}
            onMouseDown={handleMouseDown}
            style={{
                transform: `translate(${x}px, ${y}px)`,
                width: '320px',
                zIndex: zIndex
            }}
            className={`
                absolute top-0 left-0 
                bg-white rounded-2xl shadow-lg 
                transition-shadow duration-200 
                flex flex-col overflow-hidden
                cursor-grab active:cursor-grabbing
                border-2 
                ${isSelected ? 'border-brand-500 shadow-xl shadow-brand-500/20' : 'border-transparent hover:shadow-xl'}
            `}
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-white select-none flex justify-between items-center">
                <div className="font-semibold text-slate-800 truncate pr-2" title={data.title}>
                    {data.title || "New Chat"}
                </div>
                <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                        title="Delete"
                    >
                        <i data-lucide="trash-2" className="w-4 h-4"></i>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(id); }}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-brand-600 rounded"
                        title="Expand"
                    >
                        <i data-lucide="maximize-2" className="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 bg-slate-50/50 flex-grow min-h-[100px] max-h-[200px] overflow-hidden relative">
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {previewText}
                </p>
                {/* Fade out at bottom */}
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
            </div>

            {/* Footer / Status */}
            <div className="px-4 py-2 bg-white text-xs text-slate-400 flex justify-between items-center border-t border-slate-50">
                <span>{data.messages.length} msgs</span>
                <span className="uppercase tracking-wider font-bold text-[10px]">{data.model || 'GPT-3.5'}</span>
            </div>

            {/* Selection Indicator Overlay (optional, maybe redundant with border) */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-brand-500 rounded-full border-2 border-white shadow-sm pointer-events-none"></div>
            )}
        </div>
    );
};
