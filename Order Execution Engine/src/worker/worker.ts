/**
 * BullMQ Worker
 * 
 * Processes order-execution jobs.
 * Concurrency: 10 (per assignment requirement)
 * 
 * CRITICAL: Each job advances order by exactly ONE state.
 */

import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { advanceOrder, handleRetryExhausted } from '../domain/orchestrator';

export const worker = new Worker(
    'order-execution',
    async (job: Job<{ orderId: string; executionId: string }>) => {
        await advanceOrder(job.data.orderId);
    },
    {
        connection: {
            url: config.REDIS_URL,
            maxRetriesPerRequest: null
        },
        concurrency: 10 // Process 10 orders concurrently (assignment requirement)
    }
);

worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed for order ${job.data.orderId}`);
});

// CRITICAL: Handle retry exhaustion
worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= 3) {
        console.error(`[Worker] Job ${job.id} exhausted retries for order ${job.data.orderId}`);
        await handleRetryExhausted(job.data.orderId, err.message);
    } else {
        console.error(`[Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/3):`, err.message);
    }
});

worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
});

console.log('[Worker] Started with concurrency: 10');
