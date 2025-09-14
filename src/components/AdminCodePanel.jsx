
import React, { useState } from 'react';
import { Copy, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateCodes } from '../services/redeemService';

export default function AdminCodePanel() {
    const [amount, setAmount] = useState(50);
    const [count, setCount] = useState(1);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await generateCodes(amount, count, note);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-white/10 space-y-6">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus size={18} />
                Generate Redemption Codes
            </h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount (Credits)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm"
                        min="1"
                        max="10000"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Count</label>
                    <input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm"
                        min="1"
                        max="50"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Note (Optional)</label>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. For promotional event"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm"
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Generate Codes'}
            </button>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5" />
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {result.message}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                        {result.codes.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5">
                                <code className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.code}</code>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500">{item.value} credits</span>
                                    <button
                                        onClick={() => copyToClipboard(item.code)}
                                        className="text-slate-400 hover:text-brand-500 transition-colors"
                                        title="Copy"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
