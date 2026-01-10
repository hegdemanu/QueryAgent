/**
 * Event Bus Tests
 * Tests for order event emission and subscription
 */

import { orderEventBus, emitOrderEvent, OrderEvent } from '../events/bus';

describe('Event Bus', () => {
    test('can subscribe and receive events', (done) => {
        const testOrderId = 'test-order-123';
        const testStatus = 'routing';

        const listener = (event: OrderEvent) => {
            expect(event.orderId).toBe(testOrderId);
            expect(event.status).toBe(testStatus);
            orderEventBus.off('order.status.changed', listener);
            done();
        };

        orderEventBus.on('order.status.changed', listener);
        emitOrderEvent(testOrderId, testStatus);
    });

    test('event includes optional data', (done) => {
        const testOrderId = 'test-order-456';
        const testData = { txHash: 'mock_tx_123', executionPrice: 99.5 };

        const listener = (event: OrderEvent) => {
            expect(event.orderId).toBe(testOrderId);
            expect(event.data).toEqual(testData);
            orderEventBus.off('order.status.changed', listener);
            done();
        };

        orderEventBus.on('order.status.changed', listener);
        emitOrderEvent(testOrderId, 'confirmed', testData);
    });

    test('can unsubscribe from events', () => {
        let callCount = 0;
        const listener = () => { callCount++; };

        orderEventBus.on('order.status.changed', listener);
        emitOrderEvent('test', 'pending');
        expect(callCount).toBe(1);

        orderEventBus.off('order.status.changed', listener);
        emitOrderEvent('test', 'routing');
        expect(callCount).toBe(1); // Should not increment
    });
});
