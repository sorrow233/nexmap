import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, ImageIcon, X, StickyNote as StickyNoteIcon, MessageSquarePlus, Frame, Network, LayoutGrid } from 'lucide-react';

/**
 * ChatBar Component - Isolated input bar to prevent parent re-renders during typing
 * 
 * Performance optimization: This component manages promptInput state internally,
 * only notifying the parent via callbacks when the user submits.
 * This prevents the entire App (including Canvas with hundreds of DOM nodes)
 * from re-rendering on every keystroke.
 */
const ChatBar = React.memo(function ChatBar({
    cards,
    selectedIds,
    generatingCardIds,
    onSubmit,
    onCreateNote,
    onExpandTopics,
    onImageUpload,
    globalImages,
    onRemoveImage,
    onBatchChat,

    onGroup, // New prop
    onSelectConnected, // New prop
    onLayoutGrid // New prop
}) {
    const [promptInput, setPromptInput] = useState('');
    const globalPromptInputRef = useRef(null);
    const globalFileInputRef = useRef(null);

    const handleSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;

        // Pass data to parent via callback
        onSubmit(promptInput, globalImages);

        // Clear local state
        setPromptInput('');
        if (globalPromptInputRef.current) {
            globalPromptInputRef.current.style.height = 'auto';
        }
    };

    const handleBatchSubmit = () => {
        if (!promptInput.trim() && globalImages.length === 0) return;

        onBatchChat(promptInput, globalImages);

        setPromptInput('');
        if (globalPromptInputRef.current) {
            globalPromptInputRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e) => {
        setPromptInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const placeholderText = cards.length === 0
        ? "Start a new board..."
        : selectedIds.length > 0
            ? `Ask about ${selectedIds.length} selected items...`
            : "Type to create or ask...";

    const hasMarkedTopics = selectedIds.length === 1 &&
        cards.find(c => c.id === selectedIds[0])?.data?.marks?.length > 0;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
            <div className="fixed bottom-8 inset-x-0 mx-auto w-full max-w-3xl z-50 px-4 pointer-events-auto">
                <div className="bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col gap-2 p-2 transition-all duration-300 hover:shadow-brand-500/10 ring-1 ring-white/5">
                    <div className="flex items-end gap-2 px-2">
                        {/* Left Actions */}
                        <div className="flex gap-1 pb-2">
                            <button
                                onClick={() => globalFileInputRef.current?.click()}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                title="Upload Image"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <input
                                type="file"
                                ref={globalFileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={(e) => onImageUpload(e.target.files)}
                            />
                            <button
                                onClick={() => onCreateNote('', false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                title="Add Sticky Note"
                            >
                                <StickyNoteIcon size={20} />
                            </button>

                            {/* Expand Topic Action (Conditional) */}
                            {hasMarkedTopics && (
                                <button
                                    onClick={() => onExpandTopics(selectedIds[0])}
                                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all flex items-center gap-1 animate-pulse"
                                    title="Expand marked topics"
                                >
                                    <Sparkles size={20} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Topics</span>
                                </button>
                            )}

                            {/* Selection Actions (Group / Connect) */}
                            {selectedIds.length > 0 && (
                                <>
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                    <button
                                        onClick={() => onSelectConnected(selectedIds[0])}
                                        className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-full transition-all"
                                        title="Select Connected Cluster"
                                    >
                                        <Network size={20} />
                                    </button>
                                    <button
                                        onClick={() => onGroup(selectedIds)}
                                        className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-full transition-all"
                                        title="Create Zone (Group)"
                                    >
                                        <Frame size={20} />
                                    </button>
                                    <button
                                        onClick={() => onLayoutGrid && onLayoutGrid()}
                                        className="p-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 rounded-full transition-all"
                                        title="Grid Layout"
                                    >
                                        <LayoutGrid size={20} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Input Area */}

                        <div className="flex-1 relative">
                            <textarea
                                ref={globalPromptInputRef}
                                value={promptInput}
                                onInput={handleInput}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholderText}
                                className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-base p-3 focus:outline-none resize-none overflow-y-auto max-h-[200px] min-h-[44px] scrollbar-hide"
                                rows={1}
                            />
                            {/* Image Previews */}
                            {globalImages.length > 0 && (
                                <div className="flex gap-2 p-2 overflow-x-auto">
                                    {globalImages.map((img, index) => (
                                        <div key={index} className="relative group shrink-0">
                                            <img
                                                src={img.previewUrl}
                                                alt="Upload preview"
                                                className="w-16 h-16 object-cover rounded-lg border border-white/10"
                                            />
                                            <button
                                                onClick={() => onRemoveImage(index)}
                                                className="absolute -top-1 -right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Actions & Submit */}
                        <div className="flex gap-1 pb-2 items-center">
                            <div className="w-px h-6 bg-white/10 mx-1" />

                            {/* Append to Chat Button (only when items selected) */}
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBatchSubmit}
                                    disabled={!promptInput.trim() && globalImages.length === 0}
                                    className="p-3 text-emerald-400 hover:bg-emerald-500/10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                                    title="Append to selected cards' chat"
                                >
                                    <MessageSquarePlus size={20} />
                                </button>
                            )}




                            <button
                                onClick={handleSubmit}
                                disabled={!promptInput.trim() && globalImages.length === 0}
                                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                            >
                                {generatingCardIds.size > 0 ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Sparkles size={20} className="fill-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
});

export default ChatBar;
