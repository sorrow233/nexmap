import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Flame, TrendingUp, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';
import FeedbackCard from './feedback/FeedbackCard';
import FeedbackSubmitForm from './feedback/FeedbackSubmitForm';

// API base URL
const API_BASE = '/api/feedback';

// Max votes per user
const MAX_VOTES_PER_USER = 1;

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
                        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
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
