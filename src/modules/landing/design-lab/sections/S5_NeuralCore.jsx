import React from 'react';

const S5_GlassPrism = () => {
    return (
        <section className="h-screen w-full bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-black/60" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 max-w-6xl w-full px-8">
                {/* Glass Card 1 */}
                <div className="h-[400px] w-full backdrop-blur-lg bg-white/5 border border-white/20 rounded-2xl p-8 relative overflow-hidden group hover:bg-white/10 transition-colors duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/50 transition-colors" />
                    <h3 className="text-4xl font-bold text-white mb-4">Prismatic View</h3>
                    <p className="text-white/70 text-lg">
                        See through the complexity. Our glass engine renders thousands of nodes with physically accurate blur and refraction.
                    </p>
                </div>

                {/* Glass Card 2 - Tilting */}
                <div className="h-[400px] w-full backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-end group">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 group-hover:bg-blue-500/50 transition-colors" />
                    <div className="text-[80px] font-mono text-white/10 absolute top-4 right-4 group-hover:text-white/20 transition-colors">05</div>
                    <h3 className="text-3xl font-bold text-white">Zone Layering</h3>
                </div>
            </div>
        </section>
    );
};
export default S5_GlassPrism;
