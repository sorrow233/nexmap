import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCcw, CheckCircle2, Database, Calendar, Clock, Trash2 } from 'lucide-react';
import { saveBoardToCloud } from '../../services/storage';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
    getBackupHistory,
    restoreFromBackup,
    deleteBackup,
    forceBackup,
    getNextBackupTime
} from '../../services/scheduledBackupService';

export default function SettingsStorageTab({ s3Config, setS3ConfigState, onShowWelcome }) {
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
                    // Remove soft delete marker if present
                    if (board.deletedAt) delete board.deletedAt;

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

                    await saveBoardToCloud(user.uid, board.id, board); // This saves metadata/shell
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
                if (!board.id || !board.name) continue;

                // Remove deletion markers
                if (board.deletedAt) delete board.deletedAt;

                // Force update 'updatedAt' to now so it syncs as "new"
                board.updatedAt = Date.now();
                board.createdAt = board.createdAt || Date.now();

                // CRITICAL FIX: Write directly to Firestore, bypassing saveBoardToCloud 
                // which requires local metadata (empty in recovery scenario)
                try {
                    const boardRef = doc(db, 'users', user.uid, 'boards', String(board.id));
                    await setDoc(boardRef, {
                        id: String(board.id),
                        name: board.name,
                        createdAt: board.createdAt,
                        updatedAt: board.updatedAt,
                        lastAccessedAt: board.lastAccessedAt || board.updatedAt,
                        cardCount: board.cardCount || 0,
                        cards: board.cards || [],
                        connections: board.connections || [],
                        groups: board.groups || [],
                        backgroundImage: board.backgroundImage || null,
                        thumbnail: board.thumbnail || null
                    });
                    successCount++;
                    console.log(`[Import] Successfully wrote board ${board.id} to Firestore`);
                } catch (err) {
                    console.error(`[Import] Failed to write board ${board.id}:`, err);
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
        if (!window.confirm('Are you sure you want to restore from this backup? Current local data will be overwritten.')) {
            return;
        }
        setBackupActionStatus('loading');
        setBackupActionMsg('');
        try {
            const result = await restoreFromBackup(backupId);
            if (result.success) {
                setBackupActionStatus('success');
                setBackupActionMsg(`Restored ${result.boardCount} boards from backup. Reloading...`);
                setTimeout(() => window.location.reload(), 1500);
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


            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                <p className="font-bold mb-1">BYOK (Bring Your Own Key)</p>
                <p>Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.</p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Enable S3 Storage</h3>
                    <p className="text-xs text-slate-500">Upload images to your own cloud bucket</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={s3Config.enabled}
                        onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                </label>
            </div>

            {s3Config.enabled && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endpoint URL</label>
                        <input
                            type="text"
                            value={s3Config.endpoint}
                            onChange={e => setS3ConfigState({ ...s3Config, endpoint: e.target.value })}
                            placeholder="https://<account>.r2.cloudflarestorage.com"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                            <input
                                type="text"
                                value={s3Config.region}
                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                placeholder="auto"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bucket Name</label>
                            <input
                                type="text"
                                value={s3Config.bucket}
                                onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Access Key ID</label>
                            <input
                                type="text"
                                value={s3Config.accessKeyId}
                                onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Secret Access Key</label>
                            <input
                                type="password"
                                value={s3Config.secretAccessKey}
                                onChange={e => setS3ConfigState({ ...s3Config, secretAccessKey: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Data Recovery Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Data Recovery</h3>

                {hasBackup ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Database size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">Safety Backup Found</h4>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                    We found a local backup of your boards created before the last logout.
                                    You can attempt to restore this data to your cloud account.
                                </p>
                            </div>
                        </div>

                        {restoreStatus === 'success' ? (
                            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                <CheckCircle2 size={16} />
                                <span>{restoreMsg || "Restoration Complete!"}</span>
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
                                            Restoring...
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={14} />
                                            Restore Backup
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
                        No pending safety backups found.
                    </div>
                )}
            </div>

            {/* Manual Import Section (Always available) */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <button
                    onClick={() => setShowManualImport(!showManualImport)}
                    className="text-xs font-bold text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1"
                >
                    {showManualImport ? "Hide Advanced Recovery" : "Show Advanced Recovery (Manual Import)"}
                </button>

                {showManualImport && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 animate-fade-in">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm">Manual JSON Import</h4>
                        <p className="text-xs text-slate-500 mb-3">
                            Paste the raw backup data JSON provided by support below.
                        </p>

                        <textarea
                            value={manualJson}
                            onChange={(e) => setManualJson(e.target.value)}
                            placeholder='[{"id":"123", "name":"My Board"...}]'
                            className="w-full h-32 p-3 text-xs font-mono bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 mb-3 resize-none"
                        />

                        <div className="flex items-center justify-between">
                            <div className="text-xs">
                                {manualRestoreStatus === 'success' && <span className="text-emerald-600 font-bold">{manualRestoreMsg}</span>}
                                {manualRestoreStatus === 'error' && <span className="text-red-500 font-bold">{manualRestoreMsg}</span>}
                            </div>
                            <button
                                onClick={handleManualImport}
                                disabled={manualRestoreStatus === 'restoring' || !manualJson.trim()}
                                className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg text-xs hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {manualRestoreStatus === 'restoring' ? "Importing..." : "Import & Restore"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scheduled Backups Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">Scheduled Backups</h3>
                        <p className="text-xs text-slate-500">Auto backup at 3:00 AM and 4:00 PM daily (5-day history)</p>
                    </div>
                    <button
                        onClick={handleForceBackup}
                        disabled={backupActionStatus === 'loading'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {backupActionStatus === 'loading' ? (
                            <><RotateCcw size={12} className="animate-spin" /> Backing up...</>
                        ) : (
                            <><Database size={12} /> Backup Now</>
                        )}
                    </button>
                </div>

                {nextBackupTime && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                        <Clock size={12} />
                        Next backup: {nextBackupTime.toLocaleString()}
                    </div>
                )}

                {backupActionStatus !== 'idle' && backupActionMsg && (
                    <div className={`mb-3 p-2 rounded-lg text-xs font-bold ${backupActionStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                        backupActionStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                            'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                        {backupActionMsg}
                    </div>
                )}

                {backupHistory.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-sm">
                        No backups yet. Backups are created automatically at scheduled times.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {backupHistory.map((backup) => (
                            <div
                                key={backup.id}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-brand-100 dark:bg-brand-800/30 text-brand-600 dark:text-brand-400 rounded-lg">
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
                                        Restore
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

            {/* Application Settings (Moved down) */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Application Settings</h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">Show Welcome Screen</p>
                        <p className="text-xs text-slate-500">View the introduction and guide again</p>
                    </div>
                    <button
                        onClick={onShowWelcome}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm"
                    >
                        Show Welcome
                    </button>
                </div>
            </div>
        </div>
    );
}
