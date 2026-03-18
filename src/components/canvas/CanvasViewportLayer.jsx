import React from 'react';
import Card from '../Card';
import StickyNote from '../StickyNote';
import Zone from '../Zone';
import ConnectionLayer from '../ConnectionLayer';
import ActiveConnectionLayer from '../ActiveConnectionLayer';
import ErrorBoundary from '../ErrorBoundary';

const CanvasViewportLayer = React.memo(function CanvasViewportLayer({
    contentRef,
    visibleGroups,
    connectionCards,
    connectionCardMap,
    visibleConnections,
    visibleCards,
    selectedIdSet,
    targetCardIds,
    isConnecting,
    connectionStartId,
    onSelect,
    onMove,
    onDelete,
    onUpdate,
    onDragEnd,
    onConnect,
    onExpand,
    onCreateNote,
    onCardFullScreen,
    onPromptDrop,
    onCustomSprout,
    onSummarize,
    offset,
    scale
}) {
    return (
        <>
            <ConnectionLayer
                cards={connectionCards}
                cardMap={connectionCardMap}
                connections={visibleConnections}
                offset={offset}
                scale={scale}
            />

            <ActiveConnectionLayer
                cards={connectionCards}
                cardMap={connectionCardMap}
                connections={visibleConnections}
                selectedIdSet={selectedIdSet}
                offset={offset}
                scale={scale}
            />

            <div
                ref={contentRef}
                className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform pointer-events-none"
            >
                {visibleGroups && visibleGroups.map(({ group, rect, stats }) => (
                    <div key={group.id} className="pointer-events-auto">
                        <Zone
                            group={group}
                            rect={rect}
                            stats={stats}
                            isSelected={false}
                        />
                    </div>
                ))}

                {visibleCards.map((card) => {
                    const Component = card.type === 'note' ? StickyNote : Card;
                    return (
                        <ErrorBoundary key={card.id} level="card">
                            <Component
                                data={card}
                                isSelected={selectedIdSet.has(card.id)}
                                isTarget={targetCardIds.has(card.id)}
                                onSelect={onSelect}
                                onMove={onMove}
                                onDelete={onDelete}
                                onUpdate={onUpdate}
                                onDragEnd={onDragEnd}
                                onConnect={onConnect}
                                onExpand={onExpand}
                                isConnecting={isConnecting}
                                isConnectionStart={connectionStartId === card.id}
                                onCreateNote={onCreateNote}
                                onCardFullScreen={onCardFullScreen}
                                onPromptDrop={onPromptDrop}
                                onCustomSprout={onCustomSprout}
                                onSummarize={onSummarize}
                            />
                        </ErrorBoundary>
                    );
                })}
            </div>
        </>
    );
});

export default CanvasViewportLayer;
