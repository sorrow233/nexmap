import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCardCreator } from '../hooks/useCardCreator';
import ChatView from '../components/chat/ChatView';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function NotePage({ onBack }) {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const {
        cards,
        updateCardFull,
        handleChatGenerate,
        updateCardContent,
        toggleFavorite
    } = useStore();

    const {
        handleCreateNote,
        handleSprout
    } = useCardCreator();

    const card = useMemo(() => cards.find(c => c.id === noteId), [cards, noteId]);

    const handleClose = () => {
        if (onBack) onBack();
        else navigate(-1); // Fallback
    };

    // Wrapper to bridge ChatModal's signature with handleChatGenerate (Copied from BoardPage/ChatModal logic)
    // Ideally this should be a hook 'useChatController'
    const handleChatModalGenerate = async (cardId, text, images = []) => {
        // FIX: Gets fresh state to avoid stale closures in message queue
        const freshCards = useStore.getState().cards;
        const card = freshCards.find(c => c.id === cardId);
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

        updateCardFull(cardId, (currentData) => ({
            ...currentData,
            messages: [...(currentData.messages || []), userMsg, assistantMsg]
        }));

        const history = [...(card.data.messages || []), userMsg];

        try {
            await handleChatGenerate(cardId, history, (chunk) => {
                // FIX: Update specific message by ID
                updateCardContent(cardId, chunk, assistantMsgId);
            });
        } catch (error) {
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
            {/* Back Button Overlay - optional if ChatView header handles close */}
            <div className="absolute top-6 left-4 z-50 lg:hidden">
                <button onClick={handleClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shadow-md">
                    <ArrowLeft size={20} />
                </button>
            </div>

            <ChatView
                card={card}
                onClose={handleClose}
                onUpdate={updateCardFull}
                onGenerateResponse={handleChatModalGenerate}
                onCreateNote={handleCreateNote}
                onSprout={handleSprout}
                onToggleFavorite={toggleFavorite}
                isFullScreen={true}
            />
        </div>
    );
}
