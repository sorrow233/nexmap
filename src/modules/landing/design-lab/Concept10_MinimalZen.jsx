import React from 'react';

const Concept10_MinimalZen = () => {
    return (
        <div className="w-full h-full bg-[#f8f8f8] flex items-center justify-center relative">
            <div className="absolute top-10 left-10 w-2 h-2 bg-black rounded-full"></div>

            <div className="text-center group cursor-pointer">
                <div className="w-4 h-4 bg-black rounded-full mx-auto mb-8 transition-transform duration-700 group-hover:scale-[10] group-hover:opacity-10"></div>
                <h1 className="text-xl font-medium tracking-[0.5em] text-black">ESSENCE</h1>
                <p className="mt-8 text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-300">
                    Everything you need.<br />
                    Nothing you don't.
                </p>
            </div>

            <div className="absolute bottom-10 right-10 flex gap-4 text-[10px] text-gray-400 uppercase tracking-widest">
                <span>Design</span>
                <span>Function</span>
                <span>Form</span>
            </div>

            <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] border border-black/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-0 group-hover:scale-100 transition-transform duration-1000 ease-in-out delay-100"></div>
        </div>
    );
};

export default Concept10_MinimalZen;
