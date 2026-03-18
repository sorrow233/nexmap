import React, { useCallback } from 'react';
import MobileBoardShell from './MobileBoardShell';
import { useStore } from '../../../store/useStore';

const MobileBoardRuntime = React.memo(function MobileBoardRuntime({
    board,
    syncStatus,
    untitledLabel,
    onBack,
    onCreateNote,
    onOpenInstructions,
    onOpenSettings,
    onOpenConversationCard,
    onOpenNote,
    onQuickSprout,
    onExpandTopics,
    onDeleteSelection,
    isReadOnly = false
}) {
    const cards = useStore(state => state.cards);
    const selectedIds = useStore(state => state.selectedIds);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const setSelectedIds = useStore(state => state.setSelectedIds);

    const handleOpenCard = useCallback((cardId) => {
        const targetCard = useStore.getState().getCardById?.(cardId);
        if (!targetCard || targetCard.deletedAt) return;

        if (targetCard.type === 'note') {
            onOpenNote(cardId);
            return;
        }

        onOpenConversationCard(cardId);
    }, [onOpenConversationCard, onOpenNote]);

    const handleEnterSelectionMode = useCallback((cardId) => {
        if (isReadOnly) return;
        setSelectedIds((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            return current.includes(cardId) ? current : [...current, cardId];
        });
    }, [isReadOnly, setSelectedIds]);

    const handleToggleSelection = useCallback((cardId) => {
        if (isReadOnly) return;
        setSelectedIds((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            return current.includes(cardId)
                ? current.filter((id) => id !== cardId)
                : [...current, cardId];
        });
    }, [isReadOnly, setSelectedIds]);

    const handleClearSelection = useCallback(() => {
        setSelectedIds([]);
    }, [setSelectedIds]);

    return (
        <MobileBoardShell
            board={board}
            cards={cards}
            selectedIds={isReadOnly ? [] : selectedIds}
            generatingCardIds={generatingCardIds}
            syncStatus={syncStatus}
            untitledLabel={untitledLabel}
            onBack={onBack}
            onCreateNote={onCreateNote}
            onOpenInstructions={onOpenInstructions}
            onOpenSettings={onOpenSettings}
            onOpenCard={handleOpenCard}
            onEnterSelectionMode={handleEnterSelectionMode}
            onToggleSelection={handleToggleSelection}
            onClearSelection={handleClearSelection}
            onQuickSprout={onQuickSprout}
            onExpandTopics={onExpandTopics}
            onDeleteSelection={onDeleteSelection}
        />
    );
});

export default MobileBoardRuntime;
