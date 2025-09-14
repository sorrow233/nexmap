import React, { memo } from 'react';
import { formatSmartTime } from '../../utils/format';

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
                    {formatSmartTime(comment.createdAt)}
                </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 break-words leading-relaxed whitespace-pre-wrap">
                {comment.content}
            </p>
        </div>
    </div>
));

export default CommentItem;
