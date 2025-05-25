import React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { FileText, Folder, List } from 'lucide-react';

const InView = ({ children, onEnter }) => {
    const ref = React.useRef();
    React.useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onEnter && onEnter(); }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [onEnter]);
    return <div ref={ref} className="w-full h-full">{children}</div>;
};

const S2_Problem = () => {
    const [springs, api] = useSpring(() => ({ from: { scale: 1, rotateZ: 0 } }));
    const triggerWobble = () => {
        api.start({ to: [{ scale: 1.1, rotateZ: 5 }, { scale: 1.1, rotateZ: -5 }, { scale: 1, rotateZ: 0 }], config: { tension: 300, friction: 10 } });
    };

    return (
        <section className="h-screen w-full bg-zinc-900 flex flex-col items-center justify-center relative overflow-hidden">
            <InView onEnter={triggerWobble}>
                <div className="text-center mb-16 relative z-10">
                    <h2 className="text-5xl font-bold text-white mb-4">The Old Way</h2>
                    <p className="text-gray-400 text-xl">Trapped in linear lists.</p>
                </div>
                <animated.div style={springs} className="relative w-64 h-80 bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-4 shadow-2xl items-center">
                    <div className="w-full h-12 bg-white/10 rounded flex items-center px-4 gap-3"><Folder className="text-blue-400" size={20} /><div className="h-2 w-24 bg-white/20 rounded" /></div>
                    <div className="w-full h-12 bg-white/10 rounded flex items-center px-4 gap-3"><FileText className="text-gray-400" size={20} /><div className="h-2 w-32 bg-white/20 rounded" /></div>
                    <div className="w-full h-12 bg-white/10 rounded flex items-center px-4 gap-3"><FileText className="text-gray-400" size={20} /><div className="h-2 w-20 bg-white/20 rounded" /></div>
                    <div className="w-full h-12 bg-white/10 rounded flex items-center px-4 gap-3"><List className="text-gray-400" size={20} /><div className="h-2 w-28 bg-white/20 rounded" /></div>
                </animated.div>
            </InView>
        </section>
    );
};
export default S2_Problem;
