import React, { useState, useEffect } from 'react';
import { Database, Calendar, Clock, Trash2, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import {
    getBackupHistory,
    restoreFromBackup,
    deleteBackup,
    forceBackup,
    getNextBackupTime
} from '../../../../services/scheduledBackupService';

export default function ScheduledBackupsSection() {
    const { t } = useLanguage();
    const [backupHistory, setBackupHistory] = useState([]);
    const [nextBackupTime, setNextBackupTime] = useState(null);
    const [backupActionStatus, setBackupActionStatus] = useState('idle');
    const [backupActionMsg, setBackupActionMsg] = useState('');

    useEffect(() => {
        const loadBackups = async () => {
            const history = await getBackupHistory();
            setBackupHistory(history);
            setNextBackupTime(getNextBackupTime());
        };
        loadBackups();
    }, []);

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
        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.settings.storageConfig?.scheduledBackups || "Scheduled Backups"}</h3>
                    <p className="text-xs text-slate-500">{t.settings.storageConfig?.scheduledDesc || "Auto backup at 3:00 AM and 4:00 PM daily (5-day history)"}</p>
                </div>
                <button
                    onClick={handleForceBackup}
                    disabled={backupActionStatus === 'loading'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                        'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                    {backupActionMsg}
                </div>
            )}

            {backupHistory.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings.storageConfig?.noBackupsYet || "No backups yet. Backups are created automatically at scheduled times."}
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
    );
}
