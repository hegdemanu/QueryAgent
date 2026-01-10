import { EventEmitter } from 'events';
import { OrderStatus } from '@domain/OrderState';

/**
 * Order event payload for WebSocket streaming
 */
export interface OrderEvent {
    orderId: string;
    status: OrderStatus;
    data?: Record<string, unknown> | undefined;
}

/**
 * Typed event bus for order lifecycle events
 * Uses Node.js EventEmitter (in-process only)
 * 
 * ❌ No Redis pub/sub - not needed for single-server
 * ❌ No event sourcing - overkill for this assignment
 */
class OrderEventBus extends EventEmitter {
    emit(event: 'order.status.changed', payload: OrderEvent): boolean {
        return super.emit(event, payload);
    }

    on(event: 'order.status.changed', listener: (payload: OrderEvent) => void): this {
        return super.on(event, listener);
    }

    off(event: 'order.status.changed', listener: (payload: OrderEvent) => void): this {
        return super.off(event, listener);
    }
}

export const orderEventBus = new OrderEventBus();

/**
 * Convenience function to emit order status change events
 */
export function emitOrderEvent(orderId: string, status: OrderStatus, data?: Record<string, unknown>): void {
    orderEventBus.emit('order.status.changed', { orderId, status, data });
    console.log(`[Event] Order ${orderId}: ${status}`, data ? JSON.stringify(data) : '');
}
