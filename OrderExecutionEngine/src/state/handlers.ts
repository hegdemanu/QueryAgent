/**
 * STATE HANDLERS
 * 
 * Each handler is responsible for:
 * 1. Executing state-specific logic
 * 2. Transitioning to next state (via db.transitionOrderStatus)
 * 
 * Handlers are pure business logic - orchestration is handled by orchestrator.ts
 */

import { Order, OrderStatus, FatalError } from '@domain/types';
import * as db from '../db/orders';
import { v4 as uuidv4 } from 'uuid';

/**
 * PENDING → ROUTING
 * Create execution record and transition to routing
 */
export async function handlePending(order: Order): Promise<void> {
    console.log(`[Handler:Pending] Starting order ${order.id}`);

    // Create new execution attempt
    const attemptCount = await db.getExecutionAttemptCount(order.id);
    await db.createExecution(uuidv4(), order.id, attemptCount + 1);

    // Transition to routing
    const success = await db.transitionOrderStatus(order.id, 'pending', 'routing');
    if (!success) {
        console.warn(`[Handler:Pending] Race condition: order ${order.id} already moved from pending`);
        return;
    }

    // Emit WebSocket event
    const { emitOrderEvent } = await import('../events/bus');
    emitOrderEvent(order.id, 'routing');
}

/**
 * ROUTING → BUILDING
 * Fetch quotes from both DEXs, compare prices, select best route
 */
export async function handleRouting(order: Order): Promise<void> {
    console.log(`[Handler:Routing] Routing order ${order.id}`);

    const execution = await db.getLatestExecution(order.id);
    if (!execution) {
        throw new Error(`No execution found for order ${order.id}`);
    }

    // Import DEX routers
    const { MockRaydiumDex } = await import('../dex/mockRaydium');
    const { MockMeteoraDex } = await import('../dex/mockMeteora');
    const raydiumDex = new MockRaydiumDex();
    const meteoraDex = new MockMeteoraDex();

    // Fetch quotes from both DEXs in parallel (assignment requirement)
    console.log(`[Handler:Routing] Fetching quotes from Raydium and Meteora...`);
    const [raydiumQuote, meteoraQuote] = await Promise.all([
        raydiumDex.getQuote(order.payload.tokenIn, order.payload.tokenOut, order.payload.amount),
        meteoraDex.getQuote(order.payload.tokenIn, order.payload.tokenOut, order.payload.amount)
    ]);

    // Calculate net prices after fees
    const raydiumNet = raydiumQuote.price * (1 - raydiumQuote.fee);
    const meteoraNet = meteoraQuote.price * (1 - meteoraQuote.fee);

    // Select best DEX (assignment requirement: route to best price)
    const bestDex = raydiumNet > meteoraNet ? 'raydium' : 'meteora';

    const routingDecision = {
        dex: bestDex as 'raydium' | 'meteora',
        raydiumPrice: raydiumQuote.price,
        meteoraPrice: meteoraQuote.price,
        raydiumFee: raydiumQuote.fee,
        meteoraFee: meteoraQuote.fee,
        reason: `${bestDex} offers better net price after fees (${bestDex === 'raydium' ? raydiumNet.toFixed(4) : meteoraNet.toFixed(4)})`,
    };

    // LOG routing decision for transparency (assignment requirement)
    console.log(`[Handler:Routing] Routing decision for ${order.id}:`, JSON.stringify(routingDecision, null, 2));

    await db.updateExecutionRouting(execution.id, routingDecision.dex, routingDecision);

    // Transition to building
    const success = await db.transitionOrderStatus(order.id, 'routing', 'building');
    if (!success) {
        console.warn(`[Handler:Routing] Race condition: order ${order.id} already moved from routing`);
        return;
    }

    // Emit WebSocket event
    const { emitOrderEvent } = await import('../events/bus');
    emitOrderEvent(order.id, 'building', { routing: routingDecision });
}

/**
 * BUILDING → SUBMITTED → CONFIRMED
 * Execute swap on chosen DEX and confirm transaction
 * 
 * This is where the actual swap execution happens:
 * 1. Load routing decision from execution record
 * 2. Call executeSwap() on the chosen DEX (Raydium or Meteora)
 * 3. Persist txHash and executionPrice
 * 4. Transition through submitted → confirmed
 */
