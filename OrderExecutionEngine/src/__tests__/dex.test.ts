/**
 * DEX Mock Implementation Tests
 * Tests for Raydium and Meteora mock DEX routers
 */

import { MockRaydiumDex } from '../dex/mockRaydium';
import { MockMeteoraDex } from '../dex/mockMeteora';

describe('DEX Mock Implementations', () => {
    describe('MockRaydiumDex', () => {
        const dex = new MockRaydiumDex();

        test('returns quote with correct structure', async () => {
            const quote = await dex.getQuote('SOL', 'USDC', 1);

            expect(quote).toHaveProperty('price');
            expect(quote).toHaveProperty('fee');
            expect(quote.fee).toBe(0.003); // 0.3% fee
            expect(quote.price).toBeGreaterThan(0);
        });

        test('quote price is within expected variance (98-102%)', async () => {
            const quote = await dex.getQuote('SOL', 'USDC', 1);

            // Base price is 100, variance should be 98-102
            expect(quote.price).toBeGreaterThanOrEqual(98);
            expect(quote.price).toBeLessThanOrEqual(102);
        });
    });

    describe('MockMeteoraDex', () => {
        const dex = new MockMeteoraDex();

        test('returns quote with correct structure', async () => {
            const quote = await dex.getQuote('SOL', 'USDC', 1);

            expect(quote).toHaveProperty('price');
            expect(quote).toHaveProperty('fee');
            expect(quote.fee).toBe(0.002); // 0.2% fee (lower than Raydium)
            expect(quote.price).toBeGreaterThan(0);
        });

        test('quote price is within expected variance (97-102%)', async () => {
            const quote = await dex.getQuote('SOL', 'USDC', 1);

            // Base price is 100, variance should be 97-102
            expect(quote.price).toBeGreaterThanOrEqual(97);
            expect(quote.price).toBeLessThanOrEqual(102);
        });
    });
});
