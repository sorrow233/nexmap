import { loadBoard } from '../storage';
import { normalizeBoardTitleMeta, getEffectiveBoardCardCount } from '../boardTitle/metadata';

const MAX_CONTEXT_CHARS = 4000;
const MAX_CARD_SNIPPET_CHARS = 240;
const MAX_CONTEXT_CARDS = 8;
const TITLE_TASKS = new Map();
const RETRY_DELAYS_MS = [800];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeText = (value = '') => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
};

const toTimestamp = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber)) return asNumber;
        const asDate = Date.parse(value);
        return Number.isFinite(asDate) ? asDate : 0;
    }
    return 0;
};

const getErrorMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string') return error.message;
    return String(error);
};

const isRetryableTitleError = (error) => {
    const message = getErrorMessage(error).toLowerCase();
    if (!message) return false;
    if (message.includes('api key') || message.includes('provider configuration is missing')) {
        return false;
    }
    return [
        'timeout',
        'timed out',
        'network',
        '429',
        '500',
        '502',
        '503',
        '504',
        'rate limit',
        'temporarily',
        'fetch',
        'disconnect',
        'unavailable'
    ].some(pattern => message.includes(pattern));
};

const withRetry = async (task) => {
    let attempt = 0;
    let lastError = null;

    while (attempt <= RETRY_DELAYS_MS.length) {
        try {
            return await task();
        } catch (error) {
            lastError = error;
            if (attempt >= RETRY_DELAYS_MS.length || !isRetryableTitleError(error)) {
                throw error;
            }
            await wait(RETRY_DELAYS_MS[attempt]);
            attempt += 1;
        }
    }

    throw lastError || new Error('Board title generation failed');
};

const extractMessageText = (messages = []) => {
    if (!Array.isArray(messages)) return '';
    return messages
        .map(message => {
            if (typeof message?.content === 'string') return message.content;
            if (Array.isArray(message?.content)) {
                return message.content
                    .map(part => {
                        if (typeof part?.text === 'string') return part.text;
                        if (typeof part?.content === 'string') return part.content;
                        return '';
                    })
                    .filter(Boolean)
                    .join(' ');
            }
            return '';
        })
        .filter(Boolean)
        .join(' ');
};

const extractCardText = (card) => {
    if (!card || typeof card !== 'object') return '';
    const parts = [];
    const title = normalizeText(card.data?.title);
    const text = normalizeText(card.data?.text);
    const content = normalizeText(card.data?.content);
    const messages = normalizeText(extractMessageText(card.data?.messages));

    if (title) parts.push(title);
    if (text) parts.push(text);
    if (content) parts.push(content);
    if (messages) parts.push(messages);

    return normalizeText(parts.join(' '));
};

const collectBoardContext = (boardData = {}) => {
    const activeCards = Array.isArray(boardData.cards)
        ? boardData.cards
            .filter(card => card && !card.deletedAt)
            .sort((a, b) => {
                const aTime = toTimestamp(a?.updatedAt) || toTimestamp(a?.createdAt);
                const bTime = toTimestamp(b?.updatedAt) || toTimestamp(b?.createdAt);
                return bTime - aTime;
            })
        : [];

    const snippets = [];
    let remainingChars = MAX_CONTEXT_CHARS;

    for (const card of activeCards) {
        if (snippets.length >= MAX_CONTEXT_CARDS || remainingChars <= 0) break;

        const text = extractCardText(card);
        if (!text) continue;

        const truncated = text.length > MAX_CARD_SNIPPET_CHARS
            ? `${text.slice(0, MAX_CARD_SNIPPET_CHARS - 3)}...`
            : text;

        const snippet = truncated.length > remainingChars
            ? `${truncated.slice(0, Math.max(0, remainingChars - 3))}...`
            : truncated;

        if (!snippet) continue;

        snippets.push(`- ${snippet}`);
        remainingChars -= snippet.length + 2;
    }

    return snippets.join('\n');
};

const stripMarkdownCodeFence = (value = '') => {
    const trimmed = String(value || '').trim();
    if (trimmed.startsWith('```json')) {
        return trimmed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    if (trimmed.startsWith('```')) {
        return trimmed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return trimmed;
};

const sanitizeGeneratedTitle = (value = '') => {
    const firstLine = String(value || '').split('\n').find(Boolean) || '';
    const cleaned = normalizeText(
        firstLine
            .replace(/^title\s*:\s*/i, '')
            .replace(/^标题\s*[:：]\s*/i, '')
            .replace(/^["'`]+|["'`]+$/g, '')
    );

    if (!cleaned) return '';
    if (cleaned.length <= 60) return cleaned;
    return normalizeText(cleaned.slice(0, 60));
};

const parseGeneratedTitle = (response) => {
    const cleaned = stripMarkdownCodeFence(response).replace(/[\u0000-\u0019]+/g, '');
    if (!cleaned) return '';

    try {
        const parsed = JSON.parse(cleaned);
        return sanitizeGeneratedTitle(parsed?.title);
    } catch {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                const parsed = JSON.parse(objectMatch[0]);
                return sanitizeGeneratedTitle(parsed?.title);
            } catch {
                // Fall through to raw text sanitization.
            }
        }
        return sanitizeGeneratedTitle(cleaned);
    }
};

const buildPrompt = (boardMeta, context) => {
    const board = normalizeBoardTitleMeta(boardMeta);
    const currentTitle = board.name || '[untitled]';

    return `
You generate concise canvas titles from workspace content.

RULES:
1. Match the dominant language of the content.
2. Return JSON only: {"title":"..."}.
3. The title must be a topic name, not a sentence.
4. Do not use quotes, emojis, markdown, or prefixes like "Board", "Canvas", "画布".
5. Chinese titles should usually be 4-16 characters.
6. English titles should usually be 2-6 words.

CURRENT TITLE:
${currentTitle}

CANVAS CONTENT:
${context}
`;
};

const generateBoardAutoTitleInternal = async ({ boardId, boardMeta, boardData, config }) => {
    const resolvedBoardData = boardData || (boardId ? await loadBoard(boardId) : null);
    if (!resolvedBoardData) return null;

    const effectiveCardCount = getEffectiveBoardCardCount(resolvedBoardData.cards);
    if (effectiveCardCount <= 5) return null;

    const context = collectBoardContext(resolvedBoardData);
    if (!context) return null;

    if (!config?.model) {
        throw new Error('Provider configuration is missing for board auto title generation');
    }

    const prompt = buildPrompt(boardMeta, context);
    const { chatCompletion } = await import('../llm');
    const response = await withRetry(() => chatCompletion(
        [{ role: 'user', content: prompt }],
        config,
        config.model,
        { temperature: 0.3 }
    ));
    const title = parseGeneratedTitle(response);

    if (!title) return null;
    return { title };
};

export const generateBoardAutoTitle = async (params = {}) => {
    const taskKey = params.boardId || params.boardMeta?.id || '';
    if (taskKey && TITLE_TASKS.has(taskKey)) {
        return TITLE_TASKS.get(taskKey);
    }

    const task = generateBoardAutoTitleInternal(params)
        .finally(() => {
            if (taskKey) TITLE_TASKS.delete(taskKey);
        });

    if (taskKey) {
        TITLE_TASKS.set(taskKey, task);
    }

    return task;
};
