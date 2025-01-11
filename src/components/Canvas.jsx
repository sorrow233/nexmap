import React, { useState, useRef } from 'react';
import Card from './Card';

export default function Canvas({ cards, onUpdateCards, onSelectionChange, onExpandCard }) {
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const panStart = useRef({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    const handleCardSelect = (e, id) => {
        const newSelected = new Set(selectedIds);

        if (e.shiftKey) {
            if (newSelected.has(id)) {
                newSelected.delete(id);
            } else {
                newSelected.add(id);
            }
        } else {
            if (!newSelected.has(id)) {
                newSelected.clear();
                newSelected.add(id);
            }
        }

        setSelectedIds(newSelected);
        onSelectionChange(Array.from(newSelected));
    };

    const handleCanvasClick = (e) => {
        if (e.target === e.currentTarget) {
            setSelectedIds(new Set());
            onSelectionChange([]);
        }
    };

    const handleCardMove = (id, newX, newY) => {
        const card = cards.find(c => c.id === id);
        if (!card) return;

        const deltaX = newX - card.x;
        const deltaY = newY - card.y;

        if (selectedIds.has(id)) {
            const updatedCards = cards.map(c => {
                if (selectedIds.has(c.id)) {
                    return { ...c, x: c.x + deltaX, y: c.y + deltaY };
                }
                return c;
            });
            onUpdateCards(updatedCards);
        } else {
            const updatedCards = cards.map(c =>
                c.id === id ? { ...c, x: newX, y: newY } : c
            );
            onUpdateCards(updatedCards);
        }
    };

    const handleDeleteCard = (id) => {
        const updated = cards.filter(c => c.id !== id);
        onUpdateCards(updated);
        if (selectedIds.has(id)) {
            const newSel = new Set(selectedIds);
            newSel.delete(id);
            setSelectedIds(newSel);
            onSelectionChange(Array.from(newSel));
        }
    };

    const handleMouseDown = (e) => {
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
            <div
                style={{
                    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                    width: '0px', height: '0px',
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

            <div className="absolute bottom-4 left-4 text-xs text-slate-400 pointer-events-none">
                Canvas: {Math.round(canvasOffset.x)}, {Math.round(canvasOffset.y)} | Objects: {cards.length}
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') window.Canvas = Canvas;
