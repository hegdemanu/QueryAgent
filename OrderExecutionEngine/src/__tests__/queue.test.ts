/**
 * Queue Behavior Tests
 * Tests for BullMQ queue configuration
 */

import { orderQueue } from '../worker/queue';

describe('Queue Behavior', () => {
    test('queue is configured with correct name', () => {
        expect(orderQueue.name).toBe('order-execution');
    });

    test('queue configured with correct retry settings', () => {
        const opts = orderQueue.opts.defaultJobOptions;
        expect(opts?.attempts).toBe(3);
        expect(opts?.backoff).toEqual({ type: 'exponential', delay: 1000 });
    });

    test('queue configured with job cleanup settings', () => {
        const opts = orderQueue.opts.defaultJobOptions;
        expect(opts?.removeOnComplete).toEqual({ age: 3600 });
        expect(opts?.removeOnFail).toEqual({ age: 86400 });
    });
});
