import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import SettingsSidebar from './SettingsSidebar';
import GeneralSection from './sections/GeneralSection';
import AIModelSection from './sections/AIModelSection';
import StorageSection from './sections/StorageSection';
import AboutSection from './sections/AboutSection';
import InstructionsSection from './sections/InstructionsSection';
import { useStore } from '../../store/useStore';
import { getS3Config, saveS3Config } from '../../services/s3';
import { updateUserSettings } from '../../services/syncService';

export default function ModernSettingsModal({ isOpen, onClose, user }) {
    const { t } = useLanguage();
    const [activeSection, setActiveSection] = useState('general');

    // Global State for saving
    const [providers, setProviders] = useState({});
    const [activeId, setActiveId] = useState('google');
    const [s3Config, setS3ConfigState] = useState({
        enabled: false,
        endpoint: '',
        region: 'auto',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        publicDomain: ''
    });

    // Load initial state
    useEffect(() => {
        if (isOpen) {
            const state = useStore.getState();
            setProviders(JSON.parse(JSON.stringify(state.providers || {})));
            setActiveId(state.activeId || 'google');

            const s3 = getS3Config();
            if (s3) setS3ConfigState(s3);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        try {
            // Save to Store
            useStore.getState().setFullConfig({
                providers,
                activeId
            });

            // Save S3
            saveS3Config(s3Config);

            // Sync to Cloud
            if (user && user.uid) {
                await updateUserSettings(user.uid, {
                    providers,
                    activeId,
                    s3Config
                });
            }

            // Reload to apply changes (simplest way to ensure all services pick up new config)
            window.location.reload();
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl h-[85vh] max-h-[800px] bg-white dark:bg-[#09090b] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex overflow-hidden animate-scale-in">

                {/* Sidebar (Left) */}
                <div className="w-[260px] flex-shrink-0 bg-slate-50/50 dark:bg-zinc-900/50 border-r border-slate-100 dark:border-white/5 flex flex-col">
                    <div className="p-6 pb-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            {t.settings.title || 'Settings'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            v2.1.5 Beta
                        </p>
                    </div>

                    <div className="flex-1 px-3">
                        <SettingsSidebar
                            activeSection={activeSection}
                            onSelectSection={setActiveSection}
                        />
                    </div>
                </div>

                {/* Content Area (Right) */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#09090b]">
                    {/* Header */}
                    <div className="h-16 px-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {activeSection.replace('-', ' ')}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto">
                            {activeSection === 'general' && <GeneralSection />}

                            {activeSection === 'ai-models' && (
                                <AIModelSection
                                    providers={providers}
                                    setProviders={setProviders}
                                    activeId={activeId}
                                    setActiveId={setActiveId}
                                />
                            )}

                            {activeSection === 'storage' && (
                                <StorageSection
                                    s3Config={s3Config}
                                    setS3ConfigState={setS3ConfigState}
                                />
                            )}

                            {activeSection === 'instructions' && <InstructionsSection />}

                            {activeSection === 'about' && <AboutSection />}
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                        >
                            {t.settings.cancel || 'Cancel'}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save size={16} />
                            {t.settings.saveChanges || 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
