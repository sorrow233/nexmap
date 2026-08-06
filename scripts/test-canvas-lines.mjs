import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    createCanvasLineDraft,
    snapCanvasLineEnd,
    translateCanvasLine
} from '../src/utils/canvasLines.js';

const horizontalEnd = snapCanvasLineEnd({ x: 0, y: 0 }, { x: 100, y: 8 }, true);
assert.ok(Math.abs(horizontalEnd.y) < 1e-8, 'Shift snapping should produce a horizontal line');

const diagonalEnd = snapCanvasLineEnd({ x: 10, y: 10 }, { x: 90, y: 85 }, true);
assert.ok(
    Math.abs((diagonalEnd.x - 10) - (diagonalEnd.y - 10)) < 1e-8,
    'Shift snapping should produce a 45-degree line'
);

const line = createCanvasLineDraft(
    { x: 12, y: 24 },
    { x: 240, y: 24 },
    { id: 'divider-1' }
);
assert.deepEqual(line, {
    id: 'divider-1',
    x1: 12,
    y1: 24,
    x2: 240,
    y2: 24,
    color: '#64748b',
    width: 3
}, 'Line drafts should normalize geometry and style');

assert.deepEqual(translateCanvasLine(line, 18, -6), {
    ...line,
    x1: 30,
    y1: 18,
    x2: 258,
    y2: 18
}, 'Dragging should translate both line endpoints by the same delta');

const persistenceContracts = [
    '../src/services/sync/boardSnapshot.js',
    '../src/services/sync/boardYDoc.js',
    '../src/services/sync/skeleton/skeletonSync.js',
    '../src/hooks/useBoardPersistence.js',
    '../src/App.jsx'
];

for (const contractPath of persistenceContracts) {
    const source = await readFile(new URL(contractPath, import.meta.url), 'utf8');
    assert.match(source, /canvasLines/, `${contractPath} should include the canvasLines contract`);
}

const canvasSource = await readFile(new URL('../src/components/Canvas.jsx', import.meta.url), 'utf8');
assert.match(canvasSource, /data-canvas-line-surface/, 'Canvas should recognize zone drawing surfaces');
assert.match(
    canvasSource,
    /if \(canvasMode === 'line'[^)]*\)[\s\S]*?beginCanvasLine[\s\S]*?return;/,
    'Line mode should exit before the selection fallback'
);

const zoneSource = await readFile(new URL('../src/components/Zone.jsx', import.meta.url), 'utf8');
assert.match(zoneSource, /data-canvas-line-surface="true"/, 'Zone bodies should opt into line drawing');

console.log('Canvas line checks passed.');
