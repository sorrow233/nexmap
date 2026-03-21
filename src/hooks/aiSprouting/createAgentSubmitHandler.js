import { uuid } from '../../utils/uuid';
import { useStore } from '../../store/useStore';
import { aiManager, PRIORITY } from '../../services/ai/AIManager';
import { debugLog } from '../../utils/debugLogger';
import {
    AGENT_EXECUTION_CONCURRENCY,
    applySearchMetaToLatestAssistant,
    calculateMindmapChildPositions,
    findAgentRootPosition
} from './shared';
import { runWithConcurrency } from './runWithConcurrency';

export const createAgentSubmitHandler = ({
    createAICard,
    updateCardContent,
    updateCardFull,
    setCardGenerating
}) => async (requestText, images = []) => {
    const safeRequest = (typeof requestText === 'string' ? requestText : `${requestText || ''}`).trim();
    if (!safeRequest && (!images || images.length === 0)) {
        return { rootId: null, total: 0, success: 0, failed: 0 };
    }

    const state = useStore.getState();
    const planningConfig = state.getRoleConfig?.('analysis') || state.getRoleConfig?.('chat');
    const runConfig = state.getRoleConfig?.('chat');
    if (!planningConfig || !runConfig) {
        return { rootId: null, total: 0, success: 0, failed: 0 };
    }
    const runProviderId = runConfig.providerId || runConfig.id;
    const agentRunId = uuid();

    const selectedSourceIds = (state.selectedIds || []).filter(id => {
        const card = state.cards.find(c => c.id === id);
        return !!card && !card.deletedAt;
    });
    const selectedContext = selectedSourceIds
        .map((id) => {
            const card = state.cards.find(c => c.id === id);
            if (!card) return '';
            const title = card.data?.title || 'Untitled';
            const recent = (card.data?.messages || []).slice(-4)
                .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${typeof m.content === 'string' ? m.content : '[Complex Content]'}`)
                .join('\n');
            return `Card "${title}"\n${recent}`;
        })
        .filter(Boolean)
        .join('\n\n');

    const imageHint = images.length > 0
        ? `\n\nUser also attached ${images.length} image(s). If relevant, include image-dependent tasks in the plan.`
        : '';

    let rootId = null;

    try {
        const { generateAgentCardPlan } = await import('../../services/llm');
        const plan = await generateAgentCardPlan(
            safeRequest || 'Break down this request into executable cards.',
            `${selectedContext}${imageHint}`,
            planningConfig,
            planningConfig.model,
            {},
            images
        );

        if (!plan?.cards?.length) {
            return { rootId: null, total: 0, success: 0, failed: 0 };
        }

        debugLog.ai('Agent plan generated', {
            cardCount: plan.cards.length,
            title: plan.planTitle
        });

        const fresh = useStore.getState();
        const rootPos = findAgentRootPosition(
            fresh.cards,
            fresh.offset,
            fresh.scale,
            fresh.selectedIds || []
        );
        rootId = uuid();
        const rootTitle = (plan.planTitle || 'AI Agent Plan').trim();
        const strategy = (plan.strategy || '').trim();
        const isStructuredPassthrough = plan.mode === 'structured_numbered_passthrough';
        const planOverview = plan.cards
            .map((item, index) => `${index + 1}. ${item.title} - ${item.objective}`)
            .join('\n');

        await createAICard({
            id: rootId,
            text: rootTitle,
            x: rootPos.x,
            y: rootPos.y,
            autoConnections: selectedSourceIds.map(id => ({ from: id, to: rootId })),
            model: runConfig.model,
            providerId: runProviderId,
            initialMessages: [
                {
                    role: 'user',
                    content: safeRequest || `Analyze ${images.length} image(s) and create an execution plan.`
                },
                {
                    id: uuid(),
                    role: 'assistant',
                    content: `## Strategy / 策略\n${strategy || 'Decompose the goal into focused execution cards.'}\n\n## Execution Engine / 执行引擎\nParallel workers: ${AGENT_EXECUTION_CONCURRENCY}\n\n## Plan / 规划\n${planOverview}`
                }
            ]
        });

        updateCardFull?.(rootId, data => ({ ...data, title: rootTitle }));

        const positions = calculateMindmapChildPositions({ x: rootPos.x, y: rootPos.y }, plan.cards.length);
        const briefSelectedContext = selectedContext
            ? selectedContext.split('\n').slice(0, 12).join('\n')
            : '';
        const jobs = plan.cards.map((item, index) => {
            const pos = positions[index];
            const cardId = uuid();
            const title = (item.title || `Task ${index + 1}`).trim();
            const objective = (item.objective || '').trim();
            const deliverable = (item.deliverable || '').trim();
            const cardPrompt = (item.prompt || objective || title).trim();
            const cardSeedText = (item.seedText || `${title}\n\n${objective || cardPrompt}`).trim();

            const executionPrompt = `
[Role / 角色]
You are one worker in a parallel AI agent system.

[Global User Goal / 全局目标]
${safeRequest}

[Plan Strategy / 计划策略]
${strategy || 'Break down and execute the goal.'}

[This Card Responsibility / 本卡职责]
Title: ${title}
Objective: ${objective || title}
Expected Deliverable: ${deliverable || 'A concrete and actionable result.'}

[Execution Task / 执行任务]
${cardPrompt}

${images.length > 0 ? `[Image Context / 图片上下文]\nUser attached ${images.length} image(s). Use them when relevant.\n` : ''}
${briefSelectedContext ? `[Selected Card Context / 选中卡片上下文]\n${briefSelectedContext}\n` : ''}

[Hard Rules / 硬规则]
1. Follow explicit user constraints exactly (scope, format, count, language, style, exclusions).
2. Do not rewrite the user's intent or broaden scope.
3. If required info is missing, state minimal assumptions first, then continue.
4. Return execution-ready output, not abstract discussion.
5. Focus only on this card's responsibility.
6. Do not claim that external real-world actions are already completed unless the prompt clearly provides completion evidence.
${isStructuredPassthrough ? '7. This is a fixed numbered-item passthrough task. Never merge this card with other numbered items or rewrite list structure.' : ''}
            `.trim();

            return {
                index,
                cardId,
                title,
                cardSeedText,
                pos,
                executionPrompt
            };
        });

        const results = jobs.map(job => ({
            title: job.title,
            ok: false,
            error: 'Not started'
        }));

        const runnableJobs = [];
        for (const job of jobs) {
            try {
                await createAICard({
                    id: job.cardId,
                    text: job.cardSeedText,
                    x: job.pos.x,
                    y: job.pos.y,
                    autoConnections: [{ from: rootId, to: job.cardId }],
                    model: runConfig.model,
                    providerId: runProviderId
                });

                updateCardFull?.(job.cardId, data => ({ ...data, title: job.title }));
                runnableJobs.push(job);
            } catch (createError) {
                debugLog.error(`Agent card creation failed for ${job.cardId}`, createError);
                results[job.index] = {
                    title: job.title,
                    ok: false,
                    error: createError?.message || 'Card creation failed'
                };
                setCardGenerating(job.cardId, false);
            }
        }

        debugLog.ai('Agent execution dispatch', {
            planned: jobs.length,
            runnable: runnableJobs.length,
            concurrency: AGENT_EXECUTION_CONCURRENCY
        });

        const executionResults = await runWithConcurrency(
            runnableJobs,
            AGENT_EXECUTION_CONCURRENCY,
            async (job) => {
                const executionContent = images.length > 0
                    ? [
                        { type: 'text', text: job.executionPrompt },
                        ...images.slice(0, 3).map(img => ({
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: img.mimeType,
                                data: img.base64
                            }
                        }))
                    ]
                    : job.executionPrompt;

                try {
                    await aiManager.requestTask({
                        type: 'chat',
                        priority: PRIORITY.HIGH,
                        payload: {
                            messages: [{ role: 'user', content: executionContent }],
                            model: runConfig.model,
                            config: runConfig,
                            options: {
                                onResponseMetadata: (metadata = {}) => applySearchMetaToLatestAssistant(job.cardId, metadata)
                            }
                        },
                        tags: [`card:${job.cardId}`, `agent:${agentRunId}`],
                        onProgress: (chunk) => updateCardContent(job.cardId, chunk)
                    });

                    return { title: job.title, ok: true };
                } catch (innerError) {
                    debugLog.error(`Agent card generation failed for ${job.cardId}`, innerError);
                    updateCardContent(job.cardId, `\n\n⚠️ **生成失败**: ${innerError.message}`);
                    return {
                        title: job.title,
                        ok: false,
                        error: innerError?.message || 'Generation failed'
                    };
                } finally {
                    setCardGenerating(job.cardId, false);
                }
            }
        );

        executionResults.forEach((result, index) => {
            const job = runnableJobs[index];
            if (!job) return;
            results[job.index] = {
                title: job.title,
                ok: !!result?.ok,
                error: result?.ok ? undefined : (result?.error || 'Generation failed')
            };
        });

        const successCount = results.filter(r => r.ok).length;
        const failedCount = results.length - successCount;
        const resultDetails = results
            .map((result, index) => `${result.ok ? '✅' : '⚠️'} ${index + 1}. ${result.title}${result.ok ? '' : ` - ${result.error}`}`)
            .join('\n');

        updateCardFull?.(rootId, data => ({
            ...data,
            messages: [
                ...(data.messages || []),
                {
                    id: uuid(),
                    role: 'assistant',
                    content: `## Execution Result / 执行结果\nSuccess: ${successCount}/${results.length}\nFailed: ${failedCount}\nParallel limit: ${AGENT_EXECUTION_CONCURRENCY}\n\n${resultDetails}`
                }
            ]
        }));

        return {
            rootId,
            total: results.length,
            success: successCount,
            failed: failedCount
        };
    } catch (error) {
        debugLog.error('Agent planning failed', error);
        if (rootId) {
            updateCardFull?.(rootId, data => ({
                ...data,
                messages: [
                    ...(data.messages || []),
                    {
                        id: uuid(),
                        role: 'assistant',
                        content: `\n\n⚠️ **Agent planning failed**: ${error.message || 'Unknown error'}`
                    }
                ]
            }));
        }
        return { rootId, total: 0, success: 0, failed: 0, error: error?.message || 'Agent planning failed' };
    }
};
