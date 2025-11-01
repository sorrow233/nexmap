import React, { useState } from 'react';

/**
 * InstantTooltip
 * A tooltip component that delivers ZERO LATENCY feedback.
 * No specific animations, no delays. Instant visibility on hover.
 */
export default function InstantTooltip({ content, children, side = 'top' }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {isVisible && (
                <div className={`
                    absolute pointer-events-none z-[10000]
                    px-2 py-1 text-xs font-bold text-white bg-black dark:bg-[#222] 
                    rounded shadow-lg border border-white/10 whitespace-nowrap
                    ${side === 'top' ? 'bottom-full mb-2' : ''}
                    ${side === 'bottom' ? 'top-full mt-2' : ''}
                    ${side === 'left' ? 'right-full mr-2' : ''}
                    ${side === 'right' ? 'left-full ml-2' : ''}
                `}>
                    {content}
                    {/* Tiny arrow */}
                    <div className={`
                        absolute w-0 h-0 border-4 border-transparent
                        ${side === 'top' ? 'border-t-black dark:border-t-[#222] top-full left-1/2 -translate-x-1/2' : ''}
                        ${side === 'bottom' ? 'border-b-black dark:border-b-[#222] bottom-full left-1/2 -translate-x-1/2' : ''}
                        ${side === 'left' ? 'border-l-black dark:border-l-[#222] left-full top-1/2 -translate-y-1/2' : ''}
                        ${side === 'right' ? 'border-r-black dark:border-r-[#222] right-full top-1/2 -translate-y-1/2' : ''}
                    `} />
                </div>
            )}
            {children}
        </div>
    );
}
