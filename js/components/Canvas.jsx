const { useState, useRef, useEffect } = React;

// Since we don't have modules, we access Card from global window
const Card = window.Card;

window.Canvas = ({ cards, onUpdateCards, onSelectionChange, onExpandCard }) => {
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const panStart = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // --- Selection Logic ---
    const handleCardSelect = (e, id) => {
        const newSelected = new Set(selectedIds);

        if (e.shiftKey) {
            // Toggle
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
        } else {
            // Single select if not already selected
            // (If sticking to standard UX: clicking an already selected one shouldn't deselect others immediately if dragging, 
            // but for simple click, it normally resets selection to just this one)
            if (!newSelected.has(id)) {
                newSelected.clear();
                newSelected.add(id);
            }
            // If already selected, do nothing (wait for proper drag handling logic generally, but here is fine)
        }

        setSelectedIds(newSelected);
        onSelectionChange(Array.from(newSelected));
    };

    const handleCanvasClick = (e) => {
        // Deselect if clicking on empty canvas
        if (e.target === e.currentTarget) {
            setSelectedIds(new Set());
            onSelectionChange([]);
        }
    };

    // --- Card Movement Logic ---
    const handleCardMove = (id, newX, newY) => {
        // Find delta for the primary moved card
        const card = cards.find(c => c.id === id);
        if (!card) return;

        const deltaX = newX - card.x;
        const deltaY = newY - card.y;

        // Move ALL selected cards if the moved card is part of selection
        if (selectedIds.has(id)) {
            const updatedCards = cards.map(c => {
                if (selectedIds.has(c.id)) {
                    return { ...c, x: c.x + deltaX, y: c.y + deltaY };
                }
                return c;
            });
            onUpdateCards(updatedCards);
        } else {
            // Just move the one non-selected card
            const updatedCards = cards.map(c =>
                c.id === id ? { ...c, x: newX, y: newY } : c
            );
            onUpdateCards(updatedCards);
        }
    };

    const handleDeleteCard = (id) => {
        const updated = cards.filter(c => c.id !== id);
        onUpdateCards(updated);
        // also remove from selection
        if (selectedIds.has(id)) {
            const newSel = new Set(selectedIds);
            newSel.delete(id);
            setSelectedIds(newSel);
            onSelectionChange(Array.from(newSel));
        }
    };

    // --- Canvas Panning Logic ---
    // Middle click or Space+Drag (simulated here with just specific area drag if needed, 
    // strictly, Mixboard allows panning by dragging empty space)

    const handleMouseDown = (e) => {
        // If target is the canvas background
        if (e.target === e.currentTarget) {
            setIsPanning(true);
            panStart.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;

            setCanvasOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            panStart.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = (e) => {
        if (isPanning) {
            setIsPanning(false);
            e.currentTarget.style.cursor = 'default';
        }
    };

    // Wheel to pan (Optional, vertical/horizontal)
    const handleWheel = (e) => {
        // e.preventDefault(); // browser handles zoom with ctrl, this might interrupt. 
        // Let's keep it simple: Drag to pan.
    };

    return (
        <div
            ref={canvasRef}
            className="w-full h-full relative overflow-hidden bg-slate-50 select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
            }}
        >
            {/* 
               We render cards relative to the container. 
               However, to support infinite panning, it's easier to put them in a container 
               that transforms with canvasOffset.
            */}
            <div
                style={{
                    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                    width: '0px', height: '0px', // wrapper shouldn't take space
                    position: 'absolute', top: 0, left: 0
                }}
            >
                {cards.map(card => (
                    <Card
                        key={card.id}
                        {...card}
                        isSelected={selectedIds.has(card.id)}
                        onSelect={(e) => handleCardSelect(e, card.id)}
                        onMove={handleCardMove}
                        onExpand={onExpandCard}
                        onDelete={handleDeleteCard}
                    />
                ))}
            </div>

            {/* Overlay Info (Debug or Controls) */}
            <div className="absolute bottom-4 left-4 text-xs text-slate-400 pointer-events-none">
                Canvas: {Math.round(canvasOffset.x)}, {Math.round(canvasOffset.y)} | Objects: {cards.length}
            </div>
        </div>
    );
};
