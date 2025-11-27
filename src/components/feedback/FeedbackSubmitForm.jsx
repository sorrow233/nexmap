import React, { useState } from 'react';
import { Send } from 'lucide-react';

function FeedbackSubmitForm({ user, onSubmit, t }) {
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validEmailRegex = /^[^@\s]+@(gmail\.com|qq\.com|outlook\.com|hotmail\.com|live\.com|163\.com|126\.com|icloud\.com)$/i;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!user && !validEmailRegex.test(email.trim())) {
            setError(t.feedback?.invalidEmail || 'Only major email providers (Gmail, QQ, Outlook, 163, iCloud) are allowed');
            return;
        }

        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                content,
                email: user ? user.email : email,
                displayName: user?.displayName || null,
                photoURL: user?.photoURL || null,
                uid: user?.uid || null
            });
            setContent('');
            if (!user) setEmail('');
        } catch (err) {
            setError(err.message || 'Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="glass-card rounded-2xl p-4 mb-6 sticky top-4 z-10 shadow-xl shadow-indigo-500/5 ring-1 ring-white/20 backdrop-blur-xl">
            {error && (
                <div className="p-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                {user ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-white/50 shadow-sm flex-shrink-0" />
                ) : (
                    <div className="flex-shrink-0 w-28">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.feedback?.yourEmail || "Email"}
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-inter-tight"
                        />
                    </div>
                )}

                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t.feedback?.placeholder || "Share your thoughts..."}
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-inter-tight"
                        disabled={isSubmitting}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !content.trim()}
                        className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
            </div>
            {!user && (
                <p className="mt-2 text-xs text-slate-400 ml-1 text-center sm:text-left">
                    {t.feedback?.emailHint || 'Gmail, QQ, Outlook, 163, iCloud'}
                </p>
            )}
        </div>
    );
}

export default FeedbackSubmitForm;
