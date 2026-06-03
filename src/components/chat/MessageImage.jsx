import React from 'react';
import { getImageFromIDB } from '../../services/storage';

const base64ToBlob = (base64Data = '', mimeType = 'image/png') => {
    const binaryString = atob(base64Data);
    const sliceSize = 1024;
    const byteArrays = [];

    for (let offset = 0; offset < binaryString.length; offset += sliceSize) {
        const slice = binaryString.slice(offset, offset + sliceSize);
        const bytes = new Uint8Array(slice.length);
        for (let index = 0; index < slice.length; index += 1) {
            bytes[index] = slice.charCodeAt(index);
        }
        byteArrays.push(bytes);
    }

    return new Blob(byteArrays, { type: mimeType || 'image/png' });
};

const createObjectUrlFromBase64 = (base64Data, mimeType) => {
    if (!base64Data) return '';
    return URL.createObjectURL(base64ToBlob(base64Data, mimeType));
};

/**
 * MessageImage Component
 * Handles loading and displaying images from various sources (S3, IDB, Base64)
 */
const MessageImage = ({ img }) => {
    const [imgSrc, setImgSrc] = React.useState(null);
    const objectUrlRef = React.useRef('');

    const revokeObjectUrl = React.useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = '';
        }
    }, []);

    const setImageSource = React.useCallback((src, { objectUrl = false } = {}) => {
        revokeObjectUrl();
        if (objectUrl) {
            objectUrlRef.current = src;
        }
        setImgSrc(src || null);
    }, [revokeObjectUrl]);

    React.useEffect(() => {
        let active = true;
        const load = async () => {
            setImageSource(null);

            // 1. S3 URL (Primary)
            if (img.source?.s3Url) {
                if (active) setImageSource(img.source.s3Url);
                return;
            }
            // 2. IDB (Async)
            if (img.source?.type === 'idb' && img.source.id) {
                const data = await getImageFromIDB(img.source.id);
                if (active && data) {
                    const objectUrl = createObjectUrlFromBase64(data, img.source.media_type);
                    setImageSource(objectUrl, { objectUrl: true });
                }
                return;
            }
            // 3. Base64 (Legacy/Fallback)
            if (img.source?.data) {
                if (active) {
                    const objectUrl = createObjectUrlFromBase64(img.source.data, img.source.media_type);
                    setImageSource(objectUrl, { objectUrl: true });
                }
            }
        };
        load();
        return () => {
            active = false;
            revokeObjectUrl();
        };
    }, [img, revokeObjectUrl, setImageSource]);

    if (!imgSrc) return <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-white/10" />;

    return (
        <img
            src={imgSrc}
            alt="Uploaded"
            className="h-32 w-auto rounded-xl border border-slate-200 dark:border-white/10"
            onError={() => {
                console.warn("Image load failed, trying fallbacks");
                // If S3 failed, try IDB or Base64 fallback if available
                if (img.source?.s3Url) {
                    if (img.source?.type === 'idb' && img.source.id) {
                        getImageFromIDB(img.source.id).then(data => {
                            if (!data) return;
                            const objectUrl = createObjectUrlFromBase64(data, img.source.media_type);
                            setImageSource(objectUrl, { objectUrl: true });
                        });
                    } else if (img.source?.data) {
                        const objectUrl = createObjectUrlFromBase64(img.source.data, img.source.media_type);
                        setImageSource(objectUrl, { objectUrl: true });
                    }
                }
            }}
        />
    );
};

export default MessageImage;
