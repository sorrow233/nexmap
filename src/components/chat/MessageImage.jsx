import React from 'react';
import { getImageFromIDB } from '../../services/storage';

/**
 * MessageImage Component
 * Handles loading and displaying images from various sources (S3, IDB, Base64)
 */
const MessageImage = ({ img }) => {
    const [imgSrc, setImgSrc] = React.useState(null);

    React.useEffect(() => {
        let active = true;
        const load = async () => {
            // 1. S3 URL (Primary)
            if (img.source?.s3Url) {
                if (active) setImgSrc(img.source.s3Url);
                return;
            }
            // 2. IDB (Async)
            if (img.source?.type === 'idb' && img.source.id) {
                const data = await getImageFromIDB(img.source.id);
                if (active && data) setImgSrc(`data:${img.source.media_type};base64,${data}`);
                return;
            }
            // 3. Base64 (Legacy/Fallback)
            if (img.source?.data) {
                if (active) setImgSrc(`data:${img.source.media_type};base64,${img.source.data}`);
            }
        };
        load();
        return () => { active = false; };
    }, [img]);

    if (!imgSrc) return <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-white/10" />;

    return (
        <img
            src={imgSrc}
            alt="Uploaded"
            className="h-32 w-auto rounded-xl border border-slate-200 dark:border-white/10"
            onError={(e) => {
                console.warn("Image load failed, trying fallbacks");
                // If S3 failed, try IDB or Base64 fallback if available
                if (img.source?.s3Url) {
                    if (img.source?.type === 'idb' && img.source.id) {
                        getImageFromIDB(img.source.id).then(data => {
                            if (data) e.target.src = `data:${img.source.media_type};base64,${data}`;
                        });
                    } else if (img.source?.data) {
                        e.target.src = `data:${img.source.media_type};base64,${img.source.data}`;
                    }
                }
            }}
        />
    );
};

export default MessageImage;
