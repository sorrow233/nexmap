
import React, { useRef, useEffect, useState } from 'react';
import Card from './Card';

export default function Canvas({
    cards,
    connections = [],
    selectedIds = [], // Receive selection state
    onUpdateCards,
    onCardMove,
    onSelectionChange,
    onExpandCard,
    onConnect,
    isConnecting,
    connectionStartId
}) {
    const canvasRef = useRef(null);
    const [panning, setPanning] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    // Convert screen to canvas coordinates
    const toCanvasCoords = (clientX, clientY) => {
        return {
            x: (clientX - offset.x) / scale,
            y: (clientY - offset.y) / scale
        };
    };

    // Only handle panning here. Card movement is delegated to Card component + App handler
    const handleMouseDown = (e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            setPanning(true);
            // Clear selection on canvas click
            if (onSelectionChange) onSelectionChange([]);
        }
    };

    const handleCardSelect = (id) => {
        if (!onSelectionChange) return;
        // Simple single selection or toggle for now
        // TODO: Shift+Click logic if needed, but keeping simple for fix
        const newSelection = selectedIds.includes(id) ? [] : [id];
        // Or if we want additive:
        // const newSelection = [id]; 
        onSelectionChange(newSelection);
    };

    const handleMouseMove = (e) => {
        if (panning) {
            setOffset(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
        }
    };

    const handleMouseUp = () => {
        setPanning(false);
    };

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            setScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
        } else {
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    return (
        <div
            ref={canvasRef}
            className="w-full h-full overflow-hidden bg-[#f0f4f8] relative cursor-grab active:cursor-grabbing canvas-bg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
        >
            <div
                className="absolute top-0 left-0 w-full h-full origin-top-left transition-transform duration-75 ease-out will-change-transform pointer-events-none"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
            >
                {/* Connection Lines Layer */}
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
                    {connections.map((conn, idx) => {
                        const fromCard = cards.find(c => c.id === conn.from);
                        const toCard = cards.find(c => c.id === conn.to);
                        if (!fromCard || !toCard) return null;

                        // Calculate centers (approximate, assuming card width 320, height dynamic but starts ~200)
                        const startX = fromCard.x + 160;
                        const startY = fromCard.y + 100; // rough center
                        const endX = toCard.x + 160;
                        const endY = toCard.y + 100;

                        return (
                            <line
                                key={`${conn.from}-${conn.to}-${idx}`}
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke="#94a3b8" // slate-400
                                strokeWidth="3"
                                strokeDasharray="6 4" // Dashed line styling
                                className="opacity-60"
                            />
                        );
                    })}

                    {/* Active Connection Line Preview */}
                    {isConnecting && connectionStartId && (
                        // We'd need mouse position here to draw line to cursor. 
                        // Omitted for simplicity, we rely on "click source, click target" UI.
                        null
                    )}
                </svg>

                {/* Cards Layer */}
                {cards.map(card => (
                    <Card
                        key={card.id}
                        data={card}
                        isSelected={selectedIds.includes(card.id)}
                        onSelect={handleCardSelect}
                        onMove={(id, x, y) => onCardMove && onCardMove(id, x, y)}
                        onExpand={() => onExpandCard(card.id)}
                        scale={scale}
                        onConnect={() => onConnect && onConnect(card.id)}
                        isConnecting={isConnecting}
                        isConnectionStart={connectionStartId === card.id}
                    />
                ))}
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-4 left-4 text-slate-400 text-xs font-mono pointer-events-none select-none">
                Canvas: {Math.round(offset.x)}, {Math.round(offset.y)} | Objects: {cards.length}
            </div>
        </div>
    );
}
