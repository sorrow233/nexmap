import React, { useState, useEffect } from 'react';
import { Database, Cloud, Clock, CheckCircle2, AlertCircle, RotateCcw, Upload, FileJson, Trash2 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBackupHistory, restoreFromBackup, deleteBackup, forceBackup, getNextBackupTime } from '../../../services/scheduledBackupService';
import DataMigrationSection from '../DataMigrationSection';

export default function StorageSection({ s3Config, setS3ConfigState }) {
    const { t } = useLanguage();
    const [backupHistory, setBackupHistory] = useState([]);
    const [nextBackupTime, setNextBackupTime] = useState(null);
    const [backupStatus, setBackupStatus] = useState('idle');

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const history = await getBackupHistory();
            setBackupHistory(history);
            setNextBackupTime(getNextBackupTime());
        } catch (e) {
            console.error("Failed to load backups", e);
        }
    };

    const handleForceBackup = async () => {
        setBackupStatus('loading');
        try {
            await forceBackup();
            await loadBackups();
            setBackupStatus('success');
            setTimeout(() => setBackupStatus('idle'), 2000);
        } catch (e) {
            setBackupStatus('error');
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm("Restore this backup? Current unsaved changes might be lost.")) return;
        await restoreFromBackup(id);
        window.location.reload();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this backup?")) return;
        await deleteBackup(id);
        await loadBackups();
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                    <Database size={20} className="text-blue-500" />
                    {t.settings.storage || 'Storage & Data'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {t.settings.storageDesc || 'Manage your data, S3 configuration, and backups.'}
                </p>
            </div>

            {/* S3 Configuration Card */}
            <div className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Cloud size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">S3 Storage (BYOK)</h4>
                            <p className="text-xs text-slate-500">Connect your own bucket (AWS, R2, MinIO)</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={s3Config.enabled}
                            onChange={e => setS3ConfigState({ ...s3Config, enabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {s3Config.enabled && (
                    <div className="space-y-4 animate-scale-in">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Endpoint</label>
                            <input
                                type="text"
                                value={s3Config.endpoint || ''}
                                onChange={e => setS3ConfigState({ ...s3Config, endpoint: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                placeholder="https://<account>.r2.cloudflarestorage.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Bucket</label>
                                <input
                                    type="text"
                                    value={s3Config.bucket || ''}
                                    onChange={e => setS3ConfigState({ ...s3Config, bucket: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Region</label>
                                <input
                                    type="text"
                                    value={s3Config.region || 'auto'}
                                    onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Access Key ID</label>
                                <input
                                    type="text"
                                    value={s3Config.accessKeyId || ''}
                                    onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Secret Access Key</label>
                                <input
                                    type="password"
                                    value={s3Config.secretAccessKey || ''}
                                    onChange={e => setS3ConfigState({ ...s3Config, secretAccessKey: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Backups */}
            <div className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Local Backups</h4>
                            <p className="text-xs text-slate-500">
                                {nextBackupTime ? `Next auto-backup: ${new Date(nextBackupTime).toLocaleTimeString()}` : 'Auto-backups enabled'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleForceBackup}
                        disabled={backupStatus === 'loading'}
                        className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                    >
                        {backupStatus === 'loading' ? <RotateCcw size={14} className="animate-spin" /> : <Upload size={14} />}
                        Backup Now
                    </button>
                </div>

                <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {backupHistory.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400 italic">No backups available.</div>
                    ) : (
                        backupHistory.map(backup => (
                            <div key={backup.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-black/20 rounded-lg border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <FileJson size={16} className="text-slate-400" />
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{backup.formattedDate}</div>
                                        <div className="text-xs text-slate-400">{backup.boardCount} boards</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleRestore(backup.id)} className="px-3 py-1.5 bg-white dark:bg-white/10 text-slate-700 dark:text-white text-xs font-bold rounded-md shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/20">Restore</button>
                                    <button onClick={() => handleDelete(backup.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Import/Migration */}
            <div className="p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <DataMigrationSection />
            </div>
        </div>
    );
}
