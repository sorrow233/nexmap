export const runWithConcurrency = async (jobs, concurrency, runner) => {
    if (!Array.isArray(jobs) || jobs.length === 0) return [];

    const safeConcurrency = Math.max(1, Math.min(concurrency || 1, jobs.length));
    const results = new Array(jobs.length);
    let cursor = 0;

    const worker = async () => {
        while (true) {
            const currentIndex = cursor;
            cursor += 1;
            if (currentIndex >= jobs.length) return;

            try {
                results[currentIndex] = await runner(jobs[currentIndex], currentIndex);
            } catch (error) {
                results[currentIndex] = {
                    ok: false,
                    error: error?.message || 'Generation failed'
                };
            }
        }
    };

    await Promise.all(Array.from({ length: safeConcurrency }, () => worker()));
    return results;
};
