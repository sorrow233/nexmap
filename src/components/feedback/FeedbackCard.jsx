import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../utils/format';
import CommentItem from './CommentItem';

const STATUS_COLORS = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

const API_BASE = '/api/feedback';
const MAX_VOTES_PER_USER = 1;

function FeedbackCard({ feedback, onVote, votedIds, authenticatedFetch, user, onLogin, totalUserVotes, statusColors = STATUS_COLORS }) {
    const { t } = useLanguage();
    const hasVoted = votedIds.includes(feedback.id);
    const [isVoting, setIsVoting] = useState(false);

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

        if (!user) {
            onLogin?.();
            return;
        }

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

    const getVoteButtonProps = () => {
        if (!user) {
            return {
                disabled: false,
                title: t.feedback?.loginToVote || 'Sign in to vote',
                className: 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-900/20'
            };
        }
        if (hasVoted) {
            return {
                disabled: isVoting,
                title: t.feedback?.removeVote || 'Remove vote',
                className: 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30' // Uses indigo theme by default
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
            className: 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-900/20'
        };
    };

    const voteButtonProps = getVoteButtonProps();

    return (
        <div className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all duration-300 group ring-1 ring-slate-900/5 dark:ring-white/10">
            <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                        onClick={handleVote}
                        disabled={voteButtonProps.disabled}
                        title={voteButtonProps.title}
                        className={`p-2 rounded-xl transition-all duration-200 ${voteButtonProps.className}`}
                    >
                        <ThumbsUp size={16} fill={hasVoted ? 'currentColor' : 'none'} className={isVoting ? 'scale-90 opacity-70' : ''} />
                    </button>
                    <span className={`font-bold text-sm ${hasVoted ? 'text-indigo-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {feedback.votes}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="w-full">
                            {feedback.status && feedback.status !== 'pending' && (
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${statusColors[feedback.status] || statusColors.pending}`}>
                                    {statusLabel[feedback.status]}
                                </span>
                            )}
                            <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed mb-2 whitespace-pre-wrap break-words font-inter-tight">
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
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-500 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ml-auto"
                        >
                            <MessageSquare size={14} />
                            <span>{comments.length || feedback.comments}</span>
                            {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>

                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-3 mb-4">
                                {loadingComments ? (
                                    <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /></div>
                                ) : comments.length > 0 ? (
                                    comments.map(c => <CommentItem key={c.id} comment={c} />)
                                ) : (
                                    <p className="text-center text-xs text-slate-400 py-2">No discussion yet.</p>
                                )}
                            </div>

                            <div className="flex gap-2 items-start">
                                {!user && (
                                    <input
                                        type="email"
                                        value={commentEmail}
                                        onChange={e => setCommentEmail(e.target.value)}
                                        placeholder="Email"
                                        className="w-24 px-2 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:border-indigo-500"
                                    />
                                )}
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={commentContent}
                                        onChange={e => setCommentContent(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCommentSubmit()}
                                        placeholder="Add a comment..."
                                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:border-indigo-500 pr-8"
                                    />
                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={submittingComment || !commentContent.trim()}
                                        className="absolute right-1 top-1 p-1 text-indigo-500 hover:bg-indigo-50 rounded dark:hover:bg-slate-600 disabled:opacity-30"
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

export default FeedbackCard;
