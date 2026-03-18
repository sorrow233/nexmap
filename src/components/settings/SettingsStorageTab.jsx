import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RotateCcw, CheckCircle2, Database, Calendar, Clock, Trash2, Download, Upload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { saveBoard, saveBoardToCloud, updateBoardMetadataInCloud } from '../../services/storage';
import { auth } from '../../services/firebase';
import {
    getBackupHistory,
    restoreFromBackup,
    deleteBackup,
    forceBackup,
    getNextBackupTime
} from '../../services/scheduledBackupService';
import DataMigrationSection from './DataMigrationSection';
import {
    normalizeBoardTitleMeta,
    pickBoardTitleMetadata
} from '../../services/boardTitle/metadata';

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



    const hasBackup = !!localStorage.getItem('mixboard_safety_backup');

    // Load backup history on mount
    useEffect(() => {
        const loadBackups = async () => {
            const history = await getBackupHistory();
            setBackupHistory(history);
            setNextBackupTime(getNextBackupTime());
        };
        loadBackups();
    }, []);

    const handleRestoreBackup = async () => {
        try {
            setRestoreStatus('restoring');
            const backupStr = localStorage.getItem('mixboard_safety_backup');
            if (!backupStr) throw new Error("No backup found");

            const backup = JSON.parse(backupStr);
            const user = auth.currentUser;
            if (!user) throw new Error("You must be logged in to restore to cloud");

            // 1. Restore Boards List & Content
            if (backup.boards && Array.isArray(backup.boards)) {
                let restoredCount = 0;
                for (const board of backup.boards) {
                    const normalizedBoard = normalizeBoardTitleMeta(board);
                    // Remove soft delete marker if present
                    if (normalizedBoard.deletedAt) delete normalizedBoard.deletedAt;

                    // We need full board content. 
                    // If the backup was "shallow" (list only), we can't fully restore content unless it's in IDB.
                    // But our safety backup logic tried to capture what it could.
                    // Actually, the safety backup in clearAllUserData ONLY saved the list + active board data.
                    // It relied on IDB NOT being cleared yet? No, IDB is cleared.
                    // WAIT. The safety backup in clearAllUserData logic was:
                    // 1. Save list. 2. Save active board data. 
                    // It implies other boards' content might still be lost if not in cloud?
                    // CORRECT. But "Guest" boards are in IDB. 
                    // If IDB was cleared, and we only have the List... we can't restore content for non-active boards 
                    // UNLESS we are in the "Migration" flow which runs BEFORE clear.
                    //
                    // However, for the user request, they pasted a JSON list.
                    // If that's ALL they have, we can at least restore the board METADATA (cards count etc)
                    // so they appear in the list. But if content is gone, it's empty.
                    // 
                    // LUCKILY: The user said "Guest -> Login" flow. 
                    // If migration failed but backup ran... backup has the list.
                    // If IDB was wiped, content is gone essentially.
                    // BUT: The user's metadata shows "thumbnail" string data. 
                    // AND: The backup logic I wrote `minimalBackup.activeBoardData = ...`
                    // So we can definitely restore the ACTIVE board fully.
                    // For others, we restore metadata. If they click it, it might be empty or load from cloud if a previous sync existed.

                    await updateBoardMetadataInCloud(user.uid, normalizedBoard.id, {
                        ...normalizedBoard,
                        ...pickBoardTitleMetadata(normalizedBoard)
                    }); // This saves metadata only (merge), preserving content if exists
                    restoredCount++;
                }
                setRestoreMsg(`Restored metadata for ${restoredCount} boards.`);
            }

            // 2. Restore Active Board Data (Full Content)
            if (backup.activeBoardData) {
                await saveBoardToCloud(user.uid, backup.activeBoardData.id, backup.activeBoardData);
                setRestoreMsg(prev => prev + ` Fully recovered active board "${backup.activeBoardData.name}".`);
            }

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

            const user = auth.currentUser;
            if (!user) throw new Error("You must be logged in to restore data");

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
            for (const board of boardsToRestore) {
                // Ensure board has basic fields
                if (!board.id) continue;

                const normalizedBoard = normalizeBoardTitleMeta(board);

                // Remove deletion markers
                if (normalizedBoard.deletedAt) delete normalizedBoard.deletedAt;

                // Force update 'updatedAt' to now so it syncs as "new"
                normalizedBoard.updatedAt = Date.now();
                normalizedBoard.createdAt = normalizedBoard.createdAt || Date.now();

                // 先写本地，再走统一的云快照保存，避免手写 Firestore 文档结构
                try {
                    await saveBoard(String(normalizedBoard.id), normalizedBoard);
                    await saveBoardToCloud(user.uid, String(normalizedBoard.id), normalizedBoard);
                    successCount++;
                    console.log(`[Import] Successfully wrote board ${normalizedBoard.id} to Firestore`);
                } catch (err) {
                    console.error(`[Import] Failed to write board ${normalizedBoard.id}:`, err);
                }
            }

            setManualRestoreStatus('success');
            setManualRestoreMsg(`Successfully imported ${successCount} boards! Reloading page...`);
            setManualJson(''); // Clear input on success

            // Force page refresh so UI picks up new cloud data
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
            } else {
                throw new Error(result.error || 'Backup failed');
            }
        } catch (e) {
            setBackupActionStatus('error');
            setBackupActionMsg(e.message);
        }
    };



    return (
        <div className="space-y-6">


            <div className="rounded-[24px] border border-[#eadfce] bg-[#f8f2e8] p-4 text-sm text-[#7d6b57] dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                <p className="font-bold mb-1">{t.settings.storageConfig?.byok || 'BYOK (Bring Your Own Key)'}</p>
                <p>{t.settings.storageConfig?.byokDesc || 'Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.'}</p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between rounded-[24px] border border-[#eee3d7] p-4 dark:border-white/10">
                <div>
                    <h3 className="font-semibold text-[#43372c] dark:text-slate-200">{t.settings.storageConfig?.enable || 'Enable S3 Storage'}</h3>
                    <p className="text-xs text-[#8f7e6b]">{t.settings.storageConfig?.enableDesc || 'Upload images to your own cloud bucket'}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={s3Config.enabled}
                        onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
                    />
                    <div className="h-6 w-11 rounded-full bg-[#e9dfd2] peer after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[#e1d4c4] after:bg-white after:transition-all after:content-[''] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f4e7d2] peer-checked:bg-[#efb65a] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700 dark:border-gray-600 dark:peer-focus:ring-white/10"></div>
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
                            className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-800 dark:text-white"
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
                                className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.bucket || 'Bucket Name'}</label>
                            <input
                                type="text"
                                value={s3Config.bucket}
                                onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
                                className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-800 dark:text-white"
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
                                className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.secretKey || 'Secret Access Key'}</label>
                            <input
                                type="password"
                                value={s3Config.secretAccessKey}
                                onChange={e => setS3ConfigState({ ...s3Config, secretAccessKey: e.target.value })}
                                className="w-full rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 font-mono text-sm text-[#40342a] outline-none transition-all focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            )}

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
                                    {t.settings.storageConfig?.backupFoundDesc || 'We found a local backup of your boards created before the last logout. You can attempt to restore this data to your cloud account.'}
                                </p>
                            </div>
                        </div>

                        {restoreStatus === 'success' ? (
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
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
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
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
                    <div className="mt-4 p-6 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/10 animate-fade-in shadow-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm">{t.settings.storageConfig?.manualImport || "Manual JSON Import"}</h4>
                        <p className="text-xs text-slate-500 mb-3">
                            {t.settings.storageConfig?.manualImportDesc || "Paste the raw backup data JSON provided by support below."}
                        </p>

                        <textarea
                            value={manualJson}
                            onChange={(e) => setManualJson(e.target.value)}
                            placeholder='[{"id":"123", "name":"My Board"...}]'
                            className="mb-3 h-32 w-full resize-none rounded-2xl border border-[#eee3d7] bg-[#fffdf9] p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-[#f4e7d2] dark:border-white/10 dark:bg-black/20"
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
                            'bg-[#f8f2e8] text-[#8d6d49] dark:bg-white/8 dark:text-slate-200'
                        }`}>
                        {backupActionMsg}
                    </div>
                )}

                {backupHistory.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-sm">
                        {t.settings.storageConfig?.noBackupsYet || "No backups yet. Backups are created automatically at scheduled times."}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {backupHistory.map((backup) => (
                            <div
                                key={backup.id}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-[#f8f2e8] p-1.5 text-[#8d6d49] dark:bg-white/10 dark:text-slate-200">
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
                                        className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
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
