import React, { useState } from 'react';
import { useSprings, animated } from '@react-spring/web';

const S6_AutoSort = () => {
    const [sorted, setSorted] = useState(false);
    const items = [
        { color: 'bg-blue-500', group: 'work', tx: -300, ty: -100 }, { color: 'bg-blue-500', group: 'work', tx: -150, ty: -100 },
        { color: 'bg-emerald-500', group: 'personal', tx: 150, ty: -100 }, { color: 'bg-emerald-500', group: 'personal', tx: 300, ty: -100 },
        { color: 'bg-purple-500', group: 'ideas', tx: -300, ty: 100 }, { color: 'bg-purple-500', group: 'ideas', tx: -150, ty: 100 },
    ];
    const [springs, api] = useSprings(items.length, i => ({ x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400, rotation: (Math.random() - 0.5) * 45, scale: 1 }));
    const toggleSort = () => {
        setSorted(!sorted);
        api.start(i => sorted ? { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400, rotation: (Math.random() - 0.5) * 45, scale: 1 } : { x: items[i].tx, y: items[i].ty, rotation: 0, scale: 1, config: { tension: 120, friction: 14 } });
    };
    const TriggerRef = ({ onEnter, children }) => {
        const ref = React.useRef();
        React.useEffect(() => { const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !sorted) onEnter(); }, { threshold: 0.5 }); if (ref.current) observer.observe(ref.current); return () => observer.disconnect(); }, []);
        return <div ref={ref} className="w-full h-full">{children}</div>;
    };

    return (
        <section className="h-screen w-full bg-zinc-900 relative flex flex-col items-center justify-center overflow-hidden">
            <TriggerRef onEnter={() => setTimeout(toggleSort, 500)}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`transition-opacity duration-1000 ${sorted ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-[225px] -translate-y-[100px] w-[350px] h-[150px] border-2 border-blue-500/20 rounded-xl bg-blue-500/5 backdrop-blur-sm" />
                        <div className="absolute top-1/2 left-1/2 translate-x-[225px] -translate-y-[100px] w-[350px] h-[150px] border-2 border-emerald-500/20 rounded-xl bg-emerald-500/5 backdrop-blur-sm" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-[225px] translate-y-[100px] w-[350px] h-[150px] border-2 border-purple-500/20 rounded-xl bg-purple-500/5 backdrop-blur-sm" />
                    </div>
                    {springs.map((props, i) => <animated.div key={i} style={props} className={`absolute w-32 h-20 rounded-lg shadow-lg border border-white/10 ${items[i].color}`} />)}
                </div>
                <div className="relative z-10 text-center mt-[40vh] pointer-events-none"><h2 className="text-5xl font-bold text-white mb-2">Chaos to Order</h2><p className="text-white/60">One click organization.</p></div>
                <button onClick={toggleSort} className="absolute bottom-20 px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform z-20">{sorted ? 'Scramble' : 'Organize'}</button>
            </TriggerRef>
        </section>
    );
};
export default S6_AutoSort;
