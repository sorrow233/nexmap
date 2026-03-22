import { useCallback, useEffect, useRef } from 'react';
import useBoardBackground from './useBoardBackground';
import { runWhenBrowserIdle } from '../utils/idleTask';
import {
    createAutoImageCompletedPatch,
    createAutoSummaryCompletedPatch
} from '../services/boardAutoGeneration/metadata';
import {
    loadBoardDisplayMetadataSnapshot
} from '../services/boardPersistence/boardDisplayMetadataStorage';
import { normalizeBoardSummary } from '../services/boardTitle/displayMetadata';
import {
    AUTO_GENERATION_KIND,
    pickNextAutoGenerationCandidate
} from '../services/boardAutoGeneration/candidates';
import { runtimeLog, runtimeWarn } from '../utils/runtimeLogging';

const BACKGROUND_AUTOGEN_IDLE_THRESHOLD_MS = 5000;
const BACKGROUND_AUTOGEN_INITIAL_DELAY_MS = 3500;
const BACKGROUND_AUTOGEN_RETRY_DELAY_MS = 4000;
const BACKGROUND_AUTOGEN_POST_TASK_DELAY_MS = 1500;
const BACKGROUND_AUTOGEN_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

export function useBackgroundBoardAutoGeneration({
    boardsList,
    onUpdateBoardMetadata,
    enabled,
    metadataReady,
    routeAllowsBackgroundWork
}) {
    const hasUsableDisplayValue = useCallback((key, value) => {
        if (key === 'summary') {
            return Boolean(normalizeBoardSummary(value));
        }
        return typeof value === 'string'
            ? value.trim().length > 0
            : Boolean(value);
    }, []);

    const boardsListRef = useRef(Array.isArray(boardsList) ? boardsList : []);
    const metadataUpdaterRef = useRef(onUpdateBoardMetadata);
    const lastInteractionAtRef = useRef(Date.now());
    const runningBoardIdRef = useRef('');
    const scheduleTimerRef = useRef(null);
    const idleCancelRef = useRef(null);
    const {
        generateBoardSummary,
        generateBoardImage,
        generatingBoardId
    } = useBoardBackground();

    useEffect(() => {
        boardsListRef.current = Array.isArray(boardsList) ? boardsList : [];
    }, [boardsList]);

    useEffect(() => {
        metadataUpdaterRef.current = onUpdateBoardMetadata;
    }, [onUpdateBoardMetadata]);

    useEffect(() => {
        const markInteraction = () => {
            lastInteractionAtRef.current = Date.now();
        };

        BACKGROUND_AUTOGEN_ACTIVITY_EVENTS.forEach((eventName) => {
            window.addEventListener(eventName, markInteraction, { passive: true });
        });

        return () => {
            BACKGROUND_AUTOGEN_ACTIVITY_EVENTS.forEach((eventName) => {
                window.removeEventListener(eventName, markInteraction);
            });
        };
    }, []);

    const clearScheduledWork = useCallback(() => {
        if (scheduleTimerRef.current) {
            clearTimeout(scheduleTimerRef.current);
            scheduleTimerRef.current = null;
        }

        if (idleCancelRef.current) {
            idleCancelRef.current();
            idleCancelRef.current = null;
        }
    }, []);

    const restoreDisplayMetadataIfAvailable = useCallback(async (board) => {
        const updater = metadataUpdaterRef.current;
        if (!board?.id || typeof updater !== 'function') {
            return false;
        }

        const snapshotMetadata = await loadBoardDisplayMetadataSnapshot(board.id);
        if (!snapshotMetadata) {
            return false;
        }

        const patch = {};

        if (!hasUsableDisplayValue('backgroundImage', board?.backgroundImage) &&
            hasUsableDisplayValue('backgroundImage', snapshotMetadata?.backgroundImage)) {
            patch.backgroundImage = snapshotMetadata.backgroundImage;
        }

        if (!hasUsableDisplayValue('thumbnailRef', board?.thumbnailRef) &&
            hasUsableDisplayValue('thumbnailRef', snapshotMetadata?.thumbnailRef)) {
            patch.thumbnailRef = snapshotMetadata.thumbnailRef;
            if (snapshotMetadata?.thumbnailUpdatedAt) {
                patch.thumbnailUpdatedAt = snapshotMetadata.thumbnailUpdatedAt;
            }
        }

        if (!hasUsableDisplayValue('summary', board?.summary) &&
            hasUsableDisplayValue('summary', snapshotMetadata?.summary)) {
            patch.summary = snapshotMetadata.summary;
        }

        if (Object.keys(patch).length === 0) {
            return false;
        }

        runtimeWarn('[AutoGen Background] Restored missing display metadata before generation', {
            boardId: board.id,
            keys: Object.keys(patch)
        });
        await updater(board.id, patch);
        return true;
    }, [hasUsableDisplayValue]);

    const runCandidateTask = useCallback(async (candidate) => {
        const updater = metadataUpdaterRef.current;
        if (!candidate?.board?.id || typeof updater !== 'function') return;

        const boardId = candidate.board.id;
        runningBoardIdRef.current = boardId;
        runtimeLog('[AutoGen Background] Starting task', {
            boardId,
            kind: candidate.kind
        });

        try {
            if (candidate.kind === AUTO_GENERATION_KIND.IMAGE) {
                const finalImageUrl = await generateBoardImage(boardId, updater);
                if (finalImageUrl) {
                    await updater(boardId, createAutoImageCompletedPatch());
                }
                return;
            }

            const summaryResult = await generateBoardSummary(boardId, updater);
            if (summaryResult) {
                await updater(boardId, createAutoSummaryCompletedPatch());
            }
        } catch (error) {
            console.error('[AutoGen Background] Task failed', {
                boardId,
                kind: candidate.kind,
                error
            });
        } finally {
            runningBoardIdRef.current = '';
        }
    }, [generateBoardImage, generateBoardSummary]);

    const scheduleNextPass = useCallback((delayMs = BACKGROUND_AUTOGEN_RETRY_DELAY_MS) => {
        clearScheduledWork();

        if (!enabled || !metadataReady || !routeAllowsBackgroundWork) {
            return;
        }

        scheduleTimerRef.current = setTimeout(() => {
            scheduleTimerRef.current = null;
            idleCancelRef.current = runWhenBrowserIdle(async () => {
                idleCancelRef.current = null;

                if (!enabled || !metadataReady || !routeAllowsBackgroundWork) {
                    return;
                }

                if (document.hidden) {
                    scheduleNextPass(BACKGROUND_AUTOGEN_RETRY_DELAY_MS);
                    return;
                }

                if (generatingBoardId || runningBoardIdRef.current) {
                    scheduleNextPass(BACKGROUND_AUTOGEN_RETRY_DELAY_MS);
                    return;
                }

                const idleForMs = Date.now() - lastInteractionAtRef.current;
                if (idleForMs < BACKGROUND_AUTOGEN_IDLE_THRESHOLD_MS) {
                    scheduleNextPass(BACKGROUND_AUTOGEN_RETRY_DELAY_MS);
                    return;
                }

                const candidate = pickNextAutoGenerationCandidate(boardsListRef.current);
                if (!candidate) {
                    return;
                }

                const restored = await restoreDisplayMetadataIfAvailable(candidate.board);
                if (restored) {
                    scheduleNextPass(BACKGROUND_AUTOGEN_POST_TASK_DELAY_MS);
                    return;
                }

                runtimeWarn('[AutoGen Background] Queued candidate', {
                    boardId: candidate.board.id,
                    kind: candidate.kind,
                    idleForMs
                });

                await runCandidateTask(candidate);
                scheduleNextPass(BACKGROUND_AUTOGEN_POST_TASK_DELAY_MS);
            }, {
                timeout: 1200,
                fallbackDelay: 250
            });
        }, delayMs);
    }, [
        clearScheduledWork,
        enabled,
        generatingBoardId,
        metadataReady,
        routeAllowsBackgroundWork,
        restoreDisplayMetadataIfAvailable,
        runCandidateTask
    ]);

    useEffect(() => {
        scheduleNextPass(BACKGROUND_AUTOGEN_INITIAL_DELAY_MS);
        return clearScheduledWork;
    }, [boardsList, clearScheduledWork, scheduleNextPass]);
}
