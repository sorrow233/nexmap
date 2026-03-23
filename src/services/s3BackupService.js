import {
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import packageJson from '../../package.json';
import {
    exportAllData,
    generateBackupFilename,
    getBackupStats,
    importData,
    validateImportData
} from './dataExportService';
import { createSafetyBackup } from './safetyBackupService';
import { getS3Config } from './s3';

const BACKUP_ROOT_FOLDER = 'backups/full-data';
const DEFAULT_LIST_LIMIT = 20;
const MAX_REMOTE_BACKUPS = 5;

const createBackupId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatDateFolder = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const sanitizeBackupFilename = (filename) => {
    return filename
        .replace(/^Mixboard_Backup_/i, 'mixboard-full-backup_')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
};

const buildBackupFolder = (config, date, backupId) => {
    return [
        config.folderPrefix || '',
        BACKUP_ROOT_FOLDER,
        formatDateFolder(date),
        backupId
    ].filter(Boolean).join('/');
};

const resolveS3Config = (configOverride) => {
    if (configOverride && typeof configOverride === 'object') {
        return {
            region: 'auto',
            ...configOverride
        };
    }
    const storedConfig = getS3Config();
    return storedConfig ? { region: 'auto', ...storedConfig } : null;
};

const validateS3Config = (config) => {
    if (!config) {
        throw new Error('请先配置 S3。');
    }
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
        throw new Error('S3 配置不完整，请至少填写 Bucket、Access Key ID 和 Secret Access Key。');
    }
};

const createS3Client = (config) => {
    return new S3Client({
        region: config.region || 'auto',
        endpoint: config.endpoint || undefined,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
        }
    });
};

const objectBodyToText = async (body) => {
    if (!body) return '';
    if (typeof body.transformToString === 'function') {
        return body.transformToString();
    }
    if (typeof body.text === 'function') {
        return body.text();
    }
    if (typeof body.arrayBuffer === 'function') {
        const buffer = await body.arrayBuffer();
        return new TextDecoder().decode(buffer);
    }
    if (typeof body.getReader === 'function') {
        const reader = body.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const bytes = new Uint8Array(totalLength);
        let offset = 0;
        chunks.forEach((chunk) => {
            bytes.set(chunk, offset);
            offset += chunk.length;
        });
        return new TextDecoder().decode(bytes);
    }
    throw new Error('无法读取 S3 对象内容。');
};

const readJsonObject = async (client, bucket, key) => {
    const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));
    const rawText = await objectBodyToText(response.Body);
    return JSON.parse(rawText);
};

const computeSha256Hex = async (text) => {
    if (!globalThis.crypto?.subtle) {
        return '';
    }
    const bytes = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

const listBackupEntries = async (client, config, options = {}) => {
    const limit = Number(options.limit) > 0 ? Number(options.limit) : DEFAULT_LIST_LIMIT;
    const prefix = `${getResolvedS3BackupFolder(config)}/`;
    const manifestObjects = [];
    let continuationToken;

    do {
        const response = await client.send(new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken
        }));

        const currentBatch = (response.Contents || [])
            .filter((item) => item.Key && item.Key.endsWith('/manifest.json'));
        manifestObjects.push(...currentBatch);
        continuationToken = response.IsTruncated ? response.NextContinuationToken : null;
    } while (continuationToken && (options.scanAll || manifestObjects.length < limit * 2));

    const sortedCandidates = manifestObjects
        .sort((left, right) => {
            const leftTime = new Date(left.LastModified || 0).getTime();
            const rightTime = new Date(right.LastModified || 0).getTime();
            return rightTime - leftTime;
        })
        .slice(0, options.scanAll ? undefined : limit);

    const entries = await Promise.allSettled(sortedCandidates.map(async (item) => {
        const manifest = await readJsonObject(client, config.bucket, item.Key);
        return {
            id: manifest.backupId || item.Key,
            bucket: config.bucket,
            backupFolder: manifest.backupFolder || item.Key.replace(/\/manifest\.json$/, ''),
            backupKey: manifest.backupKey,
            manifestKey: item.Key,
            exportedAt: manifest.exportedAt || item.LastModified || null,
            sizeBytes: Number(manifest.sizeBytes) || 0,
            boardCount: Number(manifest.boardCount) || 0,
            settingsCount: Number(manifest.settingsCount) || 0,
            sha256: manifest.sha256 || '',
            appVersion: manifest.appVersion || '',
            schemaVersion: manifest.schemaVersion || '',
            rawManifest: manifest
        };
    }));

    return entries
        .filter((entry) => entry.status === 'fulfilled')
        .map((entry) => entry.value)
        .sort((left, right) => new Date(right.exportedAt || 0).getTime() - new Date(left.exportedAt || 0).getTime());
};

