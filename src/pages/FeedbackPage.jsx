import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ThumbsUp, Plus, ArrowLeft, Flame, TrendingUp, Clock, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

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
        <div className="glass-card rounded-2xl p-5 hover:shadow-lg transition-all duration-300 group">
            <div className="flex gap-4">
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
                        <ThumbsUp size={18} fill={hasVoted ? 'currentColor' : 'none'} />
                    </button>
                    <span className={`font-bold text-lg ${hasVoted ? 'text-orange-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {feedback.votes}
                    </span>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                            {feedback.title}
                        </h3>
                        {feedback.status && feedback.status !== 'pending' && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[feedback.status] || STATUS_COLORS.pending}`}>
                                {statusLabel[feedback.status]}
                            </span>
                        )}
                    </div>

                    {feedback.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3 line-clamp-2">
                            {feedback.description}
                        </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {feedback.comments} {t.feedback?.comments || 'comments'}
                        </span>
                        <span>•</span>
                        <span>{feedback.email}</span>
                        <span>•</span>
                        <span>{formatDate(feedback.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Feedback Form Modal
function FeedbackFormModal({ isOpen, onClose, onSubmit }) {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Client-side email validation
        const validEmailRegex = /^[^@\s]+@(gmail\.com|qq\.com)$/i;
        if (!validEmailRegex.test(email.trim())) {
            setError(t.feedback?.invalidEmail || 'Only Gmail (@gmail.com) or QQ (@qq.com) emails are allowed');
            return;
        }

        if (!title.trim() || title.trim().length < 3) {
            setError('Title must be at least 3 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({ email, title, description });
            // Reset form
            setEmail('');
            setTitle('');
            setDescription('');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {t.feedback?.submitFeedback || 'Submit Feedback'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t.feedback?.yourEmail || 'Your Email'}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@gmail.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                            required
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            {t.feedback?.emailHint || 'Only Gmail or QQ email allowed'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t.feedback?.feedbackTitle || 'Title'}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's your suggestion?"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                            required
                            minLength={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t.feedback?.feedbackDescription || 'Description (optional)'}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell us more about your idea..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send size={18} />
                                {t.feedback?.submit || 'Submit'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Main Feedback Page
export default function FeedbackPage() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('hot'); // hot, top, recent
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [votedIds, setVotedIds] = useState([]);

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

    // Fetch feedbacks
    const fetchFeedbacks = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}?sort=${sortBy}`);
            const data = await response.json();
            setFeedbacks(data.feedbacks || []);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
            setFeedbacks([]);
        } finally {
            setIsLoading(false);
        }
    }, [sortBy]);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    // Handle vote
    const handleVote = async (feedbackId, action) => {
        try {
            const response = await fetch(API_BASE, {
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
    const handleSubmitFeedback = async ({ email, title, description }) => {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, title, description })
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
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="sticky top-2 md:top-4 z-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 py-3 md:py-4 px-4 md:px-6 glass-card rounded-2xl transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                            <span className="text-gradient">Nex</span>Map
                            <span className="text-slate-400 font-normal ml-2 text-lg">
                                {t.feedback?.title || 'Feedback'}
                            </span>
                        </h1>
                    </div>

                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={18} />
                        {t.feedback?.submitFeedback || 'Submit Feedback'}
                    </button>
                </div>

                {/* Sort Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-white/10">
                        {sortOptions.map(({ key, icon: Icon, label }) => (
                            <button
                                key={key}
                                onClick={() => setSortBy(key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortBy === key
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feedback List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div className="text-center py-12 glass-card rounded-2xl">
                            <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">
                                No feedback yet. Be the first to share your ideas!
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

            {/* Feedback Form Modal */}
            <FeedbackFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmitFeedback}
            />
        </div>
    );
}
