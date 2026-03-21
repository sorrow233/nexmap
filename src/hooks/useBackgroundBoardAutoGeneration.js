import { useCallback, useEffect, useRef } from 'react';
import useBoardBackground from './useBoardBackground';
import { runWhenBrowserIdle } from '../utils/idleTask';
import {
    createAutoImageTriggeredPatch,
    createAutoSummaryTriggeredPatch
} from '../services/boardAutoGeneration/metadata';
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
                await updater(boardId, createAutoImageTriggeredPatch());
                await generateBoardImage(boardId, updater);
                return;
            }

            await updater(boardId, createAutoSummaryTriggeredPatch());
            await generateBoardSummary(boardId, updater);
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
        runCandidateTask
    ]);

    useEffect(() => {
        scheduleNextPass(BACKGROUND_AUTOGEN_INITIAL_DELAY_MS);
        return clearScheduledWork;
    }, [boardsList, clearScheduledWork, scheduleNextPass]);
}
