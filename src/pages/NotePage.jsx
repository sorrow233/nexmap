import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import ChatView from '../components/chat/ChatView';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import {
    createStreamRouteTraceId,
    findLatestAssistantMessage,
    logStreamRouteDebug,
    setActiveStreamRouteDebug,
    summarizeMessagesForRouteDebug
} from '../utils/streamRouteDebug';

export default function NotePage({ onBack, isReadOnly = false }) {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const cards = useStore(state => state.cards);
    const getCardById = useStore(state => state.getCardById);
    const updateCardFull = useStore(state => state.updateCardFull);
    const handleChatGenerate = useStore(state => state.handleChatGenerate);
    const updateCardContent = useStore(state => state.updateCardContent);
    const toggleFavorite = useStore(state => state.toggleFavorite);
    const syncRuntimeCardBodies = useStore(state => state.syncRuntimeCardBodies);

    const {
        handleCreateNote,
        handleSprout
    } = useCardCreator();

    const card = useMemo(
        () => getCardById?.(noteId) || cards.find(c => c.id === noteId),
        [cards, getCardById, noteId]
    );

    useEffect(() => {
        if (!noteId || typeof syncRuntimeCardBodies !== 'function') {
            return;
        }

        syncRuntimeCardBodies([noteId]);
    }, [noteId, syncRuntimeCardBodies]);

    const handleClose = () => {
        if (onBack) onBack();
        else navigate(-1); // Fallback
    };

    // Wrapper to bridge ChatModal's signature with handleChatGenerate (Copied from BoardPage/ChatModal logic)
    // Ideally this should be a hook 'useChatController'
    const handleChatModalGenerate = async (cardId, text, images = []) => {
        if (isReadOnly) return; // Block in Read-Only mode

        // FIX: Gets fresh state to avoid stale closures in message queue
        const card = useStore.getState().getCardById?.(cardId)
            || useStore.getState().cards.find(c => c.id === cardId);
        if (!card) return;

        let userContent;
        if (images.length > 0) {
            const imageParts = images.map(img => ({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mimeType,
                    data: img.base64
                }
            }));
            userContent = [{ type: 'text', text }, ...imageParts];
        } else {
            userContent = text;
        }

        const userMsg = { role: 'user', content: userContent };
        // FIX: Generate unique ID for assistant message to handle concurrency
        const assistantMsgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const assistantMsg = { role: 'assistant', content: '', id: assistantMsgId };
        const routeTraceId = createStreamRouteTraceId(cardId);
        const previousAssistantMessage = findLatestAssistantMessage(card.data.messages || []);

        setActiveStreamRouteDebug(cardId, {
            traceId: routeTraceId,
            assistantMessageId: assistantMsgId,
            source: 'note_chat_modal'
        });
        logStreamRouteDebug(routeTraceId, 'placeholder_prepare', () => ({
            cardId,
            source: 'note_chat_modal',
            previousAssistantMessageId: previousAssistantMessage?.id || null,
            newAssistantMessageId: assistantMsgId,
            ...summarizeMessagesForRouteDebug(card.data.messages || [])
        }));

        updateCardFull(cardId, (currentData) => ({
            ...currentData,
            messages: [...(currentData.messages || []), userMsg, assistantMsg]
        }));

        const cardAfterPlaceholderWrite = useStore.getState().getCardById?.(cardId)
            || useStore.getState().cards.find(c => c.id === cardId);
        logStreamRouteDebug(routeTraceId, 'placeholder_written', () => ({
            cardId,
            source: 'note_chat_modal',
            assistantExistsAfterWrite: Boolean(
                cardAfterPlaceholderWrite?.data?.messages?.some((message) => message.id === assistantMsgId)
            ),
            ...summarizeMessagesForRouteDebug(cardAfterPlaceholderWrite?.data?.messages || [])
        }));

        const history = [...(card.data.messages || []), userMsg];

        try {
            await handleChatGenerate(cardId, history, (chunk) => {
                // FIX: Update specific message by ID
                updateCardContent(cardId, chunk, assistantMsgId);
            }, { assistantMessageId: assistantMsgId, routeTraceId });
        } catch (error) {
            logStreamRouteDebug(routeTraceId, 'ui_layer_error', () => ({
                cardId,
                source: 'note_chat_modal',
                assistantMessageId: assistantMsgId,
                errorMessage: error?.message || 'Unknown error in UI layer'
            }));
            updateCardContent(cardId, `\n\n[System Error: ${error.message}]`, assistantMsgId);
        }
    };

    if (!card) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900 overflow-hidden">
            {/* Read-Only Warning Banner */}
            {isReadOnly && (
                <div className="absolute top-4 inset-x-0 mx-auto w-fit bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 z-[250] shadow-xl border border-amber-400">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold tracking-tight">ReadOnly: Active editor detected in another tab.</span>
                </div>
            )}

            {/* Back Button Overlay - optional if ChatView header handles close */}
            <div className="absolute top-6 left-4 z-50 lg:hidden">
                <button onClick={handleClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shadow-md">
                    <ArrowLeft size={20} />
                </button>
            </div>

            <ChatView
                card={card}
                onClose={handleClose}
                onUpdate={isReadOnly ? () => { } : updateCardFull}
                onGenerateResponse={handleChatModalGenerate}
                onCreateNote={isReadOnly ? () => { } : handleCreateNote}
                onSprout={isReadOnly ? () => { } : handleSprout}
                onToggleFavorite={isReadOnly ? () => { } : toggleFavorite}
                isFullScreen={true}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
