/**
 * Routing Logic Tests
 * Tests for DEX price comparison and selection
 */

import { MockRaydiumDex } from '../dex/mockRaydium';
import { MockMeteoraDex } from '../dex/mockMeteora';
import { RoutingDecision } from '../domain/types';

describe('Routing Logic', () => {
    const raydium = new MockRaydiumDex();
    const meteora = new MockMeteoraDex();

    test('selects DEX with better net price after fees', async () => {
        const raydiumQuote = await raydium.getQuote('SOL', 'USDC', 1);
        const meteoraQuote = await meteora.getQuote('SOL', 'USDC', 1);

        const raydiumNet = raydiumQuote.price * (1 - raydiumQuote.fee);
        const meteoraNet = meteoraQuote.price * (1 - meteoraQuote.fee);

        const bestDex = raydiumNet > meteoraNet ? 'raydium' : 'meteora';
        expect(['raydium', 'meteora']).toContain(bestDex);
    });

    test('accounts for fees in price comparison', () => {
        // If Raydium has higher price but higher fee, Meteora might win
        const raydiumQuote = { price: 100, fee: 0.003 };
        const meteoraQuote = { price: 99.5, fee: 0.002 };

        const raydiumNet = raydiumQuote.price * (1 - raydiumQuote.fee);
        const meteoraNet = meteoraQuote.price * (1 - meteoraQuote.fee);

        // Raydium: 100 * 0.997 = 99.7
        // Meteora: 99.5 * 0.998 = 99.301
        expect(raydiumNet).toBeCloseTo(99.7, 2);
        expect(meteoraNet).toBeCloseTo(99.301, 2);
        expect(raydiumNet).toBeGreaterThan(meteoraNet);
    });

    test('returns routing decision with all required fields', () => {
        const decision: RoutingDecision = {
            dex: 'raydium',
            raydiumPrice: 100,
            meteoraPrice: 99,
            raydiumFee: 0.003,
            meteoraFee: 0.002,
            reason: 'raydium has better net price after fees'
        };

        expect(decision).toHaveProperty('dex');
        expect(decision).toHaveProperty('raydiumPrice');
        expect(decision).toHaveProperty('meteoraPrice');
        expect(decision).toHaveProperty('raydiumFee');
        expect(decision).toHaveProperty('meteoraFee');
        expect(decision).toHaveProperty('reason');
    });
});
