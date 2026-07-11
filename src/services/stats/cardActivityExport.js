import { loadBoardDataForSearch } from '../storage';
import {
    buildCardActivityExportText,
    extractCardActivityEntries,
    formatActivityTimestamp
} from './cardActivityFormat.js';

export { buildCardActivityExportText, extractCardActivityEntries, formatActivityTimestamp };

const DEFAULT_CONCURRENCY = 4;
export async function loadCardActivityEntries(boardsList = [], options = {}) {
    const boards = (Array.isArray(boardsList) ? boardsList : [])
        .filter(board => board?.id && !board.deletedAt);
    const concurrency = Math.max(1, Math.min(Number(options.concurrency) || DEFAULT_CONCURRENCY, 8));
    const entries = [];
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < boards.length) {
            const board = boards[nextIndex];
            nextIndex += 1;
            const boardData = await loadBoardDataForSearch(board.id);
            if (boardData) entries.push(...extractCardActivityEntries(board, boardData));
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, boards.length) }, worker));
    return entries.sort((left, right) => left.createdAt - right.createdAt || left.title.localeCompare(right.title));
}

export async function copyTextToClipboard(text) {
    if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!copied) throw new Error('Clipboard copy failed');
}
