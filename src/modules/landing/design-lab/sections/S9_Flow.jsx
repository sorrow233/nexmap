import React, { useState, useEffect } from 'react';

const S9_Flow = () => {
    const [step, setStep] = useState(0);
    useEffect(() => { const interval = setInterval(() => { setStep(prev => (prev + 1) % 4); }, 2000); return () => clearInterval(interval); }, []);
    const steps = [{ title: "Research", icon: "🔍", desc: "Gather sources" }, { title: "Connect", icon: "🔗", desc: "Find patterns" }, { title: "Structure", icon: "🏗️", desc: "Build hierarchy" }, { title: "Create", icon: "✨", desc: "Final output" }];

    return (
        <section className="h-screen w-full bg-[#050505] flex items-center justify-center relative">
            <div className="max-w-4xl w-full flex items-center justify-between px-12 relative z-10">
                <div className="absolute left-12 right-12 h-1 bg-white/10 top-1/2 -translate-y-1/2 -z-10" />
                <div className="absolute left-12 h-1 bg-blue-500 top-1/2 -translate-y-1/2 -z-10 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
                {steps.map((s, i) => (
                    <div key={i} className={`transition-all duration-500 flex flex-col items-center gap-4 ${i <= step ? 'opacity-100 scale-110' : 'opacity-30 scale-90'}`}>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl bg-zinc-900 border-4 transition-colors ${i <= step ? 'border-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-white/10 text-white/20'}`}>{s.icon}</div>
                        <div className="text-center"><div className="font-bold text-white text-lg">{s.title}</div><div className="text-sm text-gray-500">{s.desc}</div></div>
                    </div>
                ))}
            </div>
            <div className="absolute bottom-20 text-center w-full"><h2 className="text-4xl font-bold text-white mb-2">The Flow</h2><p className="text-gray-400">From chaos to creation in steps.</p></div>
        </section>
    );
};
export default S9_Flow;