export async function handleBuilding(order: Order): Promise<void> {
    console.log(`[Handler:Building] Executing swap for order ${order.id}`);

    // 1. Load execution record with routing decision
    const execution = await db.getLatestExecution(order.id);
    if (!execution) {
        throw new Error(`No execution record found for order ${order.id}`);
    }
    if (!execution.chosen_dex) {
        throw new Error(`Missing routing decision for order ${order.id}`);
    }

    // 2. Instantiate the chosen DEX router
    const { MockRaydiumDex } = await import('../dex/mockRaydium');
    const { MockMeteoraDex } = await import('../dex/mockMeteora');
    const dex = execution.chosen_dex === 'raydium'
        ? new MockRaydiumDex()
        : new MockMeteoraDex();

    console.log(`[Handler:Building] Using ${execution.chosen_dex} for order ${order.id}`);

    // 3. Handle wrapped SOL (mock-level logging per spec)
    const { tokenIn, tokenOut, amount, slippage } = order.payload;
    if (tokenIn.toUpperCase() === 'SOL') {
        console.log(`[Handler:Building] Would wrap SOL → wSOL in real implementation`);
    }

    // 4. Execute the swap on the DEX
    let swapResult;
    try {
        swapResult = await dex.executeSwap(tokenIn, tokenOut, amount, slippage);
    } catch (err) {
        // FatalError (e.g., slippage exceeded) → mark order failed
        if (err instanceof FatalError) {
            await failOrder(order, err.message);
            return;
        }
        // Any other error is retriable → let BullMQ retry
        throw err;
    }

    // 5. Persist successful execution details
    await db.updateExecutionSuccess(execution.id, swapResult.txHash, swapResult.executedPrice);

    // 6. Transition: building → submitted
    let success = await db.transitionOrderStatus(order.id, 'building', 'submitted');
    if (!success) {
        console.warn(`[Handler:Building] Race condition on submitted transition for ${order.id}`);
        return;
    }
    const { emitOrderEvent } = await import('../events/bus');
    emitOrderEvent(order.id, 'submitted');

    // 7. Transition: submitted → confirmed (terminal state)
    success = await db.transitionOrderStatus(order.id, 'submitted', 'confirmed');
    if (!success) {
        console.warn(`[Handler:Building] Race condition on confirmed transition for ${order.id}`);
        return;
    }
    emitOrderEvent(order.id, 'confirmed', {
        txHash: swapResult.txHash,
        executionPrice: swapResult.executedPrice,
    });

    console.log(`[Handler:Building] Order ${order.id} confirmed with tx: ${swapResult.txHash}`);
}

/**
 * SUBMITTED → CONFIRMED (No-op)
 * 
 * Confirmation now happens in handleBuilding for atomic swap execution.
 * This handler exists for backwards compatibility / state machine completeness.
 */
export async function handleSubmitted(order: Order): Promise<void> {
    console.log(`[Handler:Submitted] Order ${order.id} already in submitted state, checking if confirmed...`);

    // If we reach here, the order should already be confirmed by handleBuilding.
    // This is a safety fallback in case of partial execution.
    const currentOrder = await db.getOrder(order.id);
    if (currentOrder && currentOrder.status === 'submitted') {
        // Edge case: handleBuilding completed swap but crashed before confirming
        const execution = await db.getLatestExecution(order.id);
        if (execution?.tx_hash) {
            const success = await db.transitionOrderStatus(order.id, 'submitted', 'confirmed');
            if (success) {
                const { emitOrderEvent } = await import('../events/bus');
                emitOrderEvent(order.id, 'confirmed', {
                    txHash: execution.tx_hash,
                    executionPrice: execution.execution_price,
                });
                console.log(`[Handler:Submitted] Recovered order ${order.id} to confirmed state`);
            }
        }
    }
}

/**
 * Mark order as failed with reason
 * Called by orchestrator on FatalError
 */
export async function failOrder(order: Order, reason: string): Promise<void> {
    console.log(`[Handler:Fail] Failing order ${order.id}: ${reason}`);

    const execution = await db.getLatestExecution(order.id);
    if (execution) {
        await db.updateExecutionFailure(execution.id, reason);
    }

    // Transition to failed (from any state)
    const success = await db.transitionOrderStatus(order.id, order.status, 'failed');
    if (!success) {
        console.warn(`[Handler:Fail] Order ${order.id} already in terminal state`);
        return;
    }

    // Emit WebSocket event
    const { emitOrderEvent } = await import('../events/bus');
    emitOrderEvent(order.id, 'failed', { error: reason });
}
