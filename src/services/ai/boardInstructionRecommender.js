import { chatCompletion } from '../llm';

const extractTextFromMessageContent = (content) => {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content
        .map(part => {
            if (!part || typeof part !== 'object') return '';
            if (part.type === 'text') return part.text || '';
            if (part.type === 'image') return '[Image]';
            return '';
        })
        .filter(Boolean)
        .join(' ');
};

const buildBoardConversationDigest = (cards = []) => {
    const blocks = cards
        .filter(card => card && card.data && Array.isArray(card.data.messages))
        .map(card => {
            const title = card.data?.title || 'Untitled Card';
            const messages = (card.data.messages || [])
                .filter(msg => msg && (msg.role === 'user' || msg.role === 'assistant'))
                .slice(-6)
                .map(msg => {
                    const content = extractTextFromMessageContent(msg.content).slice(0, 280);
                    return `${msg.role}: ${content}`;
                })
                .filter(Boolean);

            if (messages.length === 0) return null;

            return `[Card: ${title}]\n${messages.join('\n')}`;
        })
        .filter(Boolean)
        .slice(0, 20);

    return blocks.join('\n\n---\n\n');
};

const parseJsonResponse = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    try {
        return JSON.parse(clean);
    } catch {
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            const candidate = clean.slice(firstBrace, lastBrace + 1);
            try {
                return JSON.parse(candidate);
            } catch {
                return null;
            }
        }
        return null;
    }
};

const tokenize = (text) => String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2);

const fallbackSelectByKeyword = (candidates, context, maxCount = 6) => {
    const contextTokens = new Set(tokenize(context));
    if (contextTokens.size === 0) return [];

    const ranked = candidates
        .map(candidate => {
            const candidateTokens = new Set(tokenize(`${candidate.title} ${candidate.content}`));
            if (candidateTokens.size === 0) return { id: candidate.id, score: 0 };

            let hit = 0;
            candidateTokens.forEach(token => {
                if (contextTokens.has(token)) hit += 1;
            });

            return {
                id: candidate.id,
                score: hit / Math.sqrt(candidateTokens.size)
            };
        })
        .filter(item => item.score > 0.01)
        .sort((a, b) => b.score - a.score);

    return ranked.slice(0, maxCount).map(item => item.id);
};

export async function recommendBoardInstructionIds({
    cards = [],
    instructions = [],
    config,
    model = null
}) {
    const candidates = (instructions || [])
        .filter(item => item && item.isGlobal !== true && item.enabled !== false)
        .map(item => ({
            id: String(item.id),
            title: String(item.title || item.name || item.text || '').trim(),
            content: String(item.content || item.text || '').trim()
        }))
        .filter(item => item.id && item.content);

    if (candidates.length === 0) return [];

    const context = buildBoardConversationDigest(cards);
    if (!context || context.trim().length < 10) return [];
    const fallbackIds = fallbackSelectByKeyword(candidates, context, 6);

    if (!config) {
        return fallbackIds;
    }

    const prompt = `你是一个“画布对话指令路由器”。
任务：根据当前画布的真实对话内容，从候选指令中选择最应该启用的 1~6 条。

规则：
1. 只选与内容强相关的指令，不相关就不要选。
2. 不要发明不存在的 ID。
3. 返回严格 JSON，禁止额外说明文字。

候选指令（可选）:
${candidates.map(item => `- ID: ${item.id}\n  标题: ${item.title || '(无标题)'}\n  内容: ${item.content}`).join('\n')}

画布对话内容:
${context}

输出格式:
{
  "instructionIds": ["id1", "id2"]
}`;

    try {
        const response = await chatCompletion(
            [{ role: 'user', content: prompt }],
            config,
            model || config.model,
            { temperature: 0.2 }
        );

        const parsed = parseJsonResponse(response);
        const ids = Array.isArray(parsed?.instructionIds) ? parsed.instructionIds : [];
        const allowed = new Set(candidates.map(item => item.id));
        const result = [];
        const seen = new Set();

        ids.forEach(id => {
            const normalized = String(id || '').trim();
            if (!normalized || !allowed.has(normalized) || seen.has(normalized)) return;
            seen.add(normalized);
            result.push(normalized);
        });

        const finalIds = result.slice(0, 6);
        if (finalIds.length > 0) return finalIds;
        return fallbackIds;
    } catch (error) {
        console.error('[BoardInstructionRecommender] Failed:', error);
        return fallbackIds;
    }
}
