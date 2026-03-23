import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle2, Database, Calendar, Clock, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { loadBoardsMetadata, saveBoard } from '../../services/storage';
import {
    getBackupHistory,
    restoreFromBackup,
    deleteBackup,
    forceBackup,
    getNextBackupTime
} from '../../services/scheduledBackupService';
import {
    clearSafetyBackup,
    hasSafetyBackup,
    restoreSafetyBackup
} from '../../services/safetyBackupService';
import {
    getResolvedS3BackupFolder,
    listFullDataBackups,
    restoreFullDataBackupFromS3,
    uploadFullDataBackupToS3
} from '../../services/s3BackupService';
import DataMigrationSection from './DataMigrationSection';
import {
    normalizeBoardMetadataList,
    normalizeBoardTitleMeta,
} from '../../services/boardTitle/metadata';
import { persistBoardsMetadataList } from '../../services/boardPersistence/boardsListStorage';
import {
    settingsDarkChip,
    settingsDarkField,
    settingsDarkSurface,
    settingsDarkSurfaceMuted,
    settingsDarkSurfaceStrong
} from './themeClasses';

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const storageFieldClassName = `w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] ${settingsDarkField}`;

export default function SettingsStorageTab({ s3Config, setS3ConfigState }) {
    const { t } = useLanguage();
    const [restoreStatus, setRestoreStatus] = useState('idle'); // idle, restoring, success, error
    const [restoreMsg, setRestoreMsg] = useState('');

    // Manual Import State
    const [manualJson, setManualJson] = useState('');
    const [manualRestoreStatus, setManualRestoreStatus] = useState('idle');
    const [manualRestoreMsg, setManualRestoreMsg] = useState('');
    const [showManualImport, setShowManualImport] = useState(false);

    // Scheduled Backups State
    const [backupHistory, setBackupHistory] = useState([]);
    const [nextBackupTime, setNextBackupTime] = useState(null);
    const [backupActionStatus, setBackupActionStatus] = useState('idle'); // idle, loading, success, error
    const [backupActionMsg, setBackupActionMsg] = useState('');

    const [s3BackupStatus, setS3BackupStatus] = useState('idle'); // idle, uploading, success, error
    const [s3BackupMsg, setS3BackupMsg] = useState('');
    const [s3BackupResult, setS3BackupResult] = useState(null);
    const [remoteBackups, setRemoteBackups] = useState([]);
    const [remoteBackupStatus, setRemoteBackupStatus] = useState('idle'); // idle, loading, success, error, restoring
    const [remoteBackupMsg, setRemoteBackupMsg] = useState('');
    const [restoringBackupId, setRestoringBackupId] = useState(null);
    const [restoreWithSettings, setRestoreWithSettings] = useState(false);

    const isS3Configured = Boolean(s3Config.bucket && s3Config.accessKeyId && s3Config.secretAccessKey);

    const [hasBackup, setHasBackup] = useState(() => hasSafetyBackup());

    // Load backup history on mount
    useEffect(() => {
        const loadBackups = async () => {
            const history = await getBackupHistory();
            setBackupHistory(history);
            setNextBackupTime(getNextBackupTime());
        };
        loadBackups();
    }, []);

    useEffect(() => {
        if (!isS3Configured) {
            setRemoteBackups([]);
            setRemoteBackupStatus('idle');
            setRemoteBackupMsg('');
            return;
        }

        const loadRemoteBackups = async () => {
            setRemoteBackupStatus('loading');
            setRemoteBackupMsg('');
            try {
                const backups = await listFullDataBackups(s3Config);
                setRemoteBackups(backups);
                setRemoteBackupStatus('success');
                if (backups.length === 0) {
                    setRemoteBackupMsg('S3 备份目录已连接，但还没有找到历史备份。');
                }
            } catch (error) {
                console.error('[S3Backup] Failed to list backups:', error);
                setRemoteBackupStatus('error');
                setRemoteBackupMsg(error?.message || '读取 S3 备份列表失败。');
            }
        };

        loadRemoteBackups();
    }, [isS3Configured]);

    const handleRestoreBackup = async () => {
        try {
            setRestoreStatus('restoring');
            const result = await restoreSafetyBackup();
            setRestoreMsg(`已恢复 ${result.restoredBoardCount} 个画板，写回 ${result.restoredBoardContentCount} 份画布内容。`);
            await clearSafetyBackup();
            setHasBackup(false);

            setRestoreStatus('success');
        } catch (e) {
            console.error(e);
            setRestoreStatus('error');
            setRestoreMsg(e.message);
        }
    };

    const handleManualImport = async () => {
        if (!manualJson.trim()) return;

        try {
            setManualRestoreStatus('restoring');
            let data;
            try {
                data = JSON.parse(manualJson);
            } catch (e) {
                throw new Error("Invalid JSON format. Please paste the exact code provided.");
            }

            // Handle raw array input (like the user provided)
            let boardsToRestore = [];
            if (Array.isArray(data)) {
                boardsToRestore = data;
            } else if (data.boards && Array.isArray(data.boards)) {
                boardsToRestore = data.boards;
            } else {
                throw new Error("Could not find boards list in the provided JSON");
            }

            let successCount = 0;
            const currentBoards = loadBoardsMetadata();
            const mergedBoards = new Map(currentBoards.map(board => [board.id, board]));
            for (const board of boardsToRestore) {
                // Ensure board has basic fields
                if (!board.id) continue;

                const normalizedBoard = normalizeBoardTitleMeta(board);

                // Remove deletion markers
                if (normalizedBoard.deletedAt) delete normalizedBoard.deletedAt;

                // Force update 'updatedAt' to now so it syncs as "new"
                normalizedBoard.updatedAt = Date.now();
                normalizedBoard.createdAt = normalizedBoard.createdAt || Date.now();

                try {
                    mergedBoards.set(normalizedBoard.id, normalizedBoard);
                    await saveBoard(String(normalizedBoard.id), normalizedBoard);
                    successCount++;
                } catch (err) {
                    console.error(`[Import] Failed to write board ${normalizedBoard.id}:`, err);
                }
            }

            persistBoardsMetadataList(
                normalizeBoardMetadataList(Array.from(mergedBoards.values())),
                { reason: 'settings:manual-import' }
            );

            setManualRestoreStatus('success');
            setManualRestoreMsg(`成功导入 ${successCount} 个画板，页面即将刷新。`);
            setManualJson(''); // Clear input on success

            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            console.error(e);
            setManualRestoreStatus('error');
            setManualRestoreMsg(e.message);
        }
    };

    // Scheduled Backup Handlers
    const handleRestoreScheduledBackup = async (backupId) => {
        if (!window.confirm(t.settings.storageConfig?.restoreConfirm || 'Restore missing boards from this backup? Only boards you don\'t currently have will be added.')) {
            return;
        }
        setBackupActionStatus('loading');
        setBackupActionMsg('');
        try {
            const result = await restoreFromBackup(backupId);
            if (result.success) {
                setBackupActionStatus('success');
                const msg = result.message || (result.boardCount > 0
                    ? `Restored ${result.boardCount} missing boards. Reloading...`
                    : 'No new boards to restore - all boards already exist');
                setBackupActionMsg(msg);
                if (result.boardCount > 0) {
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                throw new Error(result.error || 'Restore failed');
            }
        } catch (e) {
            setBackupActionStatus('error');
            setBackupActionMsg(e.message);
        }
    };

    const handleDeleteScheduledBackup = async (backupId) => {
        if (!window.confirm('Delete this backup permanently?')) return;
        try {
            await deleteBackup(backupId);
            setBackupHistory(prev => prev.filter(b => b.id !== backupId));
        } catch (e) {
            console.error('Delete backup failed:', e);
        }
    };

    const handleForceBackup = async () => {
        setBackupActionStatus('loading');
        setBackupActionMsg('');
        try {
            const result = await forceBackup();
            if (result.success) {
                setBackupActionStatus('success');
                setBackupActionMsg(`Backup created: ${result.boardCount} boards saved.`);
                // Refresh list
                const history = await getBackupHistory();
                setBackupHistory(history);
                setNextBackupTime(getNextBackupTime());
            } else {
                throw new Error(result.error || 'Backup failed');
            }
        } catch (e) {
            setBackupActionStatus('error');
            setBackupActionMsg(e.message);
        }
    };

    const handleUploadFullBackupToS3 = async () => {
        setS3BackupStatus('uploading');
        setS3BackupMsg('');
        setS3BackupResult(null);
        try {
            const result = await uploadFullDataBackupToS3(s3Config);
            setS3BackupStatus('success');
            setS3BackupResult(result);
            const deletedCount = result.retention?.deletedBackupIds?.length || 0;
            const cleanupWarning = result.retention?.deleteErrors?.length
                ? `但有 ${result.retention.deleteErrors.length} 份旧备份清理失败，请稍后重试。`
                : '';
            setS3BackupMsg(
                `已上传 ${result.stats?.boardCount || 0} 个画板，备份体积 ${formatBytes(result.stats?.sizeBytes || 0)}。S3 最多保留最近 5 份，本次清理了 ${deletedCount} 份旧备份。${cleanupWarning}`
            );
            const backups = await listFullDataBackups(s3Config);
            setRemoteBackups(backups);
            setRemoteBackupStatus('success');
            setRemoteBackupMsg(backups.length === 0 ? 'S3 备份目录已连接，但还没有找到历史备份。' : '');
        } catch (error) {
            console.error('[S3Backup] Upload failed:', error);
            setS3BackupStatus('error');
            setS3BackupMsg(error?.message || '上传到 S3 失败，请检查配置后重试。');
        }
    };

    const handleRefreshRemoteBackups = async () => {
        if (!isS3Configured) {
            setRemoteBackupStatus('error');
            setRemoteBackupMsg('请先填写完整的 S3 配置。');
            return;
        }

        setRemoteBackupStatus('loading');
        setRemoteBackupMsg('');
        try {
            const backups = await listFullDataBackups(s3Config);
            setRemoteBackups(backups);
            setRemoteBackupStatus('success');
            setRemoteBackupMsg(backups.length === 0 ? 'S3 备份目录已连接，但还没有找到历史备份。' : '');
        } catch (error) {
            console.error('[S3Backup] Refresh failed:', error);
            setRemoteBackupStatus('error');
            setRemoteBackupMsg(error?.message || '刷新 S3 备份列表失败。');
        }
    };

    const handleRestoreRemoteBackup = async (backup) => {
        const confirmMessage = restoreWithSettings
            ? '确定从这个 S3 备份恢复，并同时覆盖当前设备上的设置与密钥吗？'
            : '确定从这个 S3 备份恢复画板和数据吗？当前设备的设置与密钥将保留。';
        if (!window.confirm(confirmMessage)) {
            return;
        }

        setRestoringBackupId(backup.id);
        setRemoteBackupStatus('restoring');
        setRemoteBackupMsg('');
        try {
            const result = await restoreFullDataBackupFromS3(
                s3Config,
                backup,
                { importSettings: restoreWithSettings }
            );
            if (!result.success) {
                throw new Error(result.error || '从 S3 恢复失败。');
            }
            setRemoteBackupStatus('success');
            setRemoteBackupMsg(
                result.integrityVerified
                    ? 'S3 备份恢复成功，完整性校验已通过，并已先创建本地安全备份。页面即将刷新。'
                    : 'S3 备份恢复成功，已先创建本地安全备份。页面即将刷新。'
            );
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('[S3Backup] Restore failed:', error);
            setRemoteBackupStatus('error');
            setRemoteBackupMsg(error?.message || '从 S3 恢复失败。');
        } finally {
            setRestoringBackupId(null);
        }
    };


    return (
        <div className="space-y-6">


            <div className={`rounded-[24px] border border-[#eadfce] bg-[#f8f2e8] p-4 text-sm text-[#7d6b57] ${settingsDarkSurfaceStrong} dark:text-slate-200`}>
                <p className="font-bold mb-1">{t.settings.storageConfig?.byok || 'BYOK (Bring Your Own Key)'}</p>
                <p>{t.settings.storageConfig?.byokDesc || 'Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.'}</p>
            </div>

            {/* Enable Toggle */}
            <div className={`flex items-center justify-between rounded-[24px] border border-[#eee3d7] p-4 ${settingsDarkSurfaceMuted}`}>
                <div>
                    <h3 className="font-semibold text-[#43372c] dark:text-slate-200">{t.settings.storageConfig?.enable || 'Enable S3 Storage'}</h3>
                    <p className="text-xs text-[#8f7e6b] dark:text-slate-400">{t.settings.storageConfig?.enableDesc || 'Upload images to your own cloud bucket'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={s3Config.enabled}
                        onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
                    />
                    <div className="h-6 w-11 rounded-full bg-[#e9dfd2] peer after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[#e1d4c4] after:bg-white after:transition-all after:content-[''] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f4e7d2] peer-checked:bg-[#efb65a] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-[#1b2430] dark:border-slate-600 dark:peer-focus:ring-slate-700/60"></div>
                </label>
            </div>

            {s3Config.enabled && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.endpoint || 'Endpoint URL'}</label>
                        <input
                            type="text"
                            value={s3Config.endpoint}
                            onChange={e => setS3ConfigState({ ...s3Config, endpoint: e.target.value })}
                            placeholder="https://<account>.r2.cloudflarestorage.com"
                            className={storageFieldClassName}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.region || 'Region'}</label>
                            <input
                                type="text"
                                value={s3Config.region}
                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                placeholder="auto"
                                className={storageFieldClassName}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.bucket || 'Bucket Name'}</label>
                            <input
                                type="text"
                                value={s3Config.bucket}
                                onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
                                className={storageFieldClassName}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.accessKey || 'Access Key ID'}</label>
                            <input
                                type="text"
                                value={s3Config.accessKeyId}
                                onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                className={storageFieldClassName}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.secretKey || 'Secret Access Key'}</label>
                            <input
                                type="password"
                                value={s3Config.secretAccessKey}
                                onChange={e => setS3ConfigState({ ...s3Config, secretAccessKey: e.target.value })}
                                className={storageFieldClassName}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className={`rounded-[24px] border border-[#eee3d7] bg-[#fffaf2] p-5 ${settingsDarkSurface}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div>
                            <h3 className="font-semibold text-[#43372c] dark:text-slate-200">S3 全量备份</h3>
                            <p className="text-xs text-[#8f7e6b] dark:text-slate-400">
                                把当前设备上的全部本地数据直接导出为 JSON 并上传到你自己的 S3。适合 67MB 这类大体积备份，不再依赖浏览器本地下载。
                            </p>
                        </div>
                        <div className="space-y-1 text-xs text-[#7d6b57] dark:text-slate-300">
                            <p>包含：全部画板、IndexedDB 内容、本地设置、收藏、提示词，以及当前保存的 S3/Provider 配置。</p>
                            <p>专用目录：<span className="font-mono">{getResolvedS3BackupFolder(s3Config) || 'backups/full-data'}</span></p>
                            <p>每次上传都会在该目录下再创建一层时间戳子文件夹，并同时写入完整备份文件和 `manifest.json`。</p>
                            <p>保留策略：S3 端最多只保留最近 5 份全量备份，新的成功后自动删除最老的一份。</p>
                        </div>
                    </div>

                    <button
                        onClick={handleUploadFullBackupToS3}
                        disabled={s3BackupStatus === 'uploading'}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#efb65a] px-4 py-2 text-sm font-semibold text-[#322515] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {s3BackupStatus === 'uploading' ? (
                            <>
                                <RotateCcw size={14} className="animate-spin" />
                                正在上传到 S3...
                            </>
                        ) : (
                            <>
                                <Database size={14} />
                                上传本地全部数据到 S3
                            </>
                        )}
                    </button>
                </div>

                {s3BackupMsg && (
                    <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${s3BackupStatus === 'success'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : s3BackupStatus === 'error'
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                                : `bg-[#f8f2e8] text-[#8d6d49] ${settingsDarkChip}`
                        }`}>
                        {s3BackupMsg}
                    </div>
                )}

                {s3BackupResult && (
                    <div className={`mt-4 rounded-2xl border border-[#eadfce] bg-[#f8f2e8] p-4 text-xs text-[#6f604f] ${settingsDarkSurfaceMuted} dark:text-slate-300`}>
                        <p className="font-semibold">最近一次上传结果</p>
                        <p className="mt-2 font-mono break-all">Bucket: {s3BackupResult.bucket}</p>
                        <p className="mt-1 font-mono break-all">Folder: {s3BackupResult.backupFolder}</p>
                        <p className="mt-1 font-mono break-all">Backup: {s3BackupResult.backupKey}</p>
                        <p className="mt-1 font-mono break-all">Manifest: {s3BackupResult.manifestKey}</p>
                        <p className="mt-1 font-mono break-all">RetentionDeleted: {(s3BackupResult.retention?.deletedBackupIds || []).length}</p>
                    </div>
                )}

                <div className="mt-5 border-t border-[#eadfce] pt-5 dark:border-white/10">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="font-semibold text-[#43372c] dark:text-slate-200">S3 历史备份</h4>
                            <p className="text-xs text-[#8f7e6b] dark:text-slate-400">
                                从专用备份目录读取 `manifest.json`，列出可以恢复的历史版本。
                            </p>
                        </div>
                        <button
                            onClick={handleRefreshRemoteBackups}
                            disabled={remoteBackupStatus === 'loading' || remoteBackupStatus === 'restoring'}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#eadfce] px-4 py-2 text-sm font-semibold text-[#6f604f] transition-all hover:bg-[#f8f2e8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/80 dark:text-slate-300 dark:hover:bg-[#1a2330]"
                        >
                            {remoteBackupStatus === 'loading' ? (
                                <>
                                    <RotateCcw size={14} className="animate-spin" />
                                    正在读取...
                                </>
                            ) : (
                                <>
                                    <RotateCcw size={14} />
                                    刷新备份列表
                                </>
                            )}
                        </button>
                    </div>

                    <label className="mt-4 flex items-center gap-2 text-xs text-[#7d6b57] dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={restoreWithSettings}
                            onChange={(event) => setRestoreWithSettings(event.target.checked)}
                            className="h-4 w-4 rounded border-[#d7c8b4] text-[#efb65a] focus:ring-[#efb65a]"
                        />
                        恢复时同时导入设置和密钥（默认关闭，更安全）
                    </label>

                    {remoteBackupMsg && (
                        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${remoteBackupStatus === 'error'
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                                : `bg-[#f8f2e8] text-[#8d6d49] ${settingsDarkChip}`
                            }`}>
                            {remoteBackupMsg}
                        </div>
                    )}

                    {remoteBackups.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {remoteBackups.map((backup) => (
                                <div
                                    key={backup.id}
                                    className={`rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4 ${settingsDarkSurfaceMuted}`}
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="space-y-1 text-xs text-[#6f604f] dark:text-slate-300">
                                            <p className="text-sm font-semibold text-[#43372c] dark:text-slate-200">
                                                {backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : '未知时间'}
                                            </p>
                                            <p>画板数：{backup.boardCount}，设置项：{backup.settingsCount}，体积：{formatBytes(backup.sizeBytes)}</p>
                                            <p>应用版本：{backup.appVersion || '未知'}，备份版本：{backup.schemaVersion || '未知'}，校验：{backup.sha256 ? 'SHA-256 已记录' : '旧备份，无校验指纹'}</p>
                                            <p className="font-mono break-all">Folder: {backup.backupFolder}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreRemoteBackup(backup)}
                                            disabled={restoringBackupId === backup.id || remoteBackupStatus === 'loading'}
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#efb65a] px-4 py-2 text-sm font-semibold text-[#322515] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {restoringBackupId === backup.id ? (
                                                <>
                                                    <RotateCcw size={14} className="animate-spin" />
                                                    正在恢复...
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw size={14} />
                                                    从这个版本恢复
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : remoteBackupStatus === 'loading' ? null : (
                        <div className="mt-4 rounded-2xl border border-dashed border-[#eadfce] p-4 text-xs text-[#8f7e6b] dark:border-slate-700/80 dark:bg-[#111923]/80 dark:text-slate-400">
                            暂时没有找到可恢复的 S3 历史备份。
                        </div>
                    )}
                </div>
            </div>

            {/* Data Recovery Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.settings.storageConfig?.recovery || 'Data Recovery'}</h3>

                {hasBackup ? (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-md border border-emerald-100 dark:border-emerald-500/20 rounded-[2rem] space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Database size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">{t.settings.storageConfig?.backupFound || 'Safety Backup Found'}</h4>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                    {t.settings.storageConfig?.backupFoundDesc || 'We found a local backup of your boards created before the last logout. You can restore this data back to this device.'}
                                </p>
                            </div>
                        </div>

                        {restoreStatus === 'success' ? (
                            <div className="flex items-center gap-2 rounded-lg bg-white/50 p-2 text-sm font-bold text-emerald-600 dark:bg-[#17202c] dark:text-emerald-400">
                                <CheckCircle2 size={16} />
                                <span>{restoreMsg || t.settings.storageConfig?.restoreComplete || "Restoration Complete!"}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-mono">
                                    mixboard_safety_backup
                                </span>
                                <button
                                    onClick={handleRestoreBackup}
                                    disabled={restoreStatus === 'restoring'}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {restoreStatus === 'restoring' ? (
                                        <>
                                            <RotateCcw size={14} className="animate-spin" />
                                            {t.settings.storageConfig?.restoring || 'Restoring...'}
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={14} />
                                            {t.settings.storageConfig?.restore || 'Restore Backup'}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        {restoreStatus === 'error' && (
                            <div className="text-xs text-red-500 font-bold mt-2">
                                Error: {restoreMsg}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700/80 dark:bg-[#17202c] dark:text-slate-400">
                        <CheckCircle2 size={16} className="text-slate-400" />
                        {t.settings.storageConfig?.noBackup || 'No pending safety backups found.'}
                    </div>
                )}
            </div>

            {/* Manual Import Section (Always available) */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                    onClick={() => setShowManualImport(!showManualImport)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#a08e7b] transition-colors hover:text-[#8d6d49] dark:hover:text-slate-200"
                >
                    {showManualImport ? (t.settings.storageConfig?.hideAdvancedRecovery || "Hide Advanced Recovery") : (t.settings.storageConfig?.advancedRecovery || "Show Advanced Recovery (Manual Import)")}
                </button>

                {showManualImport && (
                    <div className="mt-4 rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6 shadow-xl backdrop-blur-xl animate-fade-in dark:border-slate-700/80 dark:bg-[#111923]/90">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm">{t.settings.storageConfig?.manualImport || "Manual JSON Import"}</h4>
                        <p className="text-xs text-slate-500 mb-3">
                            {t.settings.storageConfig?.manualImportDesc || "Paste the raw backup data JSON provided by support below."}
                        </p>

                        <textarea
                            value={manualJson}
                            onChange={(e) => setManualJson(e.target.value)}
                            placeholder='[{"id":"123", "name":"My Board"...}]'
                            className={`${storageFieldClassName} mb-3 h-32 resize-none text-xs`}
                        />

                        <div className="flex items-center justify-between">
                            <div className="text-xs">
                                {manualRestoreStatus === 'success' && <span className="text-emerald-600 font-bold">{manualRestoreMsg}</span>}
                                {manualRestoreStatus === 'error' && <span className="text-red-500 font-bold">{manualRestoreMsg}</span>}
                            </div>
                            <button
                                onClick={handleManualImport}
                                disabled={manualRestoreStatus === 'restoring' || !manualJson.trim()}
                                className="rounded-full bg-[#efb65a] px-4 py-2 text-xs font-semibold text-[#322515] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {manualRestoreStatus === 'restoring' ? (t.settings.storageConfig?.importing || "Importing...") : (t.settings.storageConfig?.importRestore || "Import & Restore")}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scheduled Backups Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.settings.storageConfig?.scheduledBackups || "Scheduled Backups"}</h3>
                        <p className="text-xs text-slate-500">{t.settings.storageConfig?.scheduledDesc || "Auto backup at 3:00 AM and 4:00 PM daily (5-day history)"}</p>
                    </div>
                    <button
                        onClick={handleForceBackup}
                        disabled={backupActionStatus === 'loading'}
                        className="flex items-center gap-1.5 rounded-full bg-[#efb65a] px-3 py-1.5 text-xs font-semibold text-[#322515] transition-all hover:bg-[#f3bf6c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {backupActionStatus === 'loading' ? (
                            <><RotateCcw size={12} className="animate-spin" /> {t.settings.storageConfig?.backingUp || "Backing up..."}</>
                        ) : (
                            <><Database size={12} /> {t.settings.storageConfig?.backupNow || "Backup Now"}</>
                        )}
                    </button>
                </div>

                {nextBackupTime && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={12} />
                        {t.settings.storageConfig?.nextBackup || "Next backup:"} {nextBackupTime.toLocaleString()}
                    </div>
                )}

                {backupActionStatus !== 'idle' && backupActionMsg && (
                    <div className={`mb-3 p-2 rounded-lg text-xs font-bold ${backupActionStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                        backupActionStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                            `bg-[#f8f2e8] text-[#8d6d49] ${settingsDarkChip}`
                        }`}>
                        {backupActionMsg}
                    </div>
                )}

                {backupHistory.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-[#17202c] dark:text-slate-400">
                        {t.settings.storageConfig?.noBackupsYet || "No backups yet. Backups are created automatically at scheduled times."}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {backupHistory.map((backup) => (
                            <div
                                key={backup.id}
                                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/80 dark:bg-[#17202c]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-lg bg-[#f8f2e8] p-1.5 text-[#8d6d49] ${settingsDarkChip}`}>
                                        <Calendar size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {backup.formattedDate}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {backup.boardCount} boards
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRestoreScheduledBackup(backup.id)}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700/80 dark:bg-[#1a2330] dark:text-slate-300 dark:hover:bg-[#233041]"
                                    >
                                        {t.settings.storageConfig?.restore || "Restore"}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteScheduledBackup(backup.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Data Export/Import Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <DataMigrationSection />
            </div>


        </div>
    );
}
