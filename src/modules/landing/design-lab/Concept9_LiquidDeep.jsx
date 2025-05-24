import React, { useState, useEffect } from 'react';

const Concept9_CodeToCanvas = () => {
    const [morphed, setMorphed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMorphed(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    const code = `function analyze(data) {
  const result = process(data);
  if (result.valid) {
    return transform(result);
  }
  return null;
}`;

    return (
        <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
            <div className="relative w-[900px] h-[600px]">
                {/* Code Block */}
                <div
                    className={`absolute inset-0 bg-zinc-900 border border-white/10 rounded-xl p-6 transition-all duration-1000 ${morphed ? 'opacity-0 scale-95 blur-sm' : 'opacity-100'
                        }`}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="ml-4 text-white/50 text-sm font-mono">analyze.js</span>
                    </div>
                    <pre className="text-green-400 font-mono text-sm leading-relaxed">
                        {code}
                    </pre>
                </div>

                {/* Flowchart */}
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${morphed ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                        }`}
                >
                    <svg className="w-full h-full" viewBox="0 0 900 600">
                        {/* Connections */}
                        <line x1="450" y1="120" x2="450" y2="200" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <line x1="450" y1="280" x2="350" y2="360" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <line x1="450" y1="280" x2="550" y2="360" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <line x1="350" y1="440" x2="450" y2="520" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        <line x1="550" y1="440" x2="450" y2="520" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

                        {/* Nodes */}
                        <g>
                            <rect x="350" y="80" width="200" height="80" rx="12" fill="rgb(59, 130, 246)" fillOpacity="0.2" stroke="rgb(59, 130, 246)" strokeWidth="2" />
                            <text x="450" y="130" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">analyze(data)</text>
                        </g>

                        <g>
                            <rect x="350" y="200" width="200" height="80" rx="12" fill="rgb(139, 92, 246)" fillOpacity="0.2" stroke="rgb(139, 92, 246)" strokeWidth="2" />
                            <text x="450" y="250" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">process(data)</text>
                        </g>

                        <g>
                            <path d="M 250 360 L 350 360 L 370 400 L 350 440 L 250 440 L 230 400 Z" fill="rgb(245, 158, 11)" fillOpacity="0.2" stroke="rgb(245, 158, 11)" strokeWidth="2" />
                            <text x="300" y="410" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">valid?</text>
                        </g>

                        <g>
                            <rect x="450" y="360" width="200" height="80" rx="12" fill="rgb(16, 185, 129)" fillOpacity="0.2" stroke="rgb(16, 185, 129)" strokeWidth="2" />
                            <text x="550" y="410" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">transform()</text>
                        </g>

                        <g>
                            <rect x="350" y="520" width="200" height="60" rx="12" fill="rgb(239, 68, 68)" fillOpacity="0.2" stroke="rgb(239, 68, 68)" strokeWidth="2" />
                            <text x="450" y="560" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">return</text>
                        </g>
                    </svg>
                </div>
            </div>

            <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
                <h1 className="text-6xl font-bold text-white mb-2">Code → Canvas</h1>
                <p className="text-white/70 text-xl">Visualize the abstract</p>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {morphed ? 'Flowchart generated' : 'Analyzing code...'}
            </div>
        </div>
    );
};

export default Concept9_CodeToCanvas;
