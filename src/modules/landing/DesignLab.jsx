import React from 'react';

// Import all 10 concepts as sections
import Concept1_Genesis from './design-lab/Concept1_TheVoid';
import Concept2_NeuralWeb from './design-lab/Concept2_BentoGrid';
import Concept3_InfiniteDepth from './design-lab/Concept3_Typography';
import Concept4_ChaosToOrder from './design-lab/Concept4_Cyberpunk';
import Concept5_TheWorkspace from './design-lab/Concept5_Glassmorphism';
import Concept6_Velocity from './design-lab/Concept6_Perspective3D';
import Concept7_Multiverse from './design-lab/Concept7_InfiniteScroll';
import Concept8_Fluidity from './design-lab/Concept8_MagneticField';
import Concept9_CodeToCanvas from './design-lab/Concept9_LiquidDeep';
import Concept10_TheAnswer from './design-lab/Concept10_MinimalZen';

const DesignLab = () => {
    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
            {/* Section 1: Genesis - Full viewport height, sticky */}
            <section className="h-screen w-full sticky top-0 z-0">
                <Concept1_Genesis />
            </section>

            {/* Spacer for smooth transition */}
            <div className="h-[50vh] bg-transparent relative z-10" />

            {/* Section 2: Neural Web */}
            <section className="min-h-screen w-full relative z-10 bg-[#050505]">
                <Concept2_NeuralWeb />
            </section>

            {/* Section 3: Infinite Depth */}
            <section className="min-h-screen w-full relative z-10">
                <Concept3_InfiniteDepth />
            </section>

            {/* Section 4: Chaos to Order */}
            <section className="min-h-screen w-full relative z-10 bg-zinc-900">
                <Concept4_ChaosToOrder />
            </section>

            {/* Section 5: The Workspace */}
            <section className="min-h-screen w-full relative z-10">
                <Concept5_TheWorkspace />
            </section>

            {/* Section 6: Velocity */}
            <section className="min-h-screen w-full relative z-10 bg-black">
                <Concept6_Velocity />
            </section>

            {/* Section 7: Multiverse */}
            <section className="min-h-screen w-full relative z-10">
                <Concept7_Multiverse />
            </section>

            {/* Section 8: Fluidity */}
            <section className="min-h-screen w-full relative z-10">
                <Concept8_Fluidity />
            </section>

            {/* Section 9: Code to Canvas */}
            <section className="min-h-screen w-full relative z-10 bg-zinc-950">
                <Concept9_CodeToCanvas />
            </section>

            {/* Section 10: The Answer (Final CTA) */}
            <section className="min-h-screen w-full relative z-20 bg-black">
                <Concept10_TheAnswer />
            </section>
        </div>
    );
};

export default DesignLab;
