import React from 'react';

const Concept5_Glassmorphism = () => {
    return (
        <div className="w-full h-full bg-white relative overflow-hidden flex items-center justify-center">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full p-8">
                {/* Main Card */}
                <div className="col-span-1 md:col-span-2 bg-white/30 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                        <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 drop-shadow-sm">
                            Clear<br /><span className="text-white drop-shadow-md">Vision.</span>
                        </h1>
                        <p className="text-gray-700 text-lg mb-8 max-w-md">
                            Transparency is the new solid. See through the noise with our crystal-clear interface designed for modern thinkers.
                        </p>
                        <button className="bg-white/50 hover:bg-white/70 backdrop-blur-md text-gray-800 font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all border border-white/60">
                            Explore
                        </button>
                    </div>

                    {/* Floating Element */}
                    <div className="w-64 h-64 bg-gradient-to-tr from-blue-300 to-transparent rounded-[2rem] shadow-2xl flex items-center justify-center transform rotate-6 hover:rotate-0 transition-transform duration-500">
                        <div className="w-48 h-48 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 flex items-center justify-center">
                            <div className="text-4xl">✨</div>
                        </div>
                    </div>
                </div>

                {/* Smaller Cards */}
                <div className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-lg rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300">
                    <div className="h-10 w-10 bg-blue-500/20 rounded-full mb-4"></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Refraction</h3>
                    <p className="text-sm text-gray-600">Bend the light of your ideas into focused beams of productivity.</p>
                </div>

                <div className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-lg rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300">
                    <div className="h-10 w-10 bg-purple-500/20 rounded-full mb-4"></div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Depth</h3>
                    <p className="text-sm text-gray-600">Add a new dimension to your workflow with spatial layering.</p>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
};

export default Concept5_Glassmorphism;
