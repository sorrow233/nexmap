const NUMBERED_LINE_RE = /^\s*(\d{1,4})\s*[\.\)\]、）]\s*(.*)$/u;
const AGENT_INTENT = {
    EXTRACTION: 'extraction',
    PLANNING: 'planning'
};

const normalizeWhitespace = (text) => String(text || '').replace(/\r\n/g, '\n');

const extractDeclaredCount = (text) => {
    const source = String(text || '');
    const match = source.match(/(?:共|一共|总共|合计|共计)?\s*(\d{1,4})\s*(?:条|个|项|点|sections?|items?|cards?)/iu);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const findNumberedAnchors = (lines) => {
    const anchors = [];
    lines.forEach((line, lineIndex) => {
        const match = line.match(NUMBERED_LINE_RE);
        if (!match) return;
        anchors.push({
            lineIndex,
            number: Number(match[1]),
            heading: String(match[2] || '').trim()
        });
    });
    return anchors;
};

const pickContiguousFromOne = (anchors) => {
    if (!Array.isArray(anchors) || anchors.length === 0) return [];

    let best = [];

    for (let i = 0; i < anchors.length; i += 1) {
        if (anchors[i].number !== 1) continue;

        const sequence = [anchors[i]];
        let expected = 2;

        for (let j = i + 1; j < anchors.length; j += 1) {
            const current = anchors[j];
            if (current.number === expected) {
                sequence.push(current);
                expected += 1;
                continue;
            }
            if (current.number < expected) {
                continue;
            }
            break;
        }

        if (sequence.length > best.length) {
            best = sequence;
        }
    }

    return best;
};

const inferDynamicCardLimit = (requestText, checklistCount = 0) => {
    if (checklistCount > 0) return checklistCount;

    const declared = extractDeclaredCount(requestText);
    if (declared && declared > 0) return declared;

    const sourceLength = String(requestText || '').trim().length;
    if (sourceLength <= 0) return 1;
    return Math.max(1, Math.ceil(sourceLength / 260));
};

const sanitizeHeading = (heading, fallbackNumber) => {
    const trimmed = String(heading || '').trim();
    if (trimmed) return trimmed;
    return `Item ${fallbackNumber}`;
};

const extractPlanTitle = (sourceText, firstItemLineIndex) => {
    const lines = normalizeWhitespace(sourceText).split('\n');
    const titleCandidate = lines
        .slice(0, Math.max(0, firstItemLineIndex))
        .map(line => line.trim())
        .find(Boolean);

    if (titleCandidate && titleCandidate.length <= 120) {
        return titleCandidate;
    }
    return 'Structured Numbered Plan';
};

export function parseStructuredNumberedRequest(requestText) {
    const source = normalizeWhitespace(requestText);
    const lines = source.split('\n');
    const anchors = findNumberedAnchors(lines);
    const sequence = pickContiguousFromOne(anchors);

    if (sequence.length < 2) {
        return {
            matched: false,
            reason: 'no_contiguous_numbered_sequence'
        };
    }

    const declaredCount = extractDeclaredCount(source);
    const maxDetectedNumber = sequence[sequence.length - 1]?.number || sequence.length;
    const targetCount = declaredCount && declaredCount > 0
        ? Math.min(declaredCount, maxDetectedNumber)
        : maxDetectedNumber;

    const selectedSequence = sequence.filter(anchor => anchor.number <= targetCount);
    if (selectedSequence.length < 2) {
        return {
            matched: false,
            reason: 'insufficient_numbered_items'
        };
    }

    const expectedBySequence = selectedSequence[selectedSequence.length - 1].number;
    if (expectedBySequence !== selectedSequence.length) {
        return {
            matched: false,
            reason: 'non_contiguous_sequence'
        };
    }

    if (declaredCount && declaredCount !== expectedBySequence) {
        // The text says "N items" but does not actually provide 1..N.
        // Keep deterministic behavior by rejecting interception.
        return {
            matched: false,
            reason: 'declared_count_mismatch'
        };
    }

    const items = selectedSequence.map((anchor, index) => {
        const next = selectedSequence[index + 1];
        const startLine = anchor.lineIndex;
        const endLine = next ? (next.lineIndex - 1) : (lines.length - 1);
        const raw = lines.slice(startLine, endLine + 1).join('\n').trim();

        return {
            index: anchor.number,
            heading: sanitizeHeading(anchor.heading, anchor.number),
            raw
        };
    });

    return {
        matched: true,
        mode: 'structured_numbered_passthrough',
        declaredCount,
        detectedCount: items.length,
        planTitle: extractPlanTitle(source, selectedSequence[0].lineIndex),
        items
    };
}

export function classifyAgentIntent(requestText) {
    const structured = parseStructuredNumberedRequest(requestText);
    if (structured.matched) {
        return {
            intent: AGENT_INTENT.EXTRACTION,
            reason: 'structured_numbered_sequence',
            structured
        };
    }

    return {
        intent: AGENT_INTENT.PLANNING,
        reason: structured.reason || 'general_planning',
        structured: null
    };
}

export function buildStructuredNumberedPlan(requestText, parsedStructured = null) {
    const intent = parsedStructured?.matched
        ? { intent: AGENT_INTENT.EXTRACTION, structured: parsedStructured }
        : classifyAgentIntent(requestText);
    if (intent.intent !== AGENT_INTENT.EXTRACTION || !intent.structured) return null;
    const parsed = intent.structured;

    const cards = parsed.items.map((item) => {
        const title = `${item.index}. ${item.heading}`.trim();
        const itemLabel = `Item ${item.index}`;

        return {
            title,
            objective: `Extract and map ${itemLabel} only. Keep boundaries strict and avoid free expansion.`,
            prompt: [
                `You are in extraction mode for ${itemLabel}.`,
                'Hard constraints:',
                '- Do not merge with any other numbered item.',
                '- Do not change numbering or card count.',
                '- Keep the same language as the source text.',
                '- Preserve all key claims and examples from the source item.',
                '- You may polish wording, but do not introduce new unrelated subtopics.',
                '',
                `[${itemLabel} Original Text]`,
                item.raw
            ].join('\n'),
            deliverable: `An accurate mapped output for ${itemLabel}, optionally polished but not structurally altered.`,
            seedText: item.raw
        };
    });

    return {
        planTitle: parsed.planTitle || 'Structured Numbered Plan',
        strategy: `Structured passthrough mode: fixed ${cards.length} cards from numbered source items.`,
        mode: parsed.mode,
        cards
    };
}

export { AGENT_INTENT, inferDynamicCardLimit };
