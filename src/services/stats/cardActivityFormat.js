import { normalizeCardTimestamps } from '../cards/cardTimestamps.js';

const UNTITLED_CARD = '未命名卡片';

const toTimestamp = (value) => {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

const normalizeTitle = (value) => String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getCardTitle = (card) => {
    const explicitTitle = normalizeTitle(card?.data?.title);
    if (explicitTitle) return explicitTitle;

    if (card?.type === 'note') {
        const firstLine = String(card?.data?.content || '')
            .split(/\r?\n/)
            .map(normalizeTitle)
            .find(Boolean);
        if (firstLine) return firstLine.slice(0, 80);
    }

    return UNTITLED_CARD;
};

export const extractCardActivityEntries = (board, boardData) => {
    const boardCreatedAt = toTimestamp(boardData?.createdAt) || toTimestamp(board?.createdAt);
    const cards = Array.isArray(boardData?.cards) ? boardData.cards : [];

    return cards
        .filter(card => card && !card.deletedAt)
        .map(card => {
            const normalizedCard = normalizeCardTimestamps(card, { boardCreatedAt });
            return {
                createdAt: toTimestamp(normalizedCard?.createdAt),
                title: getCardTitle(normalizedCard)
            };
        })
        .filter(entry => entry.createdAt > 0);
};

const pad = (value) => String(value).padStart(2, '0');

export const formatActivityTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
    const offsetRemainder = pad(Math.abs(offsetMinutes) % 60);

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} `
        + `${offsetSign}${offsetHours}:${offsetRemainder}`;
};

export function buildCardActivityExportText(entries = [], options = {}) {
    const exportedAt = toTimestamp(options.exportedAt) || Date.now();
    const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const lines = entries.map(entry => `${formatActivityTimestamp(entry.createdAt)} | ${entry.title}`);

    return [
        'NexMap 卡片活动记录',
        `导出时间：${formatActivityTimestamp(exportedAt)}`,
        `时区：${timeZone}`,
        `卡片数量：${entries.length}`,
        '',
        ...lines
    ].join('\n');
}
