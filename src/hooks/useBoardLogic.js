import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCardCreator } from './useCardCreator';
import { useToast } from '../components/Toast';
import { useAISprouting } from './useAISprouting';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrentBoardAutoNaming } from './useCurrentBoardAutoNaming';
import { useBoardPersistence } from './useBoardPersistence';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../services/customInstructionsService';
import { getBoardDisplayName } from '../services/boardTitle/metadata';
import { createBoardChatHandlers } from './boardLogic/createBoardChatHandlers';
import { useBoardGlobalInput } from './boardLogic/useBoardGlobalInput';
import { useBoardInstructionState } from './boardLogic/useBoardInstructionState';

export function useBoardLogic({ user, boardsList, onUpdateBoardMetadata, isReadOnly = false }) {
    const { id: currentBoardId, noteId } = useParams();
    const navigate = useNavigate();

    const cards = useStore(state => state.cards);
    const connections = useStore(state => state.connections);
    const groups = useStore(state => state.groups);
    const selectedIds = useStore(state => state.selectedIds);
    const generatingCardIds = useStore(state => state.generatingCardIds);
    const expandedCardId = useStore(state => state.expandedCardId);
    const offset = useStore(state => state.offset);
    const scale = useStore(state => state.scale);
    const isBoardLoading = useStore(state => state.isBoardLoading);
    const favoritesLastUpdate = useStore(state => state.favoritesLastUpdate);
    const boardPrompts = useStore(state => state.boardPrompts);
    const boardInstructionSettings = useStore(state => state.boardInstructionSettings);
    const globalPrompts = useStore(state => state.globalPrompts);
    const activeBoardPersistence = useStore(state => state.activeBoardPersistence);
    const lastExternalSyncMarker = useStore(state => state.lastExternalSyncMarker);

    const setExpandedCardId = useStore(state => state.setExpandedCardId);
    const updateCardFull = useStore(state => state.updateCardFull);
    const handleRegenerate = useStore(state => state.handleRegenerate);
    const handleBatchDelete = useStore(state => state.handleBatchDelete);
    const handleChatGenerate = useStore(state => state.handleChatGenerate);
    const updateCardContent = useStore(state => state.updateCardContent);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const createGroup = useStore(state => state.createGroup);
    const getConnectedCards = useStore(state => state.getConnectedCards);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const arrangeSelectionGrid = useStore(state => state.arrangeSelectionGrid);
    const setLastSavedAt = useStore(state => state.setLastSavedAt);
    const setActiveBoardPersistence = useStore(state => state.setActiveBoardPersistence);

    const cardCreator = useCardCreator();
    const { t } = useLanguage();
    const toast = useToast();
    const {
        handleQuickSprout,
        handleSprout,
        handleDirectedSprout,
        handleExpandTopics,
        handleAgentSubmit: handleAgentPlanSubmit
    } = useAISprouting();

    const currentBoard = useMemo(
        () => boardsList.find(board => board.id === currentBoardId),
        [boardsList, currentBoardId]
    );
    const conversationCount = useMemo(() => cards.reduce((total, card) => {
        const messages = card?.data?.messages || [];
        const userCount = messages.filter(message => message?.role === 'user').length;
        return total + userCount;
    }, 0), [cards]);
    const normalizedBoardInstructionSettings = useMemo(
        () => normalizeBoardInstructionSettings(boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS),
        [boardInstructionSettings]
    );

    const canvasContainerRef = useRef(null);

    const [saveStatus, setSaveStatus] = useState('idle');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [quickPrompt, setQuickPrompt] = useState({ isOpen: false, x: 0, y: 0, canvasX: 0, canvasY: 0 });
    const [tempInstructions, setTempInstructions] = useState([]);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [customSproutPrompt, setCustomSproutPrompt] = useState({ isOpen: false, sourceId: null, x: 0, y: 0 });

    const {
        globalImages,
        setGlobalImages,
        clipboard,
        handleGlobalPaste,
        handleGlobalImageUpload,
        removeGlobalImage
    } = useBoardGlobalInput({ isReadOnly });

    const {
        isInstructionPanelOpen,
        setIsInstructionPanelOpen,
        isAutoRecommending,
        customInstructionCatalog,
        instructionPanelSummary,
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleRunAutoInstructionRecommendNow
    } = useBoardInstructionState({
        currentBoardId,
        cards,
        conversationCount,
        normalizedBoardInstructionSettings,
        isReadOnly,
        setIsSettingsOpen,
        t,
        toast
    });

    useCurrentBoardAutoNaming({
        board: currentBoard,
        boardId: currentBoardId,
        cards,
        generatingCardIds,
        isReadOnly,
        onUpdateBoardMetadata
    });

    useBoardPersistence({
        boardId: currentBoardId,
        user,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings: normalizedBoardInstructionSettings,
        offset,
        scale,
        isBoardLoading,
        isReadOnly,
        hasGeneratingCards: generatingCardIds.size > 0,
        activeBoardPersistence,
        lastExternalSyncMarker,
        setSaveStatus,
        setLastSavedAt,
        setActiveBoardPersistence,
        toast
    });

    useEffect(() => {
        if (currentBoardId) {
            const board = boardsList.find(item => item.id === currentBoardId);
            const displayName = getBoardDisplayName(board, t.gallery?.untitledBoard || 'Untitled Board');
            document.title = board ? `${displayName} | NexMap` : 'NexMap';
        }
        return () => {
            document.title = 'NexMap';
        };
    }, [currentBoardId, boardsList, t.gallery?.untitledBoard]);

    const chatHandlers = createBoardChatHandlers({
        isReadOnly,
        currentBoardId,
        cards,
        offset,
        scale,
        navigate,
        quickPrompt,
        setQuickPrompt,
        tempInstructions,
        setTempInstructions,
        toast,
        cardCreator,
        handleChatGenerate,
        updateCardFull,
        updateCardContent,
        getConnectedCards,
        setSelectedIds,
        handleAgentPlanSubmit,
        isAgentRunning,
        setIsAgentRunning,
        customSproutPrompt,
        setCustomSproutPrompt,
        handleDirectedSprout
    });

    return {
        cards,
        connections,
        groups,
        selectedIds,
        generatingCardIds,
        expandedCardId,
        offset,
        scale,
        isBoardLoading,
        favoritesLastUpdate,
        boardPrompts,
        boardInstructionSettings: normalizedBoardInstructionSettings,
        customInstructionCatalog,
        instructionPanelSummary,
        conversationCount,
        currentBoard,
        saveStatus,
        globalPrompts,
        globalImages,
        clipboard,
        isSettingsOpen,
        isInstructionPanelOpen,
        isAutoRecommending,
        quickPrompt,
        customSproutPrompt,
        tempInstructions,
        isAgentRunning,
        t,
        noteId,
        currentBoardId,
        canvasContainerRef,
        setIsSettingsOpen,
        setGlobalImages,
        setQuickPrompt,
        setCustomSproutPrompt,
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
        handleOpenInstructionPanel,
        handleOpenInstructionSettings,
        handleToggleBoardInstruction,
        handleRunAutoInstructionRecommendNow,
        handleQuickSprout,
        handleSprout,
        handleExpandTopics,
        handleGlobalPaste,
        ...chatHandlers,
        ...cardCreator
    };
}
