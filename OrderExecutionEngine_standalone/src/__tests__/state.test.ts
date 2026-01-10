/**
 * State Machine Tests
 * Tests for order state transitions and flow
 */

import { OrderStatus, OrderStatuses, ORDER_FLOW, TERMINAL_STATES, isTerminalState, getNextState } from '../domain/OrderState';

describe('Order State Machine', () => {
    test('OrderStatuses const matches type union', () => {
        expect(OrderStatuses.Pending).toBe('pending');
        expect(OrderStatuses.Routing).toBe('routing');
        expect(OrderStatuses.Building).toBe('building');
        expect(OrderStatuses.Submitted).toBe('submitted');
        expect(OrderStatuses.Confirmed).toBe('confirmed');
        expect(OrderStatuses.Failed).toBe('failed');
    });

    test('ORDER_FLOW contains correct sequence', () => {
        expect(ORDER_FLOW).toEqual([
            'pending',
            'routing',
            'building',
            'submitted',
            'confirmed'
        ]);
    });

    test('TERMINAL_STATES contains confirmed and failed', () => {
        expect(TERMINAL_STATES).toContain('confirmed');
        expect(TERMINAL_STATES).toContain('failed');
        expect(TERMINAL_STATES).toHaveLength(2);
    });

    test('isTerminalState returns true for terminal states', () => {
        expect(isTerminalState('confirmed')).toBe(true);
        expect(isTerminalState('failed')).toBe(true);
    });

    test('isTerminalState returns false for non-terminal states', () => {
        expect(isTerminalState('pending')).toBe(false);
        expect(isTerminalState('routing')).toBe(false);
        expect(isTerminalState('building')).toBe(false);
        expect(isTerminalState('submitted')).toBe(false);
    });

    test('getNextState returns correct next state', () => {
        expect(getNextState('pending')).toBe('routing');
        expect(getNextState('routing')).toBe('building');
        expect(getNextState('building')).toBe('submitted');
        expect(getNextState('submitted')).toBe('confirmed');
    });

    test('getNextState returns null for terminal states', () => {
        expect(getNextState('confirmed')).toBe(null);
        expect(getNextState('failed')).toBe(null);
    });
});
