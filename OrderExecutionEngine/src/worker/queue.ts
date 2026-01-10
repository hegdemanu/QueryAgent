/**
 * BullMQ Queue Configuration
 * 
 * Schedules "advance order X by ONE state" jobs.
 * NEVER "execute full order pipeline".
 */

import { Queue } from 'bullmq';
import { config } from '../config';

export const orderQueue = new Queue('order-execution', {
    connection: {
        url: config.REDIS_URL,
        maxRetriesPerRequest: null
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000 // 1s, then 2s, then 4s
        },
        removeOnComplete: {
            age: 3600 // Keep for 1 hour
        },
        removeOnFail: {
            age: 86400 // Keep for 24 hours
        }
    }
});

/**
 * Enqueue next step for an order
 * Each job advances the order by exactly ONE state
 */
export async function enqueueNextStep(orderId: string, executionId: string): Promise<void> {
    await orderQueue.add('advance-order', { orderId, executionId });
}
