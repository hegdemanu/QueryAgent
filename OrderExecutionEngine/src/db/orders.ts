import { query } from './db';
import { Order, OrderStatus, RoutingDecision } from '@domain/types';

// =============================================================================
// ORDER OPERATIONS (Aggregate Root)
// =============================================================================

/**
 * Create a new order in pending state
 */
export async function createOrder(order: Omit<Order, 'created_at' | 'updated_at'>): Promise<Order> {
    const result = await query<Order>(
        `INSERT INTO orders (id, status, payload) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
        [order.id, order.status, JSON.stringify(order.payload)]
    );
    return result.rows[0]!;
}

/**
 * Get order by ID
 */
export async function getOrder(id: string): Promise<Order | null> {
    const result = await query<Order>('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0] ?? null;
}

/**
 * CRITICAL: Atomic state transition with race protection
 * Returns true if transition succeeded, false if order was already in different state
 */
export async function transitionOrderStatus(
    id: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus
): Promise<boolean> {
    const result = await query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3',
        [toStatus, id, fromStatus]
    );
    return result.rowCount > 0;
}

/**
 * Get orders by status (for monitoring/debugging)
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const result = await query<Order>(
        'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC',
        [status]
    );
    return result.rows;
}

/**
 * Get recent orders (for order history)
 */
export async function getRecentOrders(limit: number = 50): Promise<Order[]> {
    const result = await query<Order>(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1',
        [limit]
    );
    return result.rows;
}

// =============================================================================
// ORDER EXECUTION OPERATIONS (1:N relation)
// =============================================================================

export interface OrderExecution {
    id: string;
    order_id: string;
    attempt_number: number;
    chosen_dex?: string;
    routing_decision?: RoutingDecision;
    tx_hash?: string;
    execution_price?: number;
    failure_reason?: string;
    created_at: Date;
}

/**
 * Create a new execution attempt for an order
 */
export async function createExecution(
    id: string,
    orderId: string,
    attemptNumber: number
): Promise<OrderExecution> {
    const result = await query<OrderExecution>(
        `INSERT INTO order_executions (id, order_id, attempt_number) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
        [id, orderId, attemptNumber]
    );
    return result.rows[0]!;
}

/**
 * Update execution with routing decision
 */
export async function updateExecutionRouting(
    executionId: string,
    chosenDex: string,
    routingDecision: RoutingDecision
): Promise<void> {
    await query(
        `UPDATE order_executions 
     SET chosen_dex = $1, routing_decision = $2 
     WHERE id = $3`,
        [chosenDex, JSON.stringify(routingDecision), executionId]
    );
}

/**
 * Update execution with success result
 */
export async function updateExecutionSuccess(
    executionId: string,
    txHash: string,
    executionPrice: number
): Promise<void> {
    await query(
        `UPDATE order_executions 
     SET tx_hash = $1, execution_price = $2 
     WHERE id = $3`,
        [txHash, executionPrice, executionId]
    );
}

/**
 * Update execution with failure reason
 */
export async function updateExecutionFailure(
    executionId: string,
    failureReason: string
): Promise<void> {
    await query(
        `UPDATE order_executions 
     SET failure_reason = $1 
     WHERE id = $2`,
        [failureReason, executionId]
    );
}

/**
 * Get all executions for an order (for audit/debugging)
 */
export async function getOrderExecutions(orderId: string): Promise<OrderExecution[]> {
    const result = await query<OrderExecution>(
        'SELECT * FROM order_executions WHERE order_id = $1 ORDER BY attempt_number',
        [orderId]
    );
    return result.rows;
}

/**
 * Get latest execution for an order
 */
export async function getLatestExecution(orderId: string): Promise<OrderExecution | null> {
    const result = await query<OrderExecution>(
        'SELECT * FROM order_executions WHERE order_id = $1 ORDER BY attempt_number DESC LIMIT 1',
        [orderId]
    );
    return result.rows[0] ?? null;
}

/**
 * Get execution attempt count for an order
 */
export async function getExecutionAttemptCount(orderId: string): Promise<number> {
    const result = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM order_executions WHERE order_id = $1',
        [orderId]
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
}
