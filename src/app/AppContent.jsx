import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import Loading from '../components/Loading';
import ModernDialog from '../components/ModernDialog';
import IPadInstallPrompt from '../components/pwa/IPadInstallPrompt';
import { useAppInit } from '../hooks/useAppInit';
import { useCardCreator } from '../hooks/useCardCreator';
import { useBuildVersionRefresh } from '../hooks/useBuildVersionRefresh';
import { useBackgroundBoardAutoGeneration } from '../hooks/useBackgroundBoardAutoGeneration';
import { auth, googleProvider } from '../services/firebase';
import {
    createBoard,
    deleteBoard,
    permanentlyDeleteBoard,
    restoreBoard,
    updateBoardMetadata
} from '../services/storage';
import {
    buildBoardTitleUpdatePatch,
    hasBoardTitleMetadataPatch,
    normalizeBoardTitleMeta,
    pickBoardTitleMetadata
} from '../services/boardTitle/metadata';
import { hasBoardDisplayMetadataPatch } from '../services/boardTitle/displayMetadata';
import { persistBoardDisplayMetadataSnapshot } from '../services/boardPersistence/boardDisplayMetadataStorage';
import { runtimeLog, runtimeWarn } from '../utils/runtimeLogging';
import { SearchModal } from './appPages';
import { AppRoutes } from './AppRoutes';
import { hasMeaningfulBoardMetadataChange, sanitizeBoardMetadataPatch } from './boardMetadataUtils';
import { useGlobalBoardSearch } from './useGlobalBoardSearch';
import { useRemoteBoardsSync } from './useRemoteBoardsSync';
import { useBoardRuntimeSync } from './useBoardRuntimeSync';
import { useStore } from '../store/useStore';

const SESSION_START_TIME = Date.now();

