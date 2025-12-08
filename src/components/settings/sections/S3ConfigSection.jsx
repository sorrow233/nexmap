import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';

export default function S3ConfigSection({ s3Config, setS3ConfigState }) {
    const { t } = useLanguage();

    return (
        <>
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{t.settings.storageConfig?.enable || 'Enable S3 Storage'}</h3>
                    <p className="text-xs text-slate-500">{t.settings.storageConfig?.enableDesc || 'Upload images to your own cloud bucket'}</p>
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
                <div className="space-y-4 animate-fade-in mt-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.endpoint || 'Endpoint URL'}</label>
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.region || 'Region'}</label>
                            <input
                                type="text"
                                value={s3Config.region}
                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                placeholder="auto"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.bucket || 'Bucket Name'}</label>
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.accessKey || 'Access Key ID'}</label>
                            <input
                                type="text"
                                value={s3Config.accessKeyId}
                                onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t.settings.storageConfig?.secretKey || 'Secret Access Key'}</label>
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
        </>
    );
}
