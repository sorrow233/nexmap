import React, { useRef, useState } from 'react';
import { Download, Upload, FileJson, Check, AlertCircle, RefreshCw, FileCode, ArrowRightLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStore } from '../../store/useStore';

export default function DataMigrationSection() {
    const { t } = useLanguage();
    const fileInputRef = useRef(null);
    const [importStatus, setImportStatus] = useState('idle'); // idle, processing, success, error
    const [statusMessage, setStatusMessage] = useState('');

    const handleExport = () => {
        try {
            const state = useStore.getState();
            const dataToExport = {
                version: '2.0', // Schema version
                timestamp: Date.now(),
                boards: state.boardsList || [],
                prompts: {
                    global: JSON.parse(localStorage.getItem('mixboard_global_prompts') || '[]'),
                    board: state.boardPrompts || []
                },
                settings: {
                    userLanguage: localStorage.getItem('userLanguage'),
                    providers: state.providers,
                    activeId: state.activeId,
                    customInstructions: state.customInstructions
                }
            };

            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mixboard_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus('processing');
        setStatusMessage('Reading file...');

        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid JSON file");
            }

            // Basic Validation
            if (!data.boards && !data.prompts && !data.settings) {
                throw new Error("No recognized data found in this file.");
            }

            // Ask for confirmation (browser native for simplicity within modal)
            if (!window.confirm(`Found ${data.boards?.length || 0} boards and settings. Overwrite current data?`)) {
                setImportStatus('idle');
                setStatusMessage('');
                return;
            }

            setStatusMessage('Importing data...');

            // Perform Import Logic
            // 1. Settings
            if (data.settings) {
                if (data.settings.userLanguage) localStorage.setItem('userLanguage', data.settings.userLanguage);
                // Update store settings if they match structure
                useStore.setState(prev => ({
                    ...prev,
                    providers: data.settings.providers || prev.providers,
                    activeId: data.settings.activeId || prev.activeId,
                    customInstructions: data.settings.customInstructions || prev.customInstructions
                }));
            }

            // 2. Prompts
            if (data.prompts?.global) {
                localStorage.setItem('mixboard_global_prompts', JSON.stringify(data.prompts.global));
            }

            // 3. Boards (Tricky part - usually need to merge or replace)
            // For now, let's append/merge based on ID to avoid total destruction unless cleared
            if (data.boards && Array.isArray(data.boards)) {
                useStore.setState(prev => {
                    // Simple merge: filter out existing IDs from import, then add
                    const existingIds = new Set(prev.boardsList.map(b => b.id));
                    const newBoards = data.boards.filter(b => !existingIds.has(b.id));
                    return {
                        boardsList: [...prev.boardsList, ...newBoards]
                    };
                });
            }

            setImportStatus('success');
            setStatusMessage('Import successful! Reloading...');

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Import failed:', error);
            setImportStatus('error');
            setStatusMessage(error.message);
        }

        // Reset input
        event.target.value = '';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft size={18} className="text-indigo-500" />
                <h4 className="font-bold text-slate-800 dark:text-white">Migration</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <button
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all group text-center"
                >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                        <Download size={24} />
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">Export Data</div>
                    <div className="text-xs text-slate-500 px-4">Save all boards, prompts, and settings to a JSON file.</div>
                </button>

                {/* Import Card */}
                <button
                    onClick={handleImportClick}
                    disabled={importStatus === 'processing'}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all group text-center disabled:opacity-50 disabled:cursor-wait relative overflow-hidden"
                >
                    {importStatus === 'success' && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-sm z-10">
                            <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                                <Check size={16} /> Success
                            </div>
                        </div>
                    )}

                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                        {importStatus === 'processing' ? <RefreshCw size={24} className="animate-spin" /> : <Upload size={24} />}
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">Import Data</div>
                    <div className="text-xs text-slate-500 px-4">Restore from a backup JSON file.</div>

                    {importStatus === 'error' && (
                        <div className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle size={12} /> {statusMessage}
                        </div>
                    )}
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />

            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex gap-3 text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>Importing will merge boards where possible. Settings and Prompts will be overwritten. We recommend exporting a backup before importing.</p>
            </div>
        </div>
    );
}
