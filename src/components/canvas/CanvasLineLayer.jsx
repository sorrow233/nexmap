import React from 'react';

const toScreenPoint = (x, y, offset, scale) => ({
    x: x * scale + offset.x,
    y: y * scale + offset.y
});

const CanvasLine = ({ line, offset, scale, isSelected, canSelect, onSelect }) => {
    const start = toScreenPoint(line.x1, line.y1, offset, scale);
    const end = toScreenPoint(line.x2, line.y2, offset, scale);

    return (
        <g>
            <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="transparent"
                strokeWidth="14"
                strokeLinecap="round"
                pointerEvents={canSelect ? 'stroke' : 'none'}
                onMouseDown={(event) => {
                    event.stopPropagation();
                    onSelect(line.id);
                }}
            />
            <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={line.color}
                strokeWidth={isSelected ? Math.max(line.width, 3) : line.width}
                strokeLinecap="round"
                className="pointer-events-none"
            />
            {isSelected && (
                <>
                    <circle cx={start.x} cy={start.y} r="4" fill="#fff" stroke="#0ea5e9" strokeWidth="2" />
                    <circle cx={end.x} cy={end.y} r="4" fill="#fff" stroke="#0ea5e9" strokeWidth="2" />
                </>
            )}
        </g>
    );
};

const CanvasLineLayer = React.memo(function CanvasLineLayer({
    lines,
    draftLine,
    selectedLineId,
    canvasMode,
    offset,
    scale,
    onSelectLine
}) {
    const draftStart = draftLine
        ? toScreenPoint(draftLine.x1, draftLine.y1, offset, scale)
        : null;
    const draftEnd = draftLine
        ? toScreenPoint(draftLine.x2, draftLine.y2, offset, scale)
        : null;

    return (
        <svg className="absolute inset-0 h-full w-full pointer-events-none z-[5] overflow-visible">
            {lines.map((line) => (
                <CanvasLine
                    key={line.id}
                    line={line}
                    offset={offset}
                    scale={scale}
                    isSelected={selectedLineId === line.id}
                    canSelect={canvasMode === 'select'}
                    onSelect={onSelectLine}
                />
            ))}
            {draftLine && (
                <line
                    x1={draftStart.x}
                    y1={draftStart.y}
                    x2={draftEnd.x}
                    y2={draftEnd.y}
                    stroke="#0ea5e9"
                    strokeWidth="2"
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
});

export default CanvasLineLayer;
