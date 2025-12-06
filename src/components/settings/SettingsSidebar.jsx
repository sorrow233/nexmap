import React from 'react';
import { Settings, Globe, Cpu, Database, Info, Layers, User, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsSidebar({ activeSection, onSelectSection }) {
    const { t } = useLanguage();

    const sections = [
        { id: 'general', label: t.settings.general || 'General', icon: Globe },
        { id: 'ai-models', label: t.settings.provider || 'AI Models', icon: Cpu },
        { id: 'instructions', label: t.settings.customInstructions || 'Instructions', icon: Sparkles },
        { id: 'storage', label: t.settings.storage || 'Data & Storage', icon: Database },
        { id: 'about', label: t.settings.about || 'About', icon: Info },
    ];

    return (
        <div className="space-y-1">
            {sections.map(section => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                    <button
                        key={section.id}
                        onClick={() => onSelectSection(section.id)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                            ${isActive
                                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200'
                            }
                        `}
                    >
                        <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70'} />
                        {section.label}
                    </button>
                );
            })}
        </div>
    );
}
