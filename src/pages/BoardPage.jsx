import React, { Suspense, useEffect } from 'react';
import { Star, RefreshCw, Trash2, Sprout, BoxSelect, AlertCircle } from 'lucide-react';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';
import StatusBar from '../components/StatusBar';
import BoardTopBar from '../components/board/BoardTopBar';
import Sidebar from '../components/board/Sidebar';
import BoardInstructionPanel from '../components/board/BoardInstructionPanel';
import MobileBoardComposer from '../components/board/mobile/MobileBoardComposer';
import MobileBoardShell from '../components/board/mobile/MobileBoardShell';
import QuickPromptModal from '../components/QuickPromptModal';
import { useStore } from '../store/useStore';
import { useTabLock } from '../hooks/useTabLock';
import { useParams } from 'react-router-dom';
import { useIPhoneBoardMode } from '../hooks/useIPhoneBoardMode';
import useBoardThumbnailUrl from '../hooks/useBoardThumbnailUrl';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const NotePage = lazyWithRetry(() => import('./NotePage'));
const ChatModal = lazyWithRetry(() => import('../components/ChatModal'));
const SettingsModal = lazyWithRetry(() => import('../components/SettingsModal'));

import { useBoardLogic } from '../hooks/useBoardLogic';

export default function BoardPage({
    user,
    boardsList,
    onUpdateBoardTitle,
    onUpdateBoardMetadata,
    onBack,
    onForceSyncBoard,
    isForceSyncingBoard = false
}) {
    const { id: boardId } = useParams();
    const { isReadOnly, takeOverMaster } = useTabLock(boardId);
    const isIPhoneBoardMode = useIPhoneBoardMode();

    // Extracted Logic
    const {
        // Data
        cards,
        generatingCardIds,
        selectedIds,
        expandedCardId,
        currentBoard,
        saveStatus,
        globalImages,
        isSettingsOpen,
        quickPrompt,
        boardPrompts,
        boardInstructionSettings,
        customInstructionCatalog,
        instructionPanelSummary,
        conversationCount,
        tempInstructions,
        isAgentRunning,
        isInstructionPanelOpen,
        isAutoRecommending,
        globalPrompts,
        t,
        noteId,
        currentBoardId,

        // Refs
        canvasContainerRef,

        // Actions
        setIsSettingsOpen,
        setGlobalImages,
        setQuickPrompt,
        setExpandedCardId,
        setSelectedIds,
        setTempInstructions,
        setIsInstructionPanelOpen,
        navigate,
        toggleFavorite,
        updateCardFull,

        handleRegenerate,
        handleBatchDelete,
        handleGlobalImageUpload,
        removeGlobalImage,
        createGroup,
        arrangeSelectionGrid,
        handleBatchChat,

        // Complex Handlers
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleFullScreen,
        handleChatModalGenerate,
        handleSelectConnected,
        handleChatSubmitWithInstructions,
        handleAgentSubmit,
        handlePromptDropOnChat,
        handlePromptDropOnCanvas,
        handlePromptDropOnCard,
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleRunAutoInstructionRecommendNow,
        handleQuickSprout,
        handleSprout,
        handleCreateNote,
        createStandaloneNote,
        handleExpandTopics,
        // NEW
        customSproutPrompt,
        setCustomSproutPrompt,
        handleCustomSprout,
        handleCustomSproutSubmit,
        handleGlobalPaste

    } = useBoardLogic({ user, boardsList, onUpdateBoardTitle, onUpdateBoardMetadata, onBack, isReadOnly });

    const resolvedBoardThumbnailUrl = useBoardThumbnailUrl(
        currentBoard?.id || '',
        currentBoard?.thumbnailRef,
        currentBoard?.thumbnail || '',
        currentBoard?.thumbnailUpdatedAt
    );

    useEffect(() => {
        if (!isIPhoneBoardMode) return;
        if (selectedIds.length === 0) return;
        setSelectedIds([]);
    }, [isIPhoneBoardMode, selectedIds.length, setSelectedIds]);

    const handleMobileOpenCard = React.useCallback((cardId) => {
        const targetCard = cards.find(card => card.id === cardId && !card.deletedAt);
        if (!targetCard) return;

        if (targetCard.type === 'note') {
            handleFullScreen(cardId);
            return;
        }

        setExpandedCardId(cardId);
    }, [cards, handleFullScreen, setExpandedCardId]);


    return (
        <div className={`${isIPhoneBoardMode ? 'h-screen-safe' : 'h-screen'} w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative`}>

            <div className="absolute inset-0 h-full overflow-hidden">
                {isReadOnly && (
                    <div className="fixed top-20 inset-x-0 mx-auto w-fit bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-3 z-[100] shadow-xl animate-bounce-subtle border border-amber-400">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} />
                            <span className="text-xs font-bold tracking-tight">ReadOnly: Active editor detected in another tab.</span>
                        </div>
                        <button
                            onClick={takeOverMaster}
                            className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[10px] font-bold transition-all border border-white/20 active:scale-95"
                        >
                            Take Over
                        </button>
                    </div>
                )}

                {isIPhoneBoardMode ? (
                    <MobileBoardShell
                        board={currentBoard}
                        cards={cards}
                        generatingCardIds={generatingCardIds}
                        saveStatus={saveStatus}
                        untitledLabel={t.gallery?.untitledBoard || 'Untitled Board'}
                        onBack={onBack}
                        onOpenInstructions={handleOpenInstructionPanel}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onForceSyncBoard={!isReadOnly ? onForceSyncBoard : undefined}
                        isForceSyncing={isForceSyncingBoard}
                        onOpenCard={handleMobileOpenCard}
                        onQuickSprout={handleQuickSprout}
                        onExpandTopics={handleExpandTopics}
                    />
                ) : (
                    <>
                        <Sidebar className="absolute left-4 top-24 z-40" />

                        <ErrorBoundary level="canvas">
                            <div ref={canvasContainerRef} className="absolute inset-0">
                                <Canvas
                                    boardBackgroundImage={currentBoard?.backgroundImage || resolvedBoardThumbnailUrl || ''}
                                    isSuspended={Boolean(expandedCardId)}
                                    onCreateNote={handleCreateNote}
                                    onCreateStandaloneNote={createStandaloneNote}
                                    onCanvasDoubleClick={handleCanvasDoubleClick}
                                    onCustomSprout={handleCustomSprout}
                                    onCardFullScreen={handleFullScreen}
                                    onPromptDrop={handlePromptDropOnCanvas}
                                    onCardPromptDrop={handlePromptDropOnCard}
                                />
                            </div>
                        </ErrorBoundary>
                    </>
                )}

                {noteId && (
                    <div className="fixed inset-0 z-[200]">
                        <Suspense fallback={<Loading message="Loading note..." />}>
                            <NotePage onBack={() => navigate(`/board/${currentBoardId}`)} isReadOnly={isReadOnly} />
                        </Suspense>
                    </div>
                )}

                {!isIPhoneBoardMode && (
                    <>
                        {/* Quick Prompt Modal */}
                        <QuickPromptModal
                            isOpen={quickPrompt.isOpen}
                            onClose={() => setQuickPrompt(prev => ({ ...prev, isOpen: false }))}
                            onSubmit={handleQuickPromptSubmit}
                            initialPosition={{ x: quickPrompt.x, y: quickPrompt.y }}
                        />

                        {/* Custom Sprout Modal */}
                        <QuickPromptModal
                            isOpen={customSproutPrompt.isOpen}
                            onClose={() => setCustomSproutPrompt(prev => ({ ...prev, isOpen: false }))}
                            onSubmit={handleCustomSproutSubmit}
                            initialPosition={{ x: customSproutPrompt.x, y: customSproutPrompt.y }}
                            placeholder="Tell AI how to generate cards from this..."
                        />

                        {/* Top Bar */}
                        <BoardTopBar
                            onBack={onBack}
                            board={currentBoard}
                            onUpdateTitle={onUpdateBoardTitle}
                            onOpenInstructions={handleOpenInstructionPanel}
                            instructionPanelSummary={instructionPanelSummary}
                            onForceSyncBoard={!isReadOnly ? onForceSyncBoard : undefined}
                            isForceSyncing={isForceSyncingBoard}
                        />
                    </>
                )}

                <BoardInstructionPanel
                    isOpen={isInstructionPanelOpen}
                    onClose={() => setIsInstructionPanelOpen(false)}
                    instructions={customInstructionCatalog.items || []}
                    boardInstructionSettings={boardInstructionSettings}
                    instructionPanelSummary={instructionPanelSummary}
                    onToggleInstruction={handleToggleBoardInstruction}
                    onRunAutoRecommend={handleRunAutoInstructionRecommendNow}
                    onOpenSettings={handleOpenInstructionSettings}
                    isAutoRecommending={isAutoRecommending}
                    conversationCount={conversationCount}
                />

                {isIPhoneBoardMode ? (
                    <MobileBoardComposer
                        onSubmit={handleChatSubmitWithInstructions}
                        onCreateNote={() => createStandaloneNote('')}
                        onImageUpload={handleGlobalImageUpload}
                        globalImages={globalImages}
                        onRemoveImage={removeGlobalImage}
                        onClearImages={() => setGlobalImages([])}
                        isReadOnly={isReadOnly}
                    />
                ) : (
                    <ChatBar
                        selectedIds={selectedIds}
                        generatingCardIds={generatingCardIds}
                        isAgentRunning={isAgentRunning}
                        onSubmit={handleChatSubmitWithInstructions}
                        onAgentSubmit={handleAgentSubmit}
                        onBatchChat={handleBatchChat}
                        onCreateNote={handleCreateNote}
                        onImageUpload={handleGlobalImageUpload}
                        globalImages={globalImages}
                        onRemoveImage={removeGlobalImage}
                        onClearImages={() => setGlobalImages([])}
                        onPromptDrop={handlePromptDropOnChat}
                        instructions={[...globalPrompts, ...boardPrompts, ...tempInstructions]}
                        onClearInstructions={() => setTempInstructions([])}
                        isReadOnly={isReadOnly}
                    />
                )}

                {!isReadOnly && !isIPhoneBoardMode && selectedIds.length > 0 && (
                    <div className="fixed top-3 md:top-6 inset-x-0 mx-auto w-fit bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-cyan-100/50 dark:border-white/10 px-4 py-2 rounded-full flex items-center gap-3 z-50 animate-slide-up shadow-[0_8px_32px_rgba(6,182,212,0.15)] ring-1 ring-cyan-200/20 dark:ring-white/5">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
                            {t.toolbar?.itemsSelected ? t.toolbar.itemsSelected.replace('{count}', selectedIds.length) : `${selectedIds.length} ITEMS`}
                        </span>
                        <div className="h-4 w-px bg-slate-100 dark:bg-white/5"></div>

                        {selectedIds.length === 1 && cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0 && (
                            <button
                                onClick={() => handleExpandTopics(selectedIds[0])}
                                className="p-2 rounded-full text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all active:scale-90"
                                title={t.toolbar?.expand || "Expand Topics"}
                            >
                                <Star size={18} fill="currentColor" />
                            </button>
                        )}

                        <button
                            onClick={handleRegenerate}
                            className="p-2 rounded-full text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-90"
                            title={t.toolbar?.retry || "Retry Generation"}
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button
                            onClick={() => selectedIds.forEach(id => handleQuickSprout(id))}
                            className="p-2 rounded-full text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-90"
                            title={t.toolbar?.sprout || "Sprout Inspiration"}
                        >
                            <Sprout size={18} />
                        </button>

                        <button
                            onClick={() => createGroup(selectedIds)}
                            className="p-2 rounded-full text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-90"
                            title={t.toolbar?.zone || "Create Zone"}
                        >
                            <BoxSelect size={18} />
                        </button>

                        <button
                            onClick={handleBatchDelete}
                            className="p-2 rounded-full text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-90"
                            title={t.toolbar?.delete || "Delete Selected"}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}

                {expandedCardId && (
                    <Suspense fallback={null}>
                        <ChatModal
                            card={cards.find(c => c.id === expandedCardId)}
                            isOpen={!!expandedCardId}
                            onClose={() => setExpandedCardId(null)}
                            onUpdate={updateCardFull}
                            onGenerateResponse={handleChatModalGenerate}
                            isGenerating={generatingCardIds.has(expandedCardId)}
                            onCreateNote={handleCreateNote}
                            onSprout={handleSprout}
                            onToggleFavorite={toggleFavorite}
                            instructions={[...globalPrompts, ...boardPrompts, ...tempInstructions]}
                            isReadOnly={isReadOnly}
                        />
                    </Suspense>
                )}

                {!isIPhoneBoardMode && (
                    <StatusBar
                        boardName={boardsList.find(b => b.id === currentBoardId)?.name}
                        saveStatus={saveStatus}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                    />
                )}

                {/* Settings Modal */}
                {isSettingsOpen && (
                    <Suspense fallback={null}>
                        <SettingsModal
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            user={user}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
