/**
 * Optimizes image URLs for Huawei Cloud OBS (and compatible services)
 * using read-time image processing parameters.
 * 
 * @param {string} url - The original image URL
 * @param {number} width - Target width (default 800px for cards)
 * @returns {string} - The optimized URL
 */
export const optimizeImageUrl = (url, width = 800) => {
    if (!url) return url;
    if (typeof url !== 'string') return url;

    // 1. Skip if data URL or blob
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    // 2. Skip if already optimized (avoid double params)
    if (url.includes('x-image-process=')) return url;

    // 3. Check if it's likely a cloud storage URL (Huawei OBS, etc.)
    // Matches common patterns: myhuaweicloud.com, amazonaws.com (if supported), or custom domains
    // For safety, we apply it loosely but try to respect query params

    // Determine separator
    const separator = url.includes('?') ? '&' : '?';

    // Huawei Cloud OBS Image Processing Syntax
    // Resize to width, maintain aspect ratio
    // Convert to WebP
    // Set quality to 75%
    const params = `x-image-process=image/resize,w_${width},limit_0/quality,q_75/format,webp`;

    return `${url}${separator}${params}`;
};