const deleteBackupEntry = async (client, bucket, entry) => {
    const keys = [entry.backupKey, entry.manifestKey].filter(Boolean);
    for (const key of keys) {
        await client.send(new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        }));
    }
};

const enforceBackupRetention = async (client, config) => {
    const backups = await listBackupEntries(client, config, { scanAll: true });
    const staleBackups = backups.slice(MAX_REMOTE_BACKUPS);
    const deletedBackupIds = [];
    const deleteErrors = [];

    for (const backup of staleBackups) {
        try {
            await deleteBackupEntry(client, config.bucket, backup);
            deletedBackupIds.push(backup.id);
        } catch (error) {
            deleteErrors.push({
                backupId: backup.id,
                message: error?.message || 'unknown_error'
            });
        }
    }

    return {
        deletedBackupIds,
        deleteErrors
    };
};

export const getResolvedS3BackupFolder = (configOverride) => {
    const config = resolveS3Config(configOverride);
    return [config?.folderPrefix || '', BACKUP_ROOT_FOLDER].filter(Boolean).join('/');
};

export async function uploadFullDataBackupToS3(configOverride = null) {
    const config = resolveS3Config(configOverride);
    validateS3Config(config);

    const exportData = await exportAllData();
    const exportJson = JSON.stringify(exportData, null, 2);
    const stats = getBackupStats(exportData);
    const sha256 = await computeSha256Hex(exportJson);
    const now = new Date();
    const backupId = createBackupId();
    const backupFolder = buildBackupFolder(config, now, backupId);
    const backupFilename = sanitizeBackupFilename(generateBackupFilename());
    const backupKey = `${backupFolder}/${backupFilename}`;
    const manifestKey = `${backupFolder}/manifest.json`;
    const client = createS3Client(config);

    const manifest = {
        type: 'mixboard-full-backup',
        appVersion: packageJson.version,
        schemaVersion: exportData.version,
        exportedAt: exportData.exportedAt,
        backupId,
        backupFolder,
        bucket: config.bucket,
        backupKey,
        sizeBytes: new Blob([exportJson]).size,
        sha256,
        boardCount: stats?.boardCount || 0,
        settingsCount: stats?.settingsCount || 0
    };

    await client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: backupKey,
        Body: exportJson,
        ContentType: 'application/json; charset=utf-8'
    }));

    await client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: manifestKey,
        Body: JSON.stringify(manifest, null, 2),
        ContentType: 'application/json; charset=utf-8'
    }));

    const retention = await enforceBackupRetention(client, config);

    return {
        bucket: config.bucket,
        backupFolder,
        backupKey,
        manifestKey,
        retention,
        stats: {
            ...stats,
            sizeBytes: manifest.sizeBytes
        }
    };
}

export async function listFullDataBackups(configOverride = null, options = {}) {
    const config = resolveS3Config(configOverride);
    validateS3Config(config);

    const client = createS3Client(config);
    return listBackupEntries(client, config, options);
}

export async function restoreFullDataBackupFromS3(configOverride = null, backupEntry, options = { importSettings: false }) {
    if (!backupEntry?.backupKey) {
        throw new Error('缺少可恢复的备份文件路径。');
    }

    const config = resolveS3Config(configOverride);
    validateS3Config(config);
    const client = createS3Client(config);
    const response = await client.send(new GetObjectCommand({
        Bucket: config.bucket,
        Key: backupEntry.backupKey
    }));
    const backupText = await objectBodyToText(response.Body);
    if (backupEntry.sha256) {
        const actualSha256 = await computeSha256Hex(backupText);
        if (!actualSha256 || actualSha256 !== backupEntry.sha256) {
            throw new Error('S3 备份完整性校验失败，已中止恢复。');
        }
    }

    let safetyBackup;
    try {
        safetyBackup = await createSafetyBackup();
    } catch (error) {
        throw new Error(`恢复前创建本地安全备份失败：${error?.message || 'unknown_error'}`);
    }

    const backupData = JSON.parse(backupText);
    const validation = validateImportData(backupData);
    if (!validation.valid) {
        throw new Error(validation.error || '备份文件格式无效。');
    }

    const result = await importData(backupData, options);
    if (!result.success) {
        return result;
    }

    return {
        ...result,
        integrityVerified: Boolean(backupEntry.sha256),
        safetyBackupTimestamp: safetyBackup?.timestamp || null
    };
}
