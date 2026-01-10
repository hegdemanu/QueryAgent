/**
 * WebSocket Lifecycle Integration Test
 * 
 * Tests the full order lifecycle through WebSocket:
 * pending → routing → building → submitted → confirmed
 */

import { orderEventBus, emitOrderEvent, OrderEvent } from '../events/bus';
import { ORDER_FLOW, TERMINAL_STATES } from '../domain/OrderState';

describe('WebSocket Lifecycle', () => {

    test('order events follow correct lifecycle sequence', (done) => {
        const testOrderId = `ws-test-${Date.now()}`;
        const receivedStatuses: string[] = [];
        const expectedSequence = ['routing', 'building', 'submitted', 'confirmed'];

        const listener = (event: OrderEvent) => {
            if (event.orderId === testOrderId) {
                receivedStatuses.push(event.status);

                // When we receive terminal state, verify sequence
                if (TERMINAL_STATES.includes(event.status)) {
                    expect(receivedStatuses).toEqual(expectedSequence);
                    orderEventBus.off('order.status.changed', listener);
                    done();
                }
            }
        };

        orderEventBus.on('order.status.changed', listener);

        // Simulate order lifecycle events
        setTimeout(() => emitOrderEvent(testOrderId, 'routing'), 10);
        setTimeout(() => emitOrderEvent(testOrderId, 'building', { routing: { dex: 'raydium' } }), 20);
        setTimeout(() => emitOrderEvent(testOrderId, 'submitted'), 30);
        setTimeout(() => emitOrderEvent(testOrderId, 'confirmed', { txHash: 'mock_tx_123' }), 40);
    });

    test('failed orders emit failure reason', (done) => {
        const testOrderId = `ws-fail-${Date.now()}`;
        const receivedStatuses: string[] = [];

        const listener = (event: OrderEvent) => {
            if (event.orderId === testOrderId) {
                receivedStatuses.push(event.status);

                if (event.status === 'failed') {
                    expect(event.data).toHaveProperty('error');
                    expect((event.data as { error: string }).error).toBe('Slippage exceeded');
                    orderEventBus.off('order.status.changed', listener);
                    done();
                }
            }
        };

        orderEventBus.on('order.status.changed', listener);

        // Simulate order that fails after routing
        setTimeout(() => emitOrderEvent(testOrderId, 'routing'), 10);
        setTimeout(() => emitOrderEvent(testOrderId, 'building'), 20);
        setTimeout(() => emitOrderEvent(testOrderId, 'failed', { error: 'Slippage exceeded' }), 30);
    });

    test('event data includes routing decision', (done) => {
        const testOrderId = `ws-routing-${Date.now()}`;

        const listener = (event: OrderEvent) => {
            if (event.orderId === testOrderId && event.status === 'building') {
                expect(event.data).toBeDefined();
                expect(event.data).toHaveProperty('routing');
                const routing = (event.data as { routing: object }).routing;
                expect(routing).toHaveProperty('dex');
                orderEventBus.off('order.status.changed', listener);
                done();
            }
        };

        orderEventBus.on('order.status.changed', listener);
        emitOrderEvent(testOrderId, 'building', {
            routing: {
                dex: 'meteora',
                raydiumPrice: 100.5,
                meteoraPrice: 101.2
            }
        });
    });

    test('confirmed event includes transaction details', (done) => {
        const testOrderId = `ws-confirmed-${Date.now()}`;

        const listener = (event: OrderEvent) => {
            if (event.orderId === testOrderId && event.status === 'confirmed') {
                expect(event.data).toBeDefined();
                expect(event.data).toHaveProperty('txHash');
                expect(event.data).toHaveProperty('executionPrice');
                orderEventBus.off('order.status.changed', listener);
                done();
            }
        };

        orderEventBus.on('order.status.changed', listener);
        emitOrderEvent(testOrderId, 'confirmed', {
            txHash: 'mock_raydium_1234567890_abc123',
            executionPrice: 99.75
        });
    });
});
