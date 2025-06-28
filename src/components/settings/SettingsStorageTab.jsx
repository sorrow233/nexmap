import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function SettingsStorageTab({ s3Config, setS3ConfigState, onShowWelcome }) {
    return (
        <div className="space-y-6 animate-slide-up">


            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl text-sm border border-blue-100 dark:border-blue-900/30">
                <p className="font-bold mb-1">BYOK (Bring Your Own Key)</p>
                <p>Use your own S3 storage (AWS, Cloudflare R2, MinIO) to store images.</p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Enable S3 Storage</h3>
                    <p className="text-xs text-slate-500">Upload images to your own cloud bucket</p>
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
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endpoint URL</label>
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Region</label>
                            <input
                                type="text"
                                value={s3Config.region}
                                onChange={e => setS3ConfigState({ ...s3Config, region: e.target.value })}
                                placeholder="auto"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bucket Name</label>
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
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Access Key ID</label>
                            <input
                                type="text"
                                value={s3Config.accessKeyId}
                                onChange={e => setS3ConfigState({ ...s3Config, accessKeyId: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono text-sm text-slate-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Secret Access Key</label>
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

            {/* Application Settings */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Application Settings</h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5">
                    <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">Show Welcome Screen</p>
                        <p className="text-xs text-slate-500">View the introduction and guide again</p>
                    </div>
                    <button
                        onClick={onShowWelcome}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors shadow-sm"
                    >
                        Show Welcome
                    </button>
                </div>
            </div>
        </div>
    );
}
