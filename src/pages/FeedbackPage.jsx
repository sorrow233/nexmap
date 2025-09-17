import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ArrowLeft, Flame, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../services/firebase';
import FeedbackCard from '../components/feedback/FeedbackCard';
import FeedbackSubmitForm from '../components/feedback/FeedbackSubmitForm';
import SEO from '../components/SEO';

// API base URL
const API_BASE = '/api/feedback';

// Status badge colors
const STATUS_COLORS = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
};

// Main Feedback Page
export default function FeedbackPage() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [user, setUser] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('hot');
    const [votedIds, setVotedIds] = useState([]);

    // Listen to auth state
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            setUser(authUser);
        });
        return () => unsubscribe();
    }, []);

    // Load voted IDs
    useEffect(() => {
        const saved = localStorage.getItem('feedback_voted_ids');
        if (saved) {
            try { setVotedIds(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    const saveVotedIds = (ids) => {
        setVotedIds(ids);
        localStorage.setItem('feedback_voted_ids', JSON.stringify(ids));
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
            // Prevent flicker if data is empty on initial load
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
        // Optimistic update
        setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? {
            ...fb,
            votes: fb.votes + (action === 'upvote' ? (votedIds.includes(feedbackId) ? 0 : 1) : (votedIds.includes(feedbackId) ? -1 : 0))
        } : fb));

        // Update voted IDs optimistically
        let newVotedIds = votedIds;
        if (action === 'upvote' && !votedIds.includes(feedbackId)) {
            newVotedIds = [...votedIds, feedbackId];
        } else if (action === 'downvote' || (action === 'upvote' && votedIds.includes(feedbackId))) {
            newVotedIds = votedIds.filter(id => id !== feedbackId);
        }
        saveVotedIds(newVotedIds);

        try {
            const response = await authenticatedFetch(API_BASE, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedbackId, action })
            });
            const data = await response.json();
            if (data.success) {
                // Correct with server data if needed
                setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? { ...fb, votes: data.votes } : fb));
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            // Revert on error could be implemented here
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
        fetchFeedbacks(true); // Silent refresh
        if (resData.id) saveVotedIds([...votedIds, resData.id]);
    };

    const sortOptions = [
        { key: 'hot', icon: Flame, label: t.feedback?.hot || 'Hot' },
        { key: 'top', icon: TrendingUp, label: t.feedback?.top || 'Top' },
        { key: 'recent', icon: Clock, label: t.feedback?.recent || 'Recent' }
    ];

    return (
        <div className="bg-mesh-gradient min-h-screen text-slate-900 dark:text-slate-200 p-4 md:p-8 font-lxgw">
            <SEO title="Feedback" description="Share your feedback, vote on features, and help us improve NexMap." />
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/gallery')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors glass-card">
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                        <span className="text-gradient">Nex</span>Map
                        <span className="text-slate-400 font-normal text-base border-l border-slate-300 dark:border-slate-600 pl-3">
                            {t.feedback?.title || 'Feedback'}
                        </span>
                    </h1>
                </div>

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

                <div className="space-y-4 pb-20">
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
                                statusColors={STATUS_COLORS}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
