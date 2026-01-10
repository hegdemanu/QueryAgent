/**
 * ORDER DOMAIN TYPES
 * 
 * Core business types for the order execution engine.
 * These types match the database schema exactly.
 */

import { OrderStatus } from './OrderState';

export { OrderStatus } from './OrderState';

/**
 * Order payload - what the user submits
 */
export interface OrderPayload {
    tokenIn: string;
    tokenOut: string;
    amount: number;
    slippage: number;
}

/**
 * Routing decision - logged for transparency (assignment requirement)
 */
export interface RoutingDecision {
    dex: 'raydium' | 'meteora';
    raydiumPrice: number;
    meteoraPrice: number;
    raydiumFee: number;
    meteoraFee: number;
    reason: string;
}

/**
 * Complete order entity - matches database orders table
 * Execution details are in order_executions table (1:N relation)
 */
export interface Order {
    id: string;
    status: OrderStatus;
    payload: OrderPayload;
    created_at: Date;
    updated_at: Date;
}

/**
 * Error types for retry logic
 */
export class RetriableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RetriableError';
    }
}

export class FatalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FatalError';
    }
}
