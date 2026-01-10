/**
 * Mock Meteora DEX Implementation
 * 
 * Per assignment mock guide:
 * - 200ms quote delay
 * - 2-3s swap delay
 * - 97-102% price variance (slightly different from Raydium)
 * - 0.2% fee (lower than Raydium)
 */

import { IDexRouter, Quote, SwapResult } from './interface';
import { FatalError } from '@domain/types';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function generateMockTxHash(): string {
    return `mock_meteora_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export class MockMeteoraDex implements IDexRouter {
    private readonly basePrice = 100; // Mock base price for SOL/USDC

    async getQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        // Simulate network delay (200ms per assignment)
        await sleep(200);

        // Price with 97-102% variance (slightly wider than Raydium for differentiation)
        const price = this.basePrice * (0.97 + Math.random() * 0.05);

        console.log(`[Meteora] Quote: ${tokenIn}→${tokenOut}, amount=${amount}, price=${price.toFixed(4)}`);

        return {
            price,
            fee: 0.002 // 0.2% fee (lower than Raydium)
        };
    }

    async executeSwap(
        tokenIn: string,
        tokenOut: string,
        amount: number,
        slippage: number
    ): Promise<SwapResult> {
        // Simulate 2-3 second execution
        await sleep(2000 + Math.random() * 1000);

        const executedPrice = this.basePrice * (0.99 + Math.random() * 0.02);
        const expectedPrice = this.basePrice;

        // Simulate slippage check
        if (executedPrice < expectedPrice * (1 - slippage)) {
            throw new FatalError('Slippage exceeded on Meteora');
        }

        // Simulate occasional network errors (5% chance) - retriable
        if (Math.random() < 0.05) {
            throw new Error('Network timeout on Meteora');
        }

        const txHash = generateMockTxHash();
        console.log(`[Meteora] Swap executed: ${txHash}, price=${executedPrice.toFixed(4)}`);

        return {
            txHash,
            executedPrice
        };
    }
}
