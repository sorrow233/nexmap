import React, { useRef, useState } from 'react';

/**
 * Spotlight Component
 * 鼠标跟随的渐变光晕效果，为交互元素增添高级感
 * 
 * @param {React.ReactNode} children - 被包裹的内容
 * @param {string} className - 额外的 CSS 类名
 * @param {string} spotColor - 光晕颜色 (默认: 珊瑚粉)
 * @param {number} size - 光晕尺寸 (默认: 400px)
 * @param {boolean} disabled - 是否禁用效果
 */
const Spotlight = ({
    children,
    className = "",
    spotColor = "rgba(6, 182, 212, 0.15)", // 采用青色系
    size = 400,
    disabled = false
}) => {
    const divRef = useRef(null);
    const [opacity, setOpacity] = useState(0);

    // 移动端检测 - 禁用鼠标跟随效果
    const isTouchDevice = typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handleMouseMove = (e) => {
        if (disabled || isTouchDevice || !divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        divRef.current.style.setProperty('--spotlight-x', `${x}px`);
        divRef.current.style.setProperty('--spotlight-y', `${y}px`);
    };

    const handleMouseEnter = () => {
        if (disabled || isTouchDevice) return;
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    // 触摸设备直接返回 children，不添加效果
    if (isTouchDevice || disabled) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative ${className}`}
            style={{
                '--spotlight-x': '0px',
                '--spotlight-y': '0px'
            }}
        >
            {/* 光晕叠加层 */}
            <div
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(${size}px circle at var(--spotlight-x) var(--spotlight-y), ${spotColor}, transparent 40%)`
                }}
            />

            {/* 内容层 */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default Spotlight;
