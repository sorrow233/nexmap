import React, { useState, useEffect } from 'react';
import { Copy, Plus, Loader2, CheckCircle2, AlertCircle, Crown, Coins, Shield, ArrowLeft } from 'lucide-react';
import { generateCodes } from '../services/redeemService';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

/**
 * AdminPage - Secret admin page for generating redemption codes
 * Access via: /admin (unlisted, hidden from navigation)
 */
export default function AdminPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [codeType, setCodeType] = useState('credits');
    const [amount, setAmount] = useState(50);
    const [count, setCount] = useState(1);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

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

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <Shield size={48} className="mx-auto mb-4 text-red-500" />
                    <h1 className="text-2xl font-bold mb-2">需要登录</h1>
                    <p className="text-slate-400 mb-6">请先登录后再访问此页面</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-colors"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={18} />
                        返回
                    </button>
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-amber-500" />
                        <span className="font-bold text-white">管理员面板</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                        {user.email}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white mb-2">兑换码生成器</h1>
                    <p className="text-slate-400">生成积分码或 Pro 会员升级码</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 space-y-6">
                    {/* Code Type Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">选择类型</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setCodeType('credits')}
                                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${codeType === 'credits'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}
                            >
                                <Coins size={32} />
                                <div className="text-center">
                                    <div className="font-bold">积分码</div>
                                    <div className="text-xs opacity-70 mt-1">增加用户积分额度</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCodeType('pro')}
                                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${codeType === 'pro'
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                                    }`}
                            >
                                <Crown size={32} />
                                <div className="text-center">
                                    <div className="font-bold">Pro 会员码</div>
                                    <div className="text-xs opacity-70 mt-1">升级为 Pro 用户</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Amount - Only for credits type */}
                        {codeType === 'credits' && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">积分数量</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors text-lg font-mono"
                                    min="1"
                                    max="10000"
                                />
                            </div>
                        )}
                        <div className={codeType === 'credits' ? '' : 'col-span-2'}>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">生成数量</label>
                            <input
                                type="number"
                                value={count}
                                onChange={(e) => setCount(Number(e.target.value))}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition-colors text-lg font-mono"
                                min="1"
                                max="50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">备注 (可选)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="例如：活动赠送、测试用、VIP客户"
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl text-lg ${codeType === 'pro'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20'
                                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-emerald-500/20'
                            }`}
                    >
                        {loading ? <Loader2 size={22} className="animate-spin" /> : (
                            <>
                                {codeType === 'pro' ? <Crown size={22} /> : <Coins size={22} />}
                                生成 {count} 个{codeType === 'pro' ? ' Pro 会员码' : '积分码'}
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <div>
                                <div className="font-bold mb-1">生成失败</div>
                                <div className="text-sm opacity-80">{error}</div>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={20} />
                                    <span className="font-bold">{result.message}</span>
                                </div>
                                <button
                                    onClick={copyAllCodes}
                                    className="text-sm bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2 rounded-lg transition-colors font-bold"
                                >
                                    复制全部
                                </button>
                            </div>

                            <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden">
                                {result.codes.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <code className="font-mono font-bold text-white text-lg tracking-widest">{item.code}</code>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${item.type === 'pro'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {item.type === 'pro' ? 'PRO 会员' : `${item.value} 积分`}
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(item.code)}
                                                className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                                                title="复制"
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

                {/* Footer Note */}
                <div className="mt-8 text-center text-slate-500 text-sm">
                    <p>此页面仅管理员可用 • 后端会验证权限</p>
                </div>
            </div>
        </div>
    );
}
