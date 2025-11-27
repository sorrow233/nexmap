/**
 * Generate Image using GMI Cloud Async API via Cloudflare Proxy
 * @param {string} apiKey - The API Key for authorization
 * @param {string} prompt - The image generation prompt
 * @param {string} model - The model to use (default: gemini-3-pro-image-preview)
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The URL of the generated image
 */
export async function generateGeminiImage(apiKey, prompt, model, options = {}) {
    const modelToUse = model || 'gemini-3-pro-image-preview';

    // Use Cloudflare Function proxy to bypass CORS
    const proxyEndpoint = '/api/image-gen';

    console.log('[GeminiImage] Starting image generation with model:', modelToUse);
    // console.log('[GeminiImage] API Key present:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');

    // 1. Submit Request
    const payload = {
        model: modelToUse,
        payload: {
            prompt: prompt,
            image_size: "1K", // 1K (approx 1024px width) fits the "max 720p" requirement well enough for performance
            aspect_ratio: "16:9" // Suitable for background
        }
    };

    console.log('[GeminiImage] Submitting image request with payload:', JSON.stringify(payload, null, 2));

    const submitResponse = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'submit',
            apiKey: apiKey,
            payload: payload
        })
    });

    console.log('[GeminiImage] Submit response status:', submitResponse.status);

    if (!submitResponse.ok) {
        const err = await submitResponse.json().catch(() => ({}));
        console.error('[GeminiImage] Submit failed:', err);
        throw new Error(`Image Request Failed: ${err.error?.message || err.error || JSON.stringify(err) || submitResponse.statusText}`);
    }

    const submitData = await submitResponse.json();
    console.log('[GeminiImage] Submit response data:', JSON.stringify(submitData, null, 2));

    const requestId = submitData.request_id;
    if (!requestId) {
        console.error('[GeminiImage] No request_id in response:', submitData);
        throw new Error(`GMI API did not return a request_id. Response: ${JSON.stringify(submitData)}`);
    }
    console.log('[GeminiImage] Image request queued, ID:', requestId);

    // 2. Poll for Status
    let attempts = 0;
    const maxAttempts = 30; // 60s timeout (2s interval)

    while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;

        const statusResponse = await fetch(proxyEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'poll',
                apiKey: apiKey,
                requestId: requestId
            })
        });

        // console.log(`[GeminiImage] Poll attempt ${attempts}/${maxAttempts}, response status:`, statusResponse.status);

        if (!statusResponse.ok) {
            console.warn(`[GeminiImage] Poll response not OK:`, statusResponse.status);
            continue;
        }

        const statusData = await statusResponse.json();
        // console.log('[GeminiImage] Poll status:', statusData.status, statusData.error || '');

        if (statusData.status === 'success') {
            const imageUrl = statusData.outcome?.media_urls?.[0]?.url;
            console.log('[GeminiImage] Image generation success! URL:', imageUrl?.substring(0, 100));
            if (!imageUrl) throw new Error("Image generated but no URL found in response");
            return imageUrl;
        }

        if (statusData.status === 'failed' || statusData.status === 'cancelled') {
            console.error('[GeminiImage] Image generation failed with status:', statusData);
            throw new Error(`Image Generation ${statusData.status}: ${statusData.error || statusData.message || 'Unknown error'}`);
        }
    }

    console.error('[GeminiImage] Image generation timed out after', maxAttempts * 2, 'seconds');
    throw new Error("Image generation timed out after 60 seconds");
}
