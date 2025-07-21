import React, { useState, useEffect, useCallback, memo } from 'react';
import { MessageSquare, ThumbsUp, Flame, TrendingUp, Clock, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';

// API base URL
const API_BASE = '/api/feedback';

// Max votes per user
const MAX_VOTES_PER_USER = 1;

// Status badge colors
const STATUS_COLORS = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatTimeTime = (timestamp) => {
    const date = new Date(timestamp);
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return formatDate(timestamp);
};

// --- Comment Component ---
const CommentItem = memo(({ comment }) => (
    <div className="flex gap-3 text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        {comment.photoURL ? (
            <img src={comment.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/30 flex-shrink-0" />
        ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 uppercase flex-shrink-0">
                {(comment.displayName || comment.email || '?')[0]}
            </div>
        )}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                    {comment.displayName || comment.email}
                </span>
                <span className="text-[10px] text-slate-400">
                    {formatTimeTime(comment.createdAt)}
                </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 break-words leading-relaxed whitespace-pre-wrap">
                {comment.content}
            </p>
        </div>
    </div>
));

// --- Feedback Card Component ---
function FeedbackCard({ feedback, onVote, votedIds, authenticatedFetch, user, onLogin, totalUserVotes }) {
    const { t } = useLanguage();
    const hasVoted = votedIds.includes(feedback.id);
    const [isVoting, setIsVoting] = useState(false);
    const canVote = user && totalUserVotes < MAX_VOTES_PER_USER;

    // Comments state
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentContent, setCommentContent] = useState('');
    const [commentEmail, setCommentEmail] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Load comments
    const loadComments = useCallback(async () => {
        if (loadingComments) return;
        setLoadingComments(true);
        try {
            const res = await authenticatedFetch(`${API_BASE}?feedbackId=${feedback.id}`);
            const data = await res.json();
            setComments(data.comments || []);
        } catch (e) {
            console.error('Failed to load comments', e);
        } finally {
            setLoadingComments(false);
        }
    }, [feedback.id, authenticatedFetch]);

    useEffect(() => {
        if (showComments && comments.length === 0) {
            loadComments();
        }
    }, [showComments, loadComments]);

    const handleVote = async (e) => {
        e.stopPropagation();

        // Check if user is logged in
        if (!user) {
            onLogin?.();
            return;
        }

        // Check vote limit (only for upvoting, not for removing votes)
        if (!hasVoted && totalUserVotes >= MAX_VOTES_PER_USER) {
            alert(t.feedback?.voteLimitReached || `You've reached the maximum of ${MAX_VOTES_PER_USER} votes.`);
            return;
        }

        if (isVoting) return;
        setIsVoting(true);
        try {
            await onVote(feedback.id, hasVoted ? 'downvote' : 'upvote');
        } finally {
            setIsVoting(false);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentContent.trim()) return;
        if (!user && !commentEmail.trim()) return;

        setSubmittingComment(true);
        try {
            const res = await authenticatedFetch(`${API_BASE}?feedbackId=${feedback.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: commentContent,
                    email: user ? user.email : commentEmail,
                    displayName: user?.displayName,
                    photoURL: user?.photoURL,
                    uid: user?.uid
                })
            });
            const data = await res.json();
            if (data.success) {
                setComments(prev => [...prev, {
                    id: data.id,
                    content: commentContent,
                    email: user ? user.email : commentEmail,
                    displayName: user?.displayName,
                    photoURL: user?.photoURL,
                    createdAt: Date.now()
                }]);
                setCommentContent('');
            }
        } catch (e) {
            console.error('Failed to post comment', e);
            alert('Failed to post comment. Guest? Check email format.');
        } finally {
            setSubmittingComment(false);
        }
    };

    const statusLabel = {
        pending: t.feedback?.pending || 'Pending',
        in_progress: t.feedback?.inProgress || 'In Progress',
        planned: t.feedback?.planned || 'Planned',
        done: t.feedback?.done || 'Done'
    };

    // Determine button state and title
    const getVoteButtonProps = () => {
        if (!user) {
            return {
                disabled: false,
                title: t.feedback?.loginToVote || 'Sign in to vote',
                className: 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-400 dark:bg-slate-800 dark:hover:bg-orange-900/20'
            };
        }
        if (hasVoted) {
            return {
                disabled: isVoting,
                title: t.feedback?.removeVote || 'Remove vote',
                className: 'bg-orange-100 text-orange-500 dark:bg-orange-900/30'
            };
        }
        if (totalUserVotes >= MAX_VOTES_PER_USER) {
            return {
                disabled: true,
                title: t.feedback?.voteLimitReached || `Vote limit reached (${MAX_VOTES_PER_USER})`,
                className: 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            };
        }
        return {
            disabled: isVoting,
            title: t.feedback?.upvote || 'Upvote',
            className: 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-400 dark:bg-slate-800 dark:hover:bg-orange-900/20'
        };
    };

    const voteButtonProps = getVoteButtonProps();

    return (
        <div className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group">
            <div className="flex gap-3">
                {/* Vote Section */}
                <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                        onClick={handleVote}
                        disabled={voteButtonProps.disabled}
                        title={voteButtonProps.title}
                        className={`p-2 rounded-xl transition-all duration-200 ${voteButtonProps.className}`}
                    >
                        <ThumbsUp size={16} fill={hasVoted ? 'currentColor' : 'none'} className={isVoting ? 'scale-90 opacity-70' : ''} />
                    </button>
                    <span className={`font-bold text-sm ${hasVoted ? 'text-orange-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {feedback.votes}
                    </span>
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="w-full">
                            {feedback.status && feedback.status !== 'pending' && (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${STATUS_COLORS[feedback.status] || STATUS_COLORS.pending}`}>
                                    {statusLabel[feedback.status]}
                                </span>
                            )}
                            <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed mb-2 whitespace-pre-wrap break-words">
                                {feedback.content}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            {feedback.photoURL ? (
                                <img src={feedback.photoURL} alt="" className="w-5 h-5 rounded-full border border-white/50" />
                            ) : null}
                            <span>{feedback.displayName || feedback.email}</span>
                            <span className="w-0.5 h-0.5 bg-slate-400 rounded-full" />
                            <span>{formatDate(feedback.createdAt)}</span>
                        </div>

                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                        >
                            <MessageSquare size={14} />
                            <span>{comments.length || feedback.comments}</span>
                            {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>

                    {/* Comments Section */}
                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Comment List */}
                            <div className="space-y-3 mb-4">
                                {loadingComments ? (
                                    <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
                                ) : comments.length > 0 ? (
                                    comments.map(c => <CommentItem key={c.id} comment={c} />)
                                ) : (
                                    <p className="text-center text-xs text-slate-400 py-2">No discussion yet.</p>
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-2 items-start">
                                {!user && (
                                    <input
                                        type="email"
                                        value={commentEmail}
                                        onChange={e => setCommentEmail(e.target.value)}
                                        placeholder="Email"
                                        className="w-24 px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:border-orange-500"
                                    />
                                )}
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={commentContent}
                                        onChange={e => setCommentContent(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCommentSubmit()}
                                        placeholder="Add a comment..."
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:border-orange-500 pr-8"
                                    />
                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={submittingComment || !commentContent.trim()}
                                        className="absolute right-1 top-1 p-1 text-orange-500 hover:bg-orange-50 rounded dark:hover:bg-slate-600 disabled:opacity-30"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
        <div className="glass-card rounded-2xl p-4 mb-6 sticky top-4 z-10 shadow-xl shadow-orange-500/5 ring-1 ring-white/20 backdrop-blur-xl">
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
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
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
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        disabled={isSubmitting}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !content.trim()}
                        className="p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

// Main Feedback View Component (embedded in GalleryPage)
export default function FeedbackView({ user, onLogin }) {
    const { t } = useLanguage();

    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('hot');
    const [votedIds, setVotedIds] = useState([]);

    // Calculate total user votes
    const totalUserVotes = votedIds.length;

    // Load voted IDs from localStorage (per-user if logged in)
    useEffect(() => {
        const storageKey = user ? `feedback_voted_ids_${user.uid}` : 'feedback_voted_ids_guest';
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try { setVotedIds(JSON.parse(saved)); } catch (e) { }
        } else {
            setVotedIds([]);
        }
    }, [user]);

    const saveVotedIds = (ids) => {
        setVotedIds(ids);
        const storageKey = user ? `feedback_voted_ids_${user.uid}` : 'feedback_voted_ids_guest';
        localStorage.setItem(storageKey, JSON.stringify(ids));
    };

    const authenticatedFetch = useCallback(async (url, options = {}) => {
        const headers = { ...options.headers };
        if (auth.currentUser) {
            try {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (e) { console.warn('Failed to get ID token', e); }
        }
        return fetch(url, { ...options, headers });
    }, []);

    const fetchFeedbacks = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const response = await authenticatedFetch(`${API_BASE}?sort=${sortBy}`);
            const data = await response.json();
            setFeedbacks(data.feedbacks || []);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
        } finally {
            setIsLoading(false);
        }
    }, [sortBy, authenticatedFetch]);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    const handleVote = async (feedbackId, action) => {
        // Require login for voting
        if (!user) {
            onLogin?.();
            return;
        }

        const wasVoted = votedIds.includes(feedbackId);

        // Optimistic update
        setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? {
            ...fb,
            votes: fb.votes + (action === 'upvote' ? (wasVoted ? 0 : 1) : (wasVoted ? -1 : 0))
        } : fb));

        // Update voted IDs optimistically
        let newVotedIds = votedIds;
        if (action === 'upvote' && !wasVoted) {
            newVotedIds = [...votedIds, feedbackId];
        } else if (action === 'downvote' || (action === 'upvote' && wasVoted)) {
            newVotedIds = votedIds.filter(id => id !== feedbackId);
        }
        saveVotedIds(newVotedIds);

        try {
            const response = await authenticatedFetch(API_BASE, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedbackId, action, uid: user.uid })
            });
            const data = await response.json();
            if (data.success) {
                setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? { ...fb, votes: data.votes } : fb));
            } else if (data.error) {
                // Revert on error
                saveVotedIds(votedIds);
                alert(data.error);
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            // Revert on error
            saveVotedIds(votedIds);
        }
    };

    const handleSubmitFeedback = async (data) => {
        const response = await authenticatedFetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Failed');
        fetchFeedbacks(true);
        if (resData.id) saveVotedIds([...votedIds, resData.id]);
    };

    const sortOptions = [
        { key: 'hot', icon: Flame, label: t.feedback?.hot || 'Hot' },
        { key: 'top', icon: TrendingUp, label: t.feedback?.top || 'Top' },
        { key: 'recent', icon: Clock, label: t.feedback?.recent || 'Recent' }
    ];

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Vote limit indicator for logged in users */}
            {user && (
                <div className="mb-4 text-center">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${totalUserVotes >= MAX_VOTES_PER_USER
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {t.feedback?.votesRemaining || 'Votes remaining'}: {MAX_VOTES_PER_USER - totalUserVotes}/{MAX_VOTES_PER_USER}
                    </span>
                </div>
            )}

            <FeedbackSubmitForm user={user} onSubmit={handleSubmitFeedback} t={t} />

            <div className="flex justify-center mb-6">
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-white/10 backdrop-blur-md">
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

            <div className="space-y-4">
                {isLoading && feedbacks.length === 0 ? (
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
                            authenticatedFetch={authenticatedFetch}
                            user={user}
                            onLogin={onLogin}
                            totalUserVotes={totalUserVotes}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
