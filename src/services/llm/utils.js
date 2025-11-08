import { getImageFromIDB } from '../imageStore';

/**
 * Utility: Resolve ALL image types to Base64
 * Supports: idb (IndexedDB), url (remote), base64 (passthrough)
 * 
 * This is the primary image resolution function - use this for LLM calls.
 */
export const resolveAllImages = async (messages) => {
    const resolved = JSON.parse(JSON.stringify(messages));

    for (const msg of resolved) {
        if (Array.isArray(msg.content)) {
            const filteredContent = [];

            for (const part of msg.content) {
                // Pass through non-image parts
                if (part.type !== 'image') {
                    filteredContent.push(part);
                    continue;
                }

                const source = part.source;
                if (!source) {
                    console.warn('[LLM Utils] Image part has no source, skipping');
                    continue;
                }

                try {
                    // 1. IDB type - resolve from IndexedDB
                    if (source.type === 'idb' && source.id) {
                        console.log('[LLM Utils] Resolving IDB image:', source.id);
                        const data = await getImageFromIDB(source.id);
                        if (data) {
                            filteredContent.push({
                                type: 'image',
                                source: {
                                    media_type: source.media_type || 'image/png',
                                    data: data
                                }
                            });
                        } else {
                            console.warn('[LLM Utils] IDB image not found:', source.id);
                        }
                        continue;
                    }

                    // 2. URL type - download and convert to base64
                    if (source.type === 'url' || source.media_type === 'url') {
                        const url = source.url || source.data;
                        console.log('[LLM Utils] Resolving URL image:', url?.substring(0, 50));
                        const resp = await fetch(url);
                        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
                        const blob = await resp.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        filteredContent.push({
                            type: 'image',
                            source: {
                                media_type: blob.type || 'image/png',
                                data: base64
                            }
                        });
                        continue;
                    }

                    // 3. Base64 type - passthrough (already has data)
                    if (source.data) {
                        // Normalize the structure
                        filteredContent.push({
                            type: 'image',
                            source: {
                                media_type: source.media_type || 'image/png',
                                data: source.data
                            }
                        });
                        continue;
                    }

                    // 4. S3 URL fallback - if s3Url exists, download it
                    if (source.s3Url) {
                        console.log('[LLM Utils] Resolving S3 image:', source.s3Url.substring(0, 50));
                        const resp = await fetch(source.s3Url);
                        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
                        const blob = await resp.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                        filteredContent.push({
                            type: 'image',
                            source: {
                                media_type: blob.type || source.media_type || 'image/png',
                                data: base64
                            }
                        });
                        continue;
                    }

                    console.warn('[LLM Utils] Unknown image source type, skipping:', source);

                } catch (e) {
                    console.error('[LLM Utils] Image resolution failed:', e);
                    // Skip this image but continue processing
                }
            }

            msg.content = filteredContent;
        }
    }

    return resolved;
};

/**
 * @deprecated Use resolveAllImages instead
 * Utility: Resolve remote image URLs to Base64 (legacy)
 */
export const resolveRemoteImages = async (messages) => {
    console.warn('[LLM Utils] resolveRemoteImages is deprecated, use resolveAllImages');
    return resolveAllImages(messages);
};

/**
 * Utility: Determine auth method from URL
 */
export const getAuthMethod = (url) => {
    if (url.indexOf('googleapis.com') !== -1) return 'query';
    return 'bearer';
};
