/**
 * Utility: Resolve remote image URLs to Base64
 */
export const resolveRemoteImages = async (messages) => {
    const resolved = JSON.parse(JSON.stringify(messages));
    for (const msg of resolved) {
        if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'image' && part.source?.media_type === 'url') {
                    try {
                        const resp = await fetch(part.source.data);
                        const blob = await resp.blob();
                        const reader = new FileReader();
                        const base64 = await new Promise((resolve) => {
                            reader.onloadend = () => resolve(reader.result.split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                        part.source.data = base64;
                        part.source.media_type = blob.type;
                    } catch (e) {
                        console.error("[LLM Utils] Image resolution failed", e);
                    }
                }
            }
        }
    }
    return resolved;
};

/**
 * Utility: Determine auth method from URL
 */
export const getAuthMethod = (url) => {
    if (url.indexOf('googleapis.com') !== -1) return 'query';
    return 'bearer';
};