export function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, boardsList, setBoardsList, isInitialized } = useAppInit();
    const {
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        setCards,
        setConnections,
        setGroups,
        setBoardPrompts,
        setBoardInstructionSettings,
        setActiveBoardPersistence,
        activeBoardPersistence,
        generatingCardIds
    } = useStore();
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const { createCardWithText } = useCardCreator();
    const boardsListRef = useRef(boardsList);
    const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => { } });
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    useBuildVersionRefresh();

    useEffect(() => {
        boardsListRef.current = boardsList;
    }, [boardsList]);

    const boardMatch = location.pathname.match(/^\/board\/([^/]+)/);
    const currentBoardId = boardMatch ? boardMatch[1] : null;

    const { isSearchOpen, setIsSearchOpen, allBoardsData, searchLoadState } = useGlobalBoardSearch({ boardsList });
    const { hasHydratedRemoteBoards } = useRemoteBoardsSync({
        userUid: user?.uid,
        boardsList,
        setBoardsList
    });

    useBoardRuntimeSync({
        currentBoardId,
        user,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings,
        activeBoardPersistence,
        generatingCardIds,
        isBoardLoading,
        setCards,
        setConnections,
        setGroups,
        setBoardPrompts,
        setBoardInstructionSettings,
        setActiveBoardPersistence
    });

    const showDialog = useCallback((title, message, type = 'info', onConfirm = () => { }) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    }, []);

    const handleLogin = useCallback(async () => {
        try {
            runtimeLog('[Auth] handleLogin initiated');
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('[Auth] Login failed:', error);
            showDialog('Login Failed', error.message, 'error');
        }
    }, [showDialog]);

    const handleLogout = useCallback((intent = 'manual') => {
        console.group('[Logout Trace]');
        runtimeLog(`[Logout] handleLogout called with intent: ${intent}`);
        console.trace('[Logout] Caller detail:');

        const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
        if (timeSinceLoad < 15 && intent !== 'manual_user_click') {
            runtimeWarn(`[Logout] ABORTED: Session too fresh (${timeSinceLoad.toFixed(1)}s) and intent is ${intent}`);
            console.groupEnd();
            return;
        }

        setIsLogoutConfirmOpen(true);
        console.groupEnd();
    }, []);

    const performActualLogout = useCallback(async () => {
        try {
            const timeSinceLoad = (Date.now() - SESSION_START_TIME) / 1000;
            runtimeLog(`[Logout] performActualLogout verified at ${timeSinceLoad.toFixed(1)}s`);

            if (user && timeSinceLoad < 30) {
                runtimeWarn('[Logout] DANGER: User is logged in and session is very fresh. Proceeding with caution...');
            }

            runtimeLog('[Logout] User confirmed logout, initiating cleanup...');
            const { clearAllUserData } = await import('../services/clearAllUserData');
            await clearAllUserData();
            await signOut(auth);
            setIsLogoutConfirmOpen(false);
        } catch (error) {
            console.error('[Logout] Error during cleanup:', error);
            setIsLogoutConfirmOpen(false);
        }
    }, [user]);

    const handleCreateBoard = useCallback(async (customName = null, initialPrompt = null, initialImages = []) => {
        const normalizedName = typeof customName === 'string' ? customName.trim() : '';
        const newBoard = await createBoard(normalizedName || null);
        setBoardsList(prev => [normalizeBoardTitleMeta(newBoard), ...prev]);

        navigate(`/board/${newBoard.id}`);

        if (initialPrompt || initialImages.length > 0) {
            setTimeout(() => createCardWithText(initialPrompt, initialImages), 600);
        }
    }, [createCardWithText, navigate, setBoardsList]);

    const handleSelectBoard = useCallback(async (id) => {
        navigate(`/board/${id}`);
    }, [navigate]);

    const handleSoftDeleteBoard = useCallback(async (id) => {
        await deleteBoard(id);
        setBoardsList(prev => prev.map(board => (
            board.id === id ? normalizeBoardTitleMeta({ ...board, deletedAt: Date.now() }) : board
        )));
    }, [setBoardsList]);

    const handleRestoreBoard = useCallback(async (id) => {
        await restoreBoard(id);
        setBoardsList(prev => prev.map(board => (
            board.id === id ? normalizeBoardTitleMeta({ ...board, deletedAt: null }) : board
        )));
    }, [setBoardsList]);

    const handlePermanentDeleteBoard = useCallback(async (id) => {
        showDialog(
            'Permanently Delete?',
            'This will permanently delete this board and cannot be undone.',
            'confirm',
            async () => {
                await permanentlyDeleteBoard(id);
                setBoardsList(prev => prev.filter(board => board.id !== id));
            }
        );
    }, [setBoardsList, showDialog]);

    const handleBackToGallery = useCallback(async () => {
        if (currentBoardId && isBoardLoading) {
            runtimeWarn(`[Board] Skip direct leave-save while loading board ${currentBoardId} to avoid overwriting with transient state`);
        }
        navigate('/gallery');
    }, [currentBoardId, isBoardLoading, navigate]);

    const handleUpdateBoardMetadata = useCallback(async (boardId, metadata) => {
        if (!boardId || !metadata || typeof metadata !== 'object') return;

        const currentBoard = boardsListRef.current.find(board => board.id === boardId);
        let nextMetadata = sanitizeBoardMetadataPatch(metadata);

        if (Object.keys(nextMetadata).length === 0) {
            return;
        }

        if (hasBoardTitleMetadataPatch(nextMetadata)) {
            nextMetadata = sanitizeBoardMetadataPatch({
                ...nextMetadata,
                ...pickBoardTitleMetadata({
                    ...(currentBoard || {}),
                    ...nextMetadata
                })
            });
        }

        if (!hasMeaningfulBoardMetadataChange(currentBoard, nextMetadata)) {
            return;
        }

        updateBoardMetadata(boardId, nextMetadata);

        setBoardsList((prev) => {
            const nextBoards = prev.map((board) => (
                board.id === boardId
                    ? normalizeBoardTitleMeta({ ...board, ...nextMetadata })
                    : board
            ));
            boardsListRef.current = nextBoards;
            return nextBoards;
        });

        if (hasBoardDisplayMetadataPatch(nextMetadata)) {
            await persistBoardDisplayMetadataSnapshot(boardId, nextMetadata);
        }
    }, [setBoardsList]);

    const handleUpdateBoardTitle = useCallback(async (newTitle) => {
        if (!currentBoardId) return;

        const currentBoard = boardsList.find(board => board.id === currentBoardId);
        const nextPatch = buildBoardTitleUpdatePatch(currentBoard, newTitle);
        const currentTitleMetadata = currentBoard ? pickBoardTitleMetadata(currentBoard) : null;

        if (
            currentTitleMetadata &&
            currentTitleMetadata.name === nextPatch.name &&
            currentTitleMetadata.nameSource === nextPatch.nameSource &&
            currentTitleMetadata.autoTitle === (nextPatch.autoTitle ?? currentTitleMetadata.autoTitle) &&
            currentTitleMetadata.autoTitleGeneratedAt === (nextPatch.autoTitleGeneratedAt ?? currentTitleMetadata.autoTitleGeneratedAt)
        ) {
            return;
        }

        await handleUpdateBoardMetadata(currentBoardId, nextPatch);
    }, [boardsList, currentBoardId, handleUpdateBoardMetadata]);

    useBackgroundBoardAutoGeneration({
        boardsList,
        onUpdateBoardMetadata: handleUpdateBoardMetadata,
        enabled: true,
        metadataReady: !user?.uid || hasHydratedRemoteBoards,
        routeAllowsBackgroundWork: location.pathname.startsWith('/gallery')
    });

    const routes = useMemo(() => (
        <AppRoutes
            user={user}
            boardsList={boardsList}
            onCreateBoard={handleCreateBoard}
            onSelectBoard={handleSelectBoard}
            onDeleteBoard={handleSoftDeleteBoard}
            onRestoreBoard={handleRestoreBoard}
            onPermanentlyDeleteBoard={handlePermanentDeleteBoard}
            onUpdateBoardMetadata={handleUpdateBoardMetadata}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onUpdateBoardTitle={handleUpdateBoardTitle}
            onBack={handleBackToGallery}
        />
    ), [
        user,
        boardsList,
        handleCreateBoard,
        handleSelectBoard,
        handleSoftDeleteBoard,
        handleRestoreBoard,
        handlePermanentDeleteBoard,
        handleUpdateBoardMetadata,
        handleLogin,
        handleLogout,
        handleUpdateBoardTitle,
        handleBackToGallery
    ]);

    if (!isInitialized) return null;

    return (
        <>
            <Suspense fallback={<Loading message="Initializing MixBoard..." />}>
                {routes}
            </Suspense>

            <ModernDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ ...dialog, isOpen: false })}
                onConfirm={dialog.onConfirm}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
            />

            {isSearchOpen && (
                <Suspense fallback={null}>
                    <SearchModal
                        isOpen={isSearchOpen}
                        onClose={() => setIsSearchOpen(false)}
                        boardsList={boardsList}
                        allBoardsData={allBoardsData}
                        searchLoadState={searchLoadState}
                    />
                </Suspense>
            )}

            <ModernDialog
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={performActualLogout}
                title="Sign Out?"
                message="Are you sure you want to sign out? This will clear local data on this device for security."
                type="confirm"
            />

            <IPadInstallPrompt />
        </>
    );
}
