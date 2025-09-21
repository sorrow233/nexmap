import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_CONFIG_KEY = 'mixboard_s3_config';

export const getS3Config = () => {
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

export const uploadImageToS3 = async (file) => {
    const config = getS3Config();
    if (!config || !config.enabled) {
        throw new Error("S3 is not configured or enabled");
    }

    const { endpoint, region, bucket, accessKeyId, secretAccessKey, publicDomain } = config;

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

    // Generate unique filename: timestamp-random-filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Convert File to ArrayBuffer for browser compatibility
    const arrayBuffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: arrayBuffer,
        ContentType: file.type,
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
        return `${domain}/${filename}`;
    }

    // Fallback URL construction (Best guess, might need adjustment for specific providers)
    if (endpoint) {
        // For Huawei Cloud OBS: https://bucket.endpoint/filename
        if (endpoint.indexOf('myhuaweicloud.com') !== -1) {
            // Extract endpoint without protocol
            const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
            return `https://${bucket}.${cleanEndpoint}/${filename}`;
        }
        // For standard S3: https://bucket.s3.region.amazonaws.com/key
        if (endpoint.indexOf('amazonaws.com') !== -1) {
            return `https://${bucket}.s3.${region || 'us-east-1'}.amazonaws.com/${filename}`;
        }
        // Generic fallback - might not work without public domain
        return `${endpoint}/${bucket}/${filename}`;
    }

    throw new Error("Upload successful but cannot determine public URL. Please configure a Public Domain.");
};
