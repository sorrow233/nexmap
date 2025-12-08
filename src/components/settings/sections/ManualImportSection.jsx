import React, { useState } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { auth, db } from '../../../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function ManualImportSection() {
    const { t } = useLanguage();
    const [manualJson, setManualJson] = useState('');
    const [manualRestoreStatus, setManualRestoreStatus] = useState('idle');
    const [manualRestoreMsg, setManualRestoreMsg] = useState('');
    const [showManualImport, setShowManualImport] = useState(false);

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

            // Handle raw array input
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
                if (!board.id || !board.name) continue;

                if (board.deletedAt) delete board.deletedAt;

                board.updatedAt = Date.now();
                board.createdAt = board.createdAt || Date.now();

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
                } catch (err) {
                    console.error(`[Import] Failed to write board ${board.id}:`, err);
                }
            }

            setManualRestoreStatus('success');
            setManualRestoreMsg(`Successfully imported ${successCount} boards! Reloading page...`);
            setManualJson('');

            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            console.error(e);
            setManualRestoreStatus('error');
            setManualRestoreMsg(e.message);
        }
    };

    return (
        <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <button
                onClick={() => setShowManualImport(!showManualImport)}
                className="text-xs font-bold text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1"
            >
                {showManualImport ? (t.settings.storageConfig?.hideAdvancedRecovery || "Hide Advanced Recovery") : (t.settings.storageConfig?.advancedRecovery || "Show Advanced Recovery (Manual Import)")}
            </button>

            {showManualImport && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 animate-fade-in">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm">{t.settings.storageConfig?.manualImport || "Manual JSON Import"}</h4>
                    <p className="text-xs text-slate-500 mb-3">
                        {t.settings.storageConfig?.manualImportDesc || "Paste the raw backup data JSON provided by support below."}
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
                            {manualRestoreStatus === 'restoring' ? (t.settings.storageConfig?.importing || "Importing...") : (t.settings.storageConfig?.importRestore || "Import & Restore")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
