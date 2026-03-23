import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import packageJson from '../../package.json';
import { exportAllData, generateBackupFilename, getBackupStats } from './dataExportService';
import { getS3Config } from './s3';

const BACKUP_ROOT_FOLDER = 'backups/full-data';

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

    return {
        bucket: config.bucket,
        backupFolder,
        backupKey,
        manifestKey,
        stats: {
            ...stats,
            sizeBytes: manifest.sizeBytes
        }
    };
}
