import React, { useState } from 'react';
import { Database, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { auth } from '../../../../services/firebase';
import { updateBoardMetadataInCloud, saveBoardToCloud } from '../../../../services/storage';

export default function SafetyBackupSection() {
    const { t } = useLanguage();
    const [restoreStatus, setRestoreStatus] = useState('idle');
    const [restoreMsg, setRestoreMsg] = useState('');
    const hasBackup = !!localStorage.getItem('mixboard_safety_backup');

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
                    if (board.deletedAt) delete board.deletedAt;
                    await updateBoardMetadataInCloud(user.uid, board.id, board);
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

    return (
        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">{t.settings.storageConfig?.recovery || 'Data Recovery'}</h3>

            {hasBackup ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl space-y-3">
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
    );
}
