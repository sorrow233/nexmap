import assert from 'node:assert/strict';
import {
    buildLocalDateKey,
    buildMonthActivityData,
    buildYearActivityData
} from '../src/services/stats/activityHistory.js';

assert.equal(buildLocalDateKey(2026, 0, 2), '2026-01-02');

const history = {
    '2026-01-02': 100,
    '2026-01-31': 50,
    '2026-02-01': 200,
    '2025-12-31': 999
};
const january = buildMonthActivityData(history, 2026, 0);
assert.equal(january.length, 31);
assert.equal(january[1].date, '2026-01-02');
assert.equal(january[1].chars, 100);

const year = buildYearActivityData(history, 2026);
assert.equal(year.length, 12);
assert.deepEqual(year[0], { date: '2026-01-01', monthIndex: 0, chars: 150, year: 2026 });
assert.deepEqual(year[1], { date: '2026-02-01', monthIndex: 1, chars: 200, year: 2026 });
assert.equal(year[11].chars, 0);

console.log('[test-activity-history] PASS');
