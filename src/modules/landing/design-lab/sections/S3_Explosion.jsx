import React, { useState } from 'react';
import { useSpring, animated, config } from '@react-spring/web';

const S3_Explosion = () => {
    const [exploded, setExploded] = useState(false);
    const { expansion } = useSpring({ expansion: exploded ? 1 : 0, config: config.molasses });
    const trigger = () => setExploded(true);
    const TriggerRef = ({ onEnter, children }) => {
        const ref = React.useRef();
        React.useEffect(() => {
            const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onEnter(); }, { threshold: 0.6 });
            if (ref.current) observer.observe(ref.current);
            return () => observer.disconnect();
        }, []);
        return <div ref={ref} className="w-full h-full">{children}</div>;
    };

    return (
        <section className="h-screen w-full bg-black overflow-hidden relative">
            <TriggerRef onEnter={trigger}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative z-50 text-center pointer-events-none mix-blend-difference">
                        <animated.h2 style={{ opacity: expansion, transform: expansion.to(e => `scale(${0.5 + e * 0.5})`) }} className="text-8xl font-black text-white">BREAK FREE</animated.h2>
                    </div>
                    {[...Array(12)].map((_, i) => (
                        <animated.div key={i} className="absolute w-32 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-2xl border border-white/20"
                            style={{
                                opacity: expansion,
                                transform: expansion.to(e => {
                                    const angle = (i / 12) * Math.PI * 2;
                                    const radius = 100 + e * 600;
                                    const x = Math.cos(angle) * radius;
                                    const y = Math.sin(angle) * radius;
                                    const rot = e * 360 * (i % 2 === 0 ? 1 : -1);
                                    return `translate(${x}px, ${y}px) rotate(${rot}deg)`;
                                })
                            }}
                        />
                    ))}
                    <animated.div className="absolute w-full h-full border-4 border-white rounded-full bg-blue-500/20" style={{ opacity: expansion.to(e => 1 - e), transform: expansion.to(e => `scale(${e * 3})`) }} />
                </div>
            </TriggerRef>
        </section>
    );
};
export default S3_Explosion;
