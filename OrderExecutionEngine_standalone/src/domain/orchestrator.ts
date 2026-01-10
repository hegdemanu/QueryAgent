/**
 * ORDER ORCHESTRATOR (The Brain)
 * 
 * Responsibilities:
 * 1. Load order from DB
 * 2. Verify state consistency
 * 3. Dispatch to specific state handler
 * 4. Persist result
 * 5. Schedule next step via Queue (if non-terminal)
 */

import { Order, OrderStatus, FatalError } from './types';
import * as db from '../db/orders';
import { orderQueue } from '../worker/queue';
import * as handlers from '@state/handlers';

export async function processOrderStep(orderId: string): Promise<void> {
    // 1. Load Order
    const order = await db.getOrder(orderId);
    if (!order) {
        console.error(`[Orchestrator] Order ${orderId} not found`);
        return;
    }

    console.log(`[Orchestrator] Processing ${orderId} in state: ${order.status}`);

    // 2. Dispatch to Handler
    try {
        switch (order.status) {
            case 'pending':
                await handlers.handlePending(order);
                await scheduleNextStep(orderId);
                break;

            case 'routing':
                await handlers.handleRouting(order);
                await scheduleNextStep(orderId);
                break;

            case 'building':
                await handlers.handleBuilding(order);
                await scheduleNextStep(orderId);
                break;

            case 'submitted':
                await handlers.handleSubmitted(order);
                // 'submitted' handler transitions to 'confirmed' or 'failed'
                // These are terminal states, so we usually don't schedule next step 
                // unless there is a post-confirmation step (none in this spec).
                break;

            case 'confirmed':
            case 'failed':
                console.log(`[Orchestrator] Order ${orderId} is in terminal state.`);
                break;

            default:
                console.error(`[Orchestrator] Unknown state: ${order.status}`);
        }
    } catch (error) {
        // 3. Handle Errors
        await handleExecutionError(order, error);
    }
}

async function scheduleNextStep(orderId: string): Promise<void> {
    // Enqueue job for next state
    // BullMQ handles the delay/backoff if this fails, but here we just schedule the next tick
    await orderQueue.add('advance-order', { orderId });
    console.log(`[Orchestrator] Scheduled next step for ${orderId}`);
}

// ALIAS for worker compatibility
export const advanceOrder = processOrderStep;

export async function handleRetryExhausted(orderId: string, reason: string): Promise<void> {
    const order = await db.getOrder(orderId);
    if (!order) {
        console.error(`[Orchestrator] Cannot handle retry exhaustion: Order ${orderId} not found`);
        return;
    }
    await handlers.failOrder(order, `Retry limit exceeded: ${reason}`);
}

async function handleExecutionError(order: Order, error: unknown): Promise<void> {
    console.error(`[Orchestrator] Error processing ${order.id}:`, error);

    if (error instanceof FatalError) {
        await handlers.failOrder(order, error.message);
    } else {
        // Re-throw regular errors to let BullMQ handle retry (exponential backoff)
        throw error;
    }
}
