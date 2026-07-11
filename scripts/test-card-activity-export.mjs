import assert from 'node:assert/strict';
import {
    buildCardActivityExportText,
    extractCardActivityEntries
} from '../src/services/stats/cardActivityFormat.js';

const entries = extractCardActivityEntries(
    { id: 'board-1', createdAt: 1000 },
    {
        cards: [
            { id: '2', type: 'note', createdAt: 3000, data: { content: '第二个标题\n正文不应导出' } },
            { id: '1', createdAt: 2000, data: { title: ' 第一个\n标题 ', content: '敏感正文' } },
            { id: 'deleted', createdAt: 4000, deletedAt: 5000, data: { title: '已删除' } }
        ]
    }
);

assert.deepEqual(entries, [
    { createdAt: 3000, title: '第二个标题' },
    { createdAt: 2000, title: '第一个 标题' }
]);

const output = buildCardActivityExportText(entries.sort((a, b) => a.createdAt - b.createdAt), {
    exportedAt: 5000,
    timeZone: 'Asia/Tokyo'
});
assert.match(output, /卡片数量：2/);
assert.match(output, /第一个 标题/);
assert.match(output, /第二个标题/);
assert.doesNotMatch(output, /敏感正文|正文不应导出|已删除/);

console.log('[test-card-activity-export] PASS');
