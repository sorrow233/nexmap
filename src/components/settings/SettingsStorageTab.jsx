import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import DataMigrationSection from './DataMigrationSection';
import S3ConfigSection from './sections/S3ConfigSection';
import SafetyBackupSection from './sections/SafetyBackupSection';
import ManualImportSection from './sections/ManualImportSection';
import ScheduledBackupsSection from './sections/ScheduledBackupsSection';

export default function SettingsStorageTab({ s3Config, setS3ConfigState }) {
    const { t } = useLanguage();

    return (
        <div className="space-y-6">

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                <p className="font-bold mb-1">{t.settings.storageConfig?.byok || 'BYOK (Bring Your Own Key)'}</p>
                <p>{t.settings.storageConfig?.byokDesc || 'Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.'}</p>
            </div>

            {/* S3 Configuration */}
            <S3ConfigSection s3Config={s3Config} setS3ConfigState={setS3ConfigState} />

            {/* Safety Backup (Local Storage Recovery) */}
            <SafetyBackupSection />

            {/* Manual Import (JSON Paste) */}
            <ManualImportSection />

            {/* Scheduled Backups (Auto-history) */}
            <ScheduledBackupsSection />

            {/* Data Export/Import Section (Existing) */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <DataMigrationSection />
            </div>

        </div>
    );
}
