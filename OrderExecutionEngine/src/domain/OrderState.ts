/**
 * ORDER STATE MACHINE CONTRACT
 * 
 * CRITICAL: All order execution must be driven by this state machine.
 * All state changes must emit WebSocket events.
 * 
 * Flow: pending → routing → building → submitted → confirmed
 *                                                 ↘ failed
 */

export type OrderStatus =
    | 'pending'
    | 'routing'
    | 'building'
    | 'submitted'
    | 'confirmed'
    | 'failed';

export const OrderStatuses = {
    Pending: 'pending',
    Routing: 'routing',
    Building: 'building',
    Submitted: 'submitted',
    Confirmed: 'confirmed',
    Failed: 'failed',
} as const;

export const ORDER_FLOW: readonly OrderStatus[] = [
    'pending',
    'routing',
    'building',
    'submitted',
    'confirmed',
] as const;

export const TERMINAL_STATES: readonly OrderStatus[] = [
    'confirmed',
    'failed',
] as const;

export function isTerminalState(status: OrderStatus): boolean {
    return TERMINAL_STATES.includes(status);
}

export function getNextState(current: OrderStatus): OrderStatus | null {
    const index = ORDER_FLOW.indexOf(current);
    if (index === -1 || index === ORDER_FLOW.length - 1) {
        return null;
    }
    return ORDER_FLOW[index + 1] ?? null;
}
