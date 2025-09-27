
import React, { useState } from 'react';
import { Copy, Plus, Loader2, CheckCircle2, AlertCircle, Crown, Coins } from 'lucide-react';
import { generateCodes } from '../services/redeemService';

export default function AdminCodePanel() {
    const [codeType, setCodeType] = useState('credits'); // 'credits' or 'pro'
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
            const data = await generateCodes(amount, count, note, codeType);
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

    const copyAllCodes = () => {
        if (result?.codes) {
            const allCodes = result.codes.map(c => c.code).join('\n');
            navigator.clipboard.writeText(allCodes);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10 space-y-5 shadow-xl">
            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                <Plus size={18} className="text-emerald-400" />
                生成兑换码
            </h3>

            {/* Code Type Selector */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setCodeType('credits')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${codeType === 'credits'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                        }`}
                >
                    <Coins size={24} />
                    <span className="text-sm font-bold">积分码</span>
                    <span className="text-xs opacity-70">增加用户积分</span>
                </button>
                <button
                    type="button"
                    onClick={() => setCodeType('pro')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${codeType === 'pro'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                        }`}
                >
                    <Crown size={24} />
                    <span className="text-sm font-bold">Pro 会员码</span>
                    <span className="text-xs opacity-70">升级为 Pro 用户</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Amount - Only for credits type */}
                {codeType === 'credits' && (
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">积分数量</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                            min="1"
                            max="10000"
                        />
                    </div>
                )}
                <div className={codeType === 'credits' ? '' : 'col-span-2'}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">生成数量</label>
                    <input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors"
                        min="1"
                        max="50"
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">备注 (可选)</label>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="例如：活动赠送、测试用"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg ${codeType === 'pro'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400'
                    }`}
            >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                    <>
                        {codeType === 'pro' ? <Crown size={18} /> : <Coins size={18} />}
                        生成 {codeType === 'pro' ? 'Pro 会员码' : '积分码'}
                    </>
                )}
            </button>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                </div>
            )}

            {result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {result.message}
                        </div>
                        <button
                            onClick={copyAllCodes}
                            className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors font-bold"
                        >
                            复制全部
                        </button>
                    </div>

                    <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden max-h-64 overflow-y-auto">
                        {result.codes.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5">
                                <code className="font-mono font-bold text-white tracking-wider">{item.code}</code>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${item.type === 'pro'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {item.type === 'pro' ? 'PRO' : `${item.value} 积分`}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(item.code)}
                                        className="text-slate-500 hover:text-white transition-colors p-1"
                                        title="复制"
                                    >
                                        <Copy size={14} />
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
