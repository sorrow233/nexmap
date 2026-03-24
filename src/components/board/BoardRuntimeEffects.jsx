import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useToast } from '../Toast';
import { useGlobalHotkeys } from '../../hooks/useGlobalHotkeys';
import { useCurrentBoardAutoNaming } from '../../hooks/useCurrentBoardAutoNaming';
import { useBoardPersistence } from '../../hooks/useBoardPersistence';
import { useBoardChangeIntegrityMonitor } from '../../hooks/useBoardChangeIntegrityMonitor';
import {
    DEFAULT_BOARD_INSTRUCTION_SETTINGS,
    normalizeBoardInstructionSettings
} from '../../services/customInstructionsService';

export default function BoardRuntimeEffects({
    board,
    boardId,
    user,
    isReadOnly = false,
    onUpdateBoardMetadata,
    setSaveStatus,
    clipboard,
    setClipboard
}) {
    const cards = useStore((state) => state.cards);
    const connections = useStore((state) => state.connections);
    const groups = useStore((state) => state.groups);
    const generatingCardIds = useStore((state) => state.generatingCardIds);
    const offset = useStore((state) => state.offset);
    const scale = useStore((state) => state.scale);
    const isBoardLoading = useStore((state) => state.isBoardLoading);
    const boardPrompts = useStore((state) => state.boardPrompts);
    const boardInstructionSettings = useStore((state) => state.boardInstructionSettings);
    const activeBoardPersistence = useStore((state) => state.activeBoardPersistence);
    const lastExternalSyncMarker = useStore((state) => state.lastExternalSyncMarker);
    const boardChangeState = useStore((state) => state.boardChangeState);
    const streamingMessages = useStore((state) => state.streamingMessages);
    const streamingCardVersions = useStore((state) => state.streamingCardVersions);
    const setLastSavedAt = useStore((state) => state.setLastSavedAt);
    const setActiveBoardPersistence = useStore((state) => state.setActiveBoardPersistence);
    const toast = useToast();

    const normalizedBoardInstructionSettings = useMemo(
        () => normalizeBoardInstructionSettings(boardInstructionSettings || DEFAULT_BOARD_INSTRUCTION_SETTINGS),
        [boardInstructionSettings]
    );

    const streamingPersistenceToken = useMemo(
        () => cards.reduce((total, card) => total + (Number(streamingCardVersions?.[card.id]) || 0), 0),
        [cards, streamingCardVersions]
    );

    useCurrentBoardAutoNaming({
        board,
        boardId,
        cards,
        generatingCardIds,
        isReadOnly,
        onUpdateBoardMetadata
    });

    useBoardPersistence({
        boardId,
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
        boardChangeState,
        streamingMessages,
        streamingPersistenceToken,
        activeBoardPersistence,
        lastExternalSyncMarker,
        setSaveStatus,
        setLastSavedAt,
        setActiveBoardPersistence,
        toast
    });

    useBoardChangeIntegrityMonitor({
        boardId,
        cards,
        connections,
        groups,
        boardPrompts,
        boardInstructionSettings: normalizedBoardInstructionSettings,
        boardChangeState,
        isBoardLoading,
        hasGeneratingCards: generatingCardIds.size > 0
    });

    useGlobalHotkeys(clipboard, setClipboard);

    return null;
}
