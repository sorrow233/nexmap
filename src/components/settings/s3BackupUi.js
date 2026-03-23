export const buildS3ConfigSignature = (config = {}) => JSON.stringify({
    enabled: Boolean(config.enabled),
    endpoint: config.endpoint || '',
    region: config.region || '',
    bucket: config.bucket || '',
    accessKeyId: config.accessKeyId || '',
    secretAccessKey: config.secretAccessKey || '',
    folderPrefix: config.folderPrefix || ''
});

export const formatBackupDisplayTime = (value) => {
    if (!value) return '未知时间';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '未知时间' : date.toLocaleString();
};

export const getBackupRankLabel = (index) => {
    if (index === 0) return '最新';
    return `第 ${index + 1} 新`;
};

export const buildBackupRestoreConfirmMessage = (backup, { restoreWithSettings = false } = {}) => {
    const lines = [
        '确定要从这个 S3 备份恢复吗？',
        '',
        `备份时间：${formatBackupDisplayTime(backup.exportedAt)}`,
        `画板数：${backup.boardCount || 0}`,
        `设置项：${backup.settingsCount || 0}`,
        `备份体积：${backup.sizeLabel || '未知'}`,
        `应用版本：${backup.appVersion || '未知'}`,
        `备份版本：${backup.schemaVersion || '未知'}`
    ];

    if (!backup.sha256) {
        lines.push('警告：这份备份没有 SHA-256 校验指纹，恢复前无法做完整性校验。');
    }

    if (!backup.isRestorable) {
        lines.push('警告：这份备份的 manifest 已损坏，无法直接恢复。');
    }

    lines.push('');
    lines.push('恢复前会先在本地创建一份安全备份，防止当前数据丢失。');
    lines.push(
        restoreWithSettings
            ? '本次会同时覆盖当前设备上的设置与密钥。'
            : '本次只恢复画板和数据，当前设备的设置与密钥会保留。'
    );

    return lines.join('\n');
};

export const buildBackupRestoreSuccessMessage = (backup, { restoreWithSettings = false, integrityVerified = false } = {}) => {
    const pieces = [
        `已从 ${formatBackupDisplayTime(backup.exportedAt)} 的 S3 备份恢复完成。`,
        '恢复前已先创建本地安全备份。'
    ];

    if (integrityVerified) {
        pieces.push('完整性校验已通过。');
    }

    if (restoreWithSettings) {
        pieces.push('本次同时导入了设置与密钥。');
    } else {
        pieces.push('当前设备的设置与密钥已保留。');
    }

    pieces.push('页面即将刷新。');
    return pieces.join('');
};
