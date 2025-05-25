import React from 'react';
import { useNavigate } from 'react-router-dom';

const S10_Ascension = () => {
    const navigate = useNavigate();

    return (
        <section className="h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
            {/* Light Source */}
            <div className="absolute top-0 w-full h-full bg-gradient-to-b from-transparent to-blue-900/20 pointer-events-none" />
            <div className="w-[1px] h-screen bg-gradient-to-b from-transparent via-white to-transparent absolute left-1/2" />

            <div className="relative z-10 text-center">
                <h2 className="text-white text-sm tracking-[1em] mb-12 uppercase opacity-60">System Ready</h2>

                <button
                    onClick={() => navigate('/gallery')}
                    className="group relative px-20 py-8 bg-white hover:bg-black hover:text-white transition-colors duration-500 text-black font-black text-3xl tracking-widest uppercase border border-white"
                >
                    ENTER
                </button>
            </div>

            <div className="absolute bottom-12 w-full text-center text-white/20 font-mono text-xs">
                NEURAL CANVAS // SYSTEM V.1.0
            </div>
        </section>
    );
};
export default S10_Ascension;
