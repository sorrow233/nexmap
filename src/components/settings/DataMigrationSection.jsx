import React, { useState, useRef, useCallback } from 'react';
import {
    Download, Upload, FileJson, CheckCircle2, AlertCircle,
    RotateCcw, HardDrive, Shield, Settings, Database, X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    exportAllData,
    downloadDataAsFile,
    importData,
    readJsonFile,
    validateImportData,
    getBackupStats,
    generateBackupFilename
} from '../../services/dataExportService';

/**
 * Data Migration Section
 * 
 * Advanced UI for exporting and importing user data.
 * Features:
 * - Stats overview before export
 * - Drag & Drop import zone
 * - Pre-flight import check (preview mode)
 * - Selective import (settings toggle)
 */
export default function DataMigrationSection() {
    const { t } = useLanguage();
    const fileInputRef = useRef(null);

    // States
    const [exportStatus, setExportStatus] = useState('idle'); // idle, exporting, success, error
    const [exportStats, setExportStats] = useState(null); // { boardCount, size... } - could calculate this live if needed, but for now just static text or simple count

    const [importStatus, setImportStatus] = useState('idle'); // idle, reading, reviewing, restoring, success, error
    const [importMsg, setImportMsg] = useState('');
    const [dragActive, setDragActive] = useState(false);

    // Preview Data for Review Modal
    const [previewData, setPreviewData] = useState(null);
    const [rawImportData, setRawImportData] = useState(null);
    const [importOptions, setImportOptions] = useState({
        importSettings: false
    });

    // --- Export Logic ---
    const handleExport = async () => {
        setExportStatus('exporting');
        try {
            // Get data
            const data = await exportAllData();

            // Calculate pseudo stats for UI feedback
            const stats = getBackupStats(data);
            setExportStats(stats);

            // Trigger download
            const filename = generateBackupFilename();
            downloadDataAsFile(data, filename);

            setExportStatus('success');
            setTimeout(() => {
                setExportStatus('idle');
                setExportStats(null);
            }, 4000);
        } catch (e) {
            console.error('[Export] Failed:', e);
            setExportStatus('error');
        }
    };

    // --- Import Logic ---
    const processFile = async (file) => {
        if (!file) return;

        setImportStatus('reading');
        setImportMsg('');

        try {
            const data = await readJsonFile(file);
            const validation = validateImportData(data);
            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid backup file format');
            }

            // Generate preview
            const stats = getBackupStats(data);
            setPreviewData(stats);
            setRawImportData(data);

            // Switch to review mode
            setImportStatus('reviewing');
        } catch (e) {
            console.error('[Import Read] Failed:', e);
            setImportStatus('error');
            setImportMsg(e.message || 'Failed to read file');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e) => {
        processFile(e.target.files?.[0]);
    };

    // Drag & Drop handlers
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    // Confirm Import
    const executeImport = async () => {
        if (!rawImportData) return;

        setImportStatus('restoring');
        try {
            const result = await importData(rawImportData, {
                importSettings: importOptions.importSettings
            });

            if (result.success) {
                setImportStatus('success');
                setImportMsg(result.message);
                // Reload after delay
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            setImportStatus('error');
            setImportMsg(e.message);
        }
    };

    const cancelImport = () => {
        setImportStatus('idle');
        setPreviewData(null);
        setRawImportData(null);
        setImportMsg('');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                    {t.settings?.dataExport?.title || "Data Migration"}
                </h3>
                <p className="text-sm text-slate-500">
                    {t.settings?.dataExport?.desc || "Manage your data snapshots. Export for safekeeping or migrate to another device."}
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Export Card */}
                <div className="relative p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col justify-between group overflow-hidden">
                    {/* Decorative bg icon */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
                        <Download size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                <HardDrive size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200">Export Backup</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Create local snapshot</p>
                            </div>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-6 space-y-1">
                            <p className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>Export all boards & content</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>Includes favorites & prompts</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <AlertCircle size={14} className="text-amber-500" />
                                <span>Contains API Keys (Sensitive)</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exportStatus === 'exporting'}
                        className="relative z-10 w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/5 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exportStatus === 'exporting' ? (
                            <>
                                <RotateCcw size={18} className="animate-spin" />
                                <span>Exporting...</span>
                            </>
                        ) : exportStatus === 'success' ? (
                            <>
                                <CheckCircle2 size={18} />
                                <span>Success!</span>
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                <span>Download Snapshot</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Import Card (Drag & Drop) */}
                <div
                    className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between
                        ${dragActive
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-500'
                            : 'border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-white/20'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                        <div className={`p-4 rounded-full mb-3 transition-colors ${dragActive ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                            {importStatus === 'reading' ? (
                                <RotateCcw size={32} className="animate-spin" />
                            ) : (
                                <Upload size={32} />
                            )}
                        </div>

                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                            {importStatus === 'reading' ? "Reading File..." : "Restore Data"}
                        </h4>

                        <p className="text-xs text-slate-500 px-6 mb-4">
                            Drag and drop your backup JSON file here, or click to browse.
                        </p>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importStatus === 'reading'}
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                        >
                            Browse File
                        </button>
                    </div>

                    {/* Quick Status Message */}
                    {importStatus === 'error' && (
                        <div className="absolute inset-x-2 bottom-2 p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg text-center truncate">
                            {importMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Restore Review Modal (Overlay) --- */}
            {importStatus === 'reviewing' && previewData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                        onClick={cancelImport}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 animate-scale-in">
                        <button
                            onClick={cancelImport}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <Database size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-slate-900 dark:text-white">Verify Restore</h3>
                                <p className="text-xs text-slate-500">{previewData.timestamp}</p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                                <p className="text-xs text-slate-500 mb-1">Boards</p>
                                <p className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200">{previewData.boardCount}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                                <p className="text-xs text-slate-500 mb-1">Version</p>
                                <p className="font-mono text-xl font-bold text-slate-800 dark:text-slate-200">{previewData.version}</p>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3 mb-6">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Warning: Overwrite</h5>
                                        <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                                            Restoring will overwrite existing items with matching IDs. New items will be added.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                                <div className="relative flex items-center mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={importOptions.importSettings}
                                        onChange={e => setImportOptions({ ...importOptions, importSettings: e.target.checked })}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all flex items-center justify-center">
                                        <CheckCircle2 size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                    </div>
                                </div>
                                <div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Restore System Settings</span>
                                    <p className="text-xs text-slate-500">
                                        Includes API Keys and Providers. <span className="text-red-500 font-bold">CAUTION</span>
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={cancelImport}
                                className="flex-1 py-3 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeImport}
                                className="flex-1 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
                            >
                                Restore Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Success Overlay */}
            {importStatus === 'success' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-scale-in">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={40} />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Restoration Complete</h3>
                        <p className="text-slate-500 text-sm mb-4 text-center max-w-xs">{importMsg}</p>
                        <p className="text-xs text-slate-400">Reloading application...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
