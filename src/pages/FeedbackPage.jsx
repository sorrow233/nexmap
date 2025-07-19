import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ThumbsUp, ArrowLeft, Flame, TrendingUp, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';

// API base URL
const API_BASE = '/api/feedback';

// Status badge colors
const STATUS_COLORS = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

// Feedback Card Component
function FeedbackCard({ feedback, onVote, votedIds }) {
    const { t } = useLanguage();
    const hasVoted = votedIds.includes(feedback.id);
    const [isVoting, setIsVoting] = useState(false);

    const handleVote = async () => {
        if (isVoting) return;
        setIsVoting(true);
        try {
            await onVote(feedback.id, hasVoted ? 'downvote' : 'upvote');
        } finally {
            setIsVoting(false);
        }
    };

    const statusLabel = {
        pending: t.feedback?.pending || 'Pending',
        in_progress: t.feedback?.inProgress || 'In Progress',
        planned: t.feedback?.planned || 'Planned',
        done: t.feedback?.done || 'Done'
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group">
            <div className="flex gap-3">
                {/* Vote Section */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={handleVote}
                        disabled={isVoting}
                        className={`p-2 rounded-xl transition-all duration-200 ${hasVoted
                            ? 'bg-orange-100 text-orange-500 dark:bg-orange-900/30'
                            : 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-400 dark:bg-slate-800 dark:hover:bg-orange-900/20'
                            } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <ThumbsUp size={16} fill={hasVoted ? 'currentColor' : 'none'} />
                    </button>
                    <span className={`font-bold text-sm ${hasVoted ? 'text-orange-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {feedback.votes}
                    </span>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    {/* Status badge if not pending */}
                    {feedback.status && feedback.status !== 'pending' && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${STATUS_COLORS[feedback.status] || STATUS_COLORS.pending}`}>
                            {statusLabel[feedback.status]}
                        </span>
                    )}

                    <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed mb-2">
                        {feedback.content}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        {/* User avatar or email */}
                        {feedback.photoURL ? (
                            <img
                                src={feedback.photoURL}
                                alt=""
                                className="w-5 h-5 rounded-full border border-white/50"
                            />
                        ) : null}
                        <span>{feedback.displayName || feedback.email}</span>
                        <span>•</span>
                        <span>{formatDate(feedback.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Inline Submit Form Component
function FeedbackSubmitForm({ user, onSubmit, t }) {
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validEmailRegex = /^[^@\s]+@(gmail\.com|qq\.com|outlook\.com|hotmail\.com|live\.com|163\.com|126\.com|icloud\.com)$/i;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');

        // If not logged in, validate email
        if (!user && !validEmailRegex.test(email.trim())) {
            setError(t.feedback?.invalidEmail || 'Only major email providers (Gmail, QQ, Outlook, 163, iCloud) are allowed');
            return;
        }

        if (!content.trim()) {
            return; // Silent return for empty content
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                content,
                email: user ? user.email : email,
                displayName: user?.displayName || null,
                photoURL: user?.photoURL || null,
                uid: user?.uid || null
            });
            // Reset form
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
        <div className="glass-card rounded-2xl p-4 mb-6">
            {error && (
                <div className="p-2 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                {/* User avatar or email input */}
                {user ? (
                    <img
                        src={user.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full border-2 border-white/50 shadow-sm flex-shrink-0"
                    />
                ) : (
                    <div className="flex-shrink-0 w-10">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        />
                    </div>
                )}

                {/* Content input */}
                <div className="flex-1 flex gap-2">
                    {!user && (
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@gmail.com"
                            className="w-32 flex-shrink-0 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        />
                    )}
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t.feedback?.placeholder || "Share your feedback... (Enter to send)"}
                        className="flex-1 px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                        disabled={isSubmitting}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !content.trim()}
                        className="p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                <p className="mt-2 text-xs text-slate-400 ml-12">
                    {t.feedback?.emailHint || 'Gmail, QQ, Outlook, 163, iCloud'}
                </p>
            )}
        </div>
    );
}

// Main Feedback Page
export default function FeedbackPage() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [user, setUser] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('hot'); // hot, top, recent
    const [votedIds, setVotedIds] = useState([]);

    // Listen to auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            setUser(authUser);
        });
        return () => unsubscribe();
    }, []);

    // Load voted IDs from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('feedback_voted_ids');
        if (saved) {
            try {
                setVotedIds(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse voted IDs:', e);
            }
        }
    }, []);

    // Save voted IDs to localStorage
    const saveVotedIds = (ids) => {
        setVotedIds(ids);
        localStorage.setItem('feedback_voted_ids', JSON.stringify(ids));
    };

    // Helper to authenticated fetch
    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = { ...options.headers };
        if (auth.currentUser) {
            try {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.warn('Failed to get ID token', e);
            }
        }
        return fetch(url, { ...options, headers });
    }, []);

    // Fetch feedbacks
    const fetchFeedbacks = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await authenticatedFetch(`${API_BASE}?sort=${sortBy}`);
            const data = await response.json();
            setFeedbacks(data.feedbacks || []);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
            setFeedbacks([]);
        } finally {
            setIsLoading(false);
        }
    }, [sortBy, authenticatedFetch]);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    // Handle vote
    const handleVote = async (feedbackId, action) => {
        try {
            const response = await authenticatedFetch(API_BASE, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedbackId, action })
            });

            const data = await response.json();

            if (data.success) {
                // Update local state
                setFeedbacks(prev => prev.map(fb =>
                    fb.id === feedbackId
                        ? { ...fb, votes: data.votes }
                        : fb
                ));

                // Update voted IDs
                if (action === 'upvote' && !votedIds.includes(feedbackId)) {
                    saveVotedIds([...votedIds, feedbackId]);
                } else if (action === 'downvote' || (action === 'upvote' && votedIds.includes(feedbackId))) {
                    saveVotedIds(votedIds.filter(id => id !== feedbackId));
                }
            }
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    // Handle submit feedback
    const handleSubmitFeedback = async ({ content, email, displayName, photoURL, uid }) => {
        const response = await authenticatedFetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, email, displayName, photoURL, uid })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit feedback');
        }

        // Refresh feedbacks
        fetchFeedbacks();

        // Auto-vote for own feedback
        if (data.id) {
            saveVotedIds([...votedIds, data.id]);
        }
    };

    const sortOptions = [
        { key: 'hot', icon: Flame, label: t.feedback?.hot || 'Hot' },
        { key: 'top', icon: TrendingUp, label: t.feedback?.top || 'Top' },
        { key: 'recent', icon: Clock, label: t.feedback?.recent || 'Recent' }
    ];

    return (
        <div className="bg-mesh-gradient min-h-screen text-slate-900 dark:text-slate-200 p-4 md:p-8 font-lxgw">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors glass-card"
                    >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight">
                        <span className="text-gradient">Nex</span>Map
                        <span className="text-slate-400 font-normal ml-2 text-base">
                            {t.feedback?.title || 'Feedback'}
                        </span>
                    </h1>
                </div>

                {/* Submit Form - inline, no modal */}
                <FeedbackSubmitForm
                    user={user}
                    onSubmit={handleSubmitFeedback}
                    t={t}
                />

                {/* Sort Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-white/10">
                        {sortOptions.map(({ key, icon: Icon, label }) => (
                            <button
                                key={key}
                                onClick={() => setSortBy(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${sortBy === key
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feedback List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div className="text-center py-12 glass-card rounded-2xl">
                            <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {t.feedback?.noFeedback || 'No feedback yet. Be the first!'}
                            </p>
                        </div>
                    ) : (
                        feedbacks.map(feedback => (
                            <FeedbackCard
                                key={feedback.id}
                                feedback={feedback}
                                onVote={handleVote}
                                votedIds={votedIds}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
