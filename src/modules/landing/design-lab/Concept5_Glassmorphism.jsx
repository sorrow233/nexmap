import React, { useState, useEffect } from 'react';

const Concept5_TheWorkspace = () => {
    const [step, setStep] = useState(0);
    const [aiResponse, setAiResponse] = useState('');

    const steps = [
        { action: 'type', text: 'What is quantum entanglement?', delay: 500 },
        { action: 'send', delay: 2500 },
        { action: 'ai_respond', delay: 3500 },
        { action: 'create_cards', delay: 5000 }
    ];

    useEffect(() => {
        steps.forEach(({ action, delay }, i) => {
            setTimeout(() => setStep(i + 1), delay);
        });

        // Simulate typing AI response
        if (step >= 3) {
            const text = 'Quantum entanglement is a phenomenon where...';
            let i = 0;
            const interval = setInterval(() => {
                if (i < text.length) {
                    setAiResponse(text.substring(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                }
            }, 30);
            return () => clearInterval(interval);
        }
    }, [step]);

    return (
        <div className="relative w-full h-full bg-zinc-900 overflow-hidden">
            {/* Mock UI */}
            <div className="w-full h-full p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="text-2xl font-bold text-white">Neural Canvas</div>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="relative h-[60%] bg-zinc-950 rounded-xl border border-white/10 overflow-hidden">
                    {step >= 4 && (
                        <>
                            <div className="absolute top-20 left-20 w-64 h-40 bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 backdrop-blur-sm animate-fade-in shadow-xl">
                                <div className="text-blue-300 font-semibold mb-2">Definition</div>
                                <div className="text-xs text-white/60">Properties of entangled particles...</div>
                            </div>
                            <div className="absolute top-32 right-32 w-64 h-40 bg-purple-900/30 border border-purple-500/40 rounded-lg p-4 backdrop-blur-sm animate-fade-in delay-300 shadow-xl">
                                <div className="text-purple-300 font-semibold mb-2">Applications</div>
                                <div className="text-xs text-white/60">Quantum computing, cryptography...</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Chat Input */}
                <div className="mt-6 bg-zinc-800 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-zinc-900 rounded-lg px-4 py-3">
                            <span className="text-white">
                                {step >= 1 ? 'What is quantum entanglement?' : ''}
                                <span className="animate-pulse">|</span>
                            </span>
                        </div>
                        <button className={`px-6 py-3 rounded-lg font-semibold transition-all ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-white/50'}`}>
                            Send
                        </button>
                    </div>

                    {step >= 3 && (
                        <div className="mt-4 p-4 bg-blue-950/30 border-l-4 border-blue-500 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                <span className="text-blue-300 text-sm font-semibold">AI Assistant</span>
                            </div>
                            <div className="text-white/80 text-sm">{aiResponse}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay Text */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
                <h1 className="text-5xl font-bold text-white mb-2">The Workspace</h1>
                <p className="text-white/60 text-lg">Your new daily driver</p>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .delay-300 { animation-delay: 0.3s; opacity: 0; }
            `}</style>
        </div>
    );
};

export default Concept5_TheWorkspace;
