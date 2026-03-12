import React, { Suspense, lazy } from 'react';
import { Star, RefreshCw, Trash2, Sprout, BoxSelect, AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Canvas from '../components/Canvas';
import ChatBar from '../components/ChatBar';
import ErrorBoundary from '../components/ErrorBoundary';
import Loading from '../components/Loading';
import StatusBar from '../components/StatusBar';
import BoardTopBar from '../components/board/BoardTopBar';
import Sidebar from '../components/board/Sidebar';
import BoardSideEffects from '../components/board/BoardSideEffects';
import MobileBoardRuntime from '../components/board/mobile/MobileBoardRuntime';
import { useTabLock } from '../hooks/useTabLock';
import { useBoardSync } from '../hooks/useBoardSync';
import { useIPhoneBoardMode } from '../hooks/useIPhoneBoardMode';
import { useBoardLogic } from '../hooks/useBoardLogic';

const NotePage = lazy(() => import('./NotePage'));
const ChatModal = lazy(() => import('../components/ChatModal'));
const SettingsModal = lazy(() => import('../components/SettingsModal'));
const BoardInstructionPanel = lazy(() => import('../components/board/BoardInstructionPanel'));
const QuickPromptModal = lazy(() => import('../components/QuickPromptModal'));

export default function BoardPage({ user, boardsList, onUpdateBoardTitle, onUpdateBoardMetadata, onBack }) {
    const { id: boardId } = useParams();
    const { isReadOnly, takeOverMaster } = useTabLock(boardId);
    const isIPhoneBoardMode = useIPhoneBoardMode();

    useBoardSync(boardId, isReadOnly);

    const {
        generatingCardIds,
        selectedIds,
        expandedCardId,
        expandedCard,
        selectedPrimaryCardHasMarks,
        currentBoard,
        cloudSyncStatus,
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
        canvasContainerRef,
        setIsSettingsOpen,
        setGlobalImages,
        setQuickPrompt,
        setExpandedCardId,
        setCloudSyncStatus,
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
        handleBatchChat,
        handleCanvasDoubleClick,
        handleQuickPromptSubmit,
        handleFullScreen,
        handleChatModalGenerate,
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
        customSproutPrompt,
        setCustomSproutPrompt,
        handleCustomSprout,
        handleCustomSproutSubmit
    } = useBoardLogic({ boardsList, onUpdateBoardMetadata, isReadOnly });

    return (
        <div className={`${isIPhoneBoardMode ? 'h-screen-safe' : 'h-screen'} w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative`}>
            <BoardSideEffects
                board={currentBoard}
                boardId={currentBoardId}
                user={user}
                isReadOnly={isReadOnly}
                onUpdateBoardMetadata={onUpdateBoardMetadata}
                setCloudSyncStatus={setCloudSyncStatus}
            />

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
                    <MobileBoardRuntime
                        board={currentBoard}
                        syncStatus={cloudSyncStatus}
                        untitledLabel={t.gallery?.untitledBoard || 'Untitled Board'}
                        onBack={onBack}
                        onCreateNote={() => {
                            if (isReadOnly) return;
                            createStandaloneNote('');
                        }}
                        onOpenInstructions={handleOpenInstructionPanel}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onOpenConversationCard={setExpandedCardId}
                        onOpenNote={handleFullScreen}
                        onQuickSprout={handleQuickSprout}
                        onExpandTopics={handleExpandTopics}
                        onDeleteSelection={handleBatchDelete}
                        isReadOnly={isReadOnly}
                    />
                ) : (
                    <>
                        <Sidebar className="absolute left-4 top-24 z-40" />

                        <ErrorBoundary level="canvas">
                            <div ref={canvasContainerRef} className="absolute inset-0">
                                <Canvas
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
                        {quickPrompt.isOpen && (
                            <Suspense fallback={null}>
                                <QuickPromptModal
                                    isOpen={quickPrompt.isOpen}
                                    onClose={() => setQuickPrompt(prev => ({ ...prev, isOpen: false }))}
                                    onSubmit={handleQuickPromptSubmit}
                                    initialPosition={{ x: quickPrompt.x, y: quickPrompt.y }}
                                />
                            </Suspense>
                        )}

                        {customSproutPrompt.isOpen && (
                            <Suspense fallback={null}>
                                <QuickPromptModal
                                    isOpen={customSproutPrompt.isOpen}
                                    onClose={() => setCustomSproutPrompt(prev => ({ ...prev, isOpen: false }))}
                                    onSubmit={handleCustomSproutSubmit}
                                    initialPosition={{ x: customSproutPrompt.x, y: customSproutPrompt.y }}
                                    placeholder="Tell AI how to generate cards from this..."
                                />
                            </Suspense>
                        )}

                        <BoardTopBar
                            onBack={onBack}
                            board={currentBoard}
                            onUpdateTitle={onUpdateBoardTitle}
                            onOpenInstructions={handleOpenInstructionPanel}
                            instructionPanelSummary={instructionPanelSummary}
                        />
                    </>
                )}

                {isInstructionPanelOpen && (
                    <Suspense fallback={null}>
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
                    </Suspense>
                )}

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

                {!isReadOnly && !isIPhoneBoardMode && selectedIds.length > 0 && (
                    <div className="fixed top-3 md:top-6 inset-x-0 mx-auto w-fit bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-cyan-100/50 dark:border-white/10 px-4 py-2 rounded-full flex items-center gap-3 z-50 animate-slide-up shadow-[0_8px_32px_rgba(6,182,212,0.15)] ring-1 ring-cyan-200/20 dark:ring-white/5">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
                            {t.toolbar?.itemsSelected ? t.toolbar.itemsSelected.replace('{count}', selectedIds.length) : `${selectedIds.length} ITEMS`}
                        </span>
                        <div className="h-4 w-px bg-slate-100 dark:bg-white/5"></div>

                        {selectedIds.length === 1 && selectedPrimaryCardHasMarks && (
                            <button
                                onClick={() => handleExpandTopics(selectedIds[0])}
                                className="p-2 rounded-full text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-all active:scale-90"
                                title={t.toolbar?.expand || 'Expand Topics'}
                            >
                                <Star size={18} fill="currentColor" />
                            </button>
                        )}

                        <button
                            onClick={handleRegenerate}
                            className="p-2 rounded-full text-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-90"
                            title={t.toolbar?.retry || 'Retry Generation'}
                        >
                            <RefreshCw size={18} />
                        </button>

                        <button
                            onClick={() => selectedIds.forEach(id => handleQuickSprout(id))}
                            className="p-2 rounded-full text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-90"
                            title={t.toolbar?.sprout || 'Sprout Inspiration'}
                        >
                            <Sprout size={18} />
                        </button>

                        <button
                            onClick={() => createGroup(selectedIds)}
                            className="p-2 rounded-full text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-90"
                            title={t.toolbar?.zone || 'Create Zone'}
                        >
                            <BoxSelect size={18} />
                        </button>

                        <button
                            onClick={handleBatchDelete}
                            className="p-2 rounded-full text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-90"
                            title={t.toolbar?.delete || 'Delete Selected'}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}

                {expandedCardId && (
                    <Suspense fallback={null}>
                        <ChatModal
                            card={expandedCard}
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
                        syncStatus={cloudSyncStatus}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                    />
                )}

                <Suspense fallback={null}>
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        user={user}
                    />
                </Suspense>
            </div>
        </div>
    );
}
