import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import imageCompression from 'browser-image-compression';

const S3_CONFIG_KEY = 'mixboard_s3_config';

export const getS3Config = () => {
    // 0. Super Easy Mode: Single JSON Variable
    if (import.meta.env.VITE_S3_CONFIG_JSON) {
        try {
            const jsonConfig = JSON.parse(import.meta.env.VITE_S3_CONFIG_JSON);
            return {
                enabled: true,
                region: 'auto', // Default if missing
                ...jsonConfig
            };
        } catch (e) {
            console.error("Failed to parse VITE_S3_CONFIG_JSON", e);
        }
    }

    // 1. First priority: Environment Variables (classic)
    if (import.meta.env.VITE_S3_ACCESS_KEY && import.meta.env.VITE_S3_BUCKET) {
        return {
            enabled: true,
            endpoint: import.meta.env.VITE_S3_ENDPOINT,
            region: import.meta.env.VITE_S3_REGION || 'auto',
            bucket: import.meta.env.VITE_S3_BUCKET,
            accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY,
            secretAccessKey: import.meta.env.VITE_S3_SECRET_KEY,
            publicDomain: import.meta.env.VITE_S3_PUBLIC_DOMAIN,
            folderPrefix: import.meta.env.VITE_S3_FOLDER_PREFIX || ''
        };
    }

    // 2. Fallback: Local Storage (User specific overrides)
    try {
        const stored = localStorage.getItem(S3_CONFIG_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error("Failed to parse S3 config", e);
        return null;
    }
};

export const saveS3Config = (config) => {
    if (!config) {
        localStorage.removeItem(S3_CONFIG_KEY);
        return;
    }
    localStorage.setItem(S3_CONFIG_KEY, JSON.stringify(config));
};

/**
 * Compresses an image file using modern web technologies (WebP).
 * Optimized for AI readability while minimizing file size.
 * @param {File} file - The original image file
 * @returns {Promise<File>} - The compressed image file
 */
const compressImage = async (file) => {
    // Skip if not an image
    if (!file.type.startsWith('image/')) return file;
    // Skip if already small (e.g. < 500KB)
    if (file.size < 0.5 * 1024 * 1024) return file;

    const options = {
        maxSizeMB: 1,           // Target roughly 1MB or less
        maxWidthOrHeight: 1920, // 1080p is sufficient for AI reading text
        useWebWorker: true,
        fileType: 'image/webp', // Use WebP for better compression/quality ratio
        initialQuality: 0.6     // Good balance for AI OCR
    };

    try {
        console.log(`[Compression] Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const compressedBlob = await imageCompression(file, options);

        // Create a new File object from the blob to preserve name (with new extension)
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        const compressedFile = new File([compressedBlob], newName, {
            type: 'image/webp',
            lastModified: Date.now()
        });

        console.log(`[Compression] Finished. New size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB. Saved: ${((1 - compressedFile.size / file.size) * 100).toFixed(0)}%`);
        return compressedFile;
    } catch (error) {
        console.error('[Compression] Failed, using original file:', error);
        return file;
    }
};

export const uploadImageToS3 = async (file, folder = 'uploads') => {
    const config = getS3Config();
    if (!config || !config.enabled) {
        throw new Error("S3 is not configured or enabled");
    }

    // 1. Compress Image (New Feature)
    const fileToUpload = await compressImage(file);

    const { endpoint, region, bucket, accessKeyId, secretAccessKey, publicDomain, folderPrefix } = config;

    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error("Missing required S3 configuration fields");
    }

    const client = new S3Client({
        region: region || "auto",
        endpoint: endpoint, // Optional for AWS, required for R2/OBS/MinIO
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });

    // Folder Management: prefix/folder/YYYY-MM/filename
    const date = new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const cleanFilename = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueId = Math.random().toString(36).substring(2, 9);

    // Construct Path: e.g. "nexmap/backgrounds/2024-01/17012345-abc1234-image.png"
    // Use configured global prefix if it exists, otherwise explicit folder
    let keyPath = [folderPrefix, folder, yearMonth].filter(p => p).join('/');
    const finalKey = `${keyPath}/${Date.now()}-${uniqueId}-${cleanFilename}`;

    // Convert File to ArrayBuffer for browser compatibility
    const arrayBuffer = await fileToUpload.arrayBuffer();

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: arrayBuffer,
        ContentType: fileToUpload.type,
        // ACL is often not supported by R2/S3 depending on bucket settings, so we default to bucket policy
    });

    try {
        await client.send(command);
    } catch (error) {
        // CORS error - silently throw, as fallback works anyway
        if (error.message && (error.message.includes('CORS') || error.name === 'TypeError' && error.message.includes('Failed to fetch'))) {
            const corsError = new Error('CORS_ERROR: S3 upload blocked. Using fallback.');
            corsError.isCorsError = true;
            throw corsError;
        }
        throw error;
    }

    // Construct Public URL
    if (publicDomain) {
        // Remove trailing slash if present
        let domain = publicDomain.replace(/\/$/, "");
        if (!domain.startsWith('http')) {
            domain = `https://${domain}`;
        }
        return `${domain}/${finalKey}`; // Using finalKey which includes folders
    }

    // Fallback URL construction (Best guess, might need adjustment for specific providers)
    if (endpoint) {
        // For Huawei Cloud OBS: https://bucket.endpoint/filename
        if (endpoint.indexOf('myhuaweicloud.com') !== -1) {
            // Extract endpoint without protocol
            const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
            return `https://${bucket}.${cleanEndpoint}/${finalKey}`;
        }
        // For standard S3: https://bucket.s3.region.amazonaws.com/key
        if (endpoint.indexOf('amazonaws.com') !== -1) {
            return `https://${bucket}.s3.${region || 'us-east-1'}.amazonaws.com/${finalKey}`;
        }
        // Generic fallback - might not work without public domain
        return `${endpoint}/${bucket}/${finalKey}`;
    }

    throw new Error("Upload successful but cannot determine public URL. Please configure a Public Domain.");
};
