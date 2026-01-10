/**
 * Mock Raydium DEX Implementation
 * 
 * Per assignment mock guide:
 * - 200ms quote delay
 * - 2-3s swap delay
 * - 98-102% price variance
 * - 0.3% fee
 */

import { IDexRouter, Quote, SwapResult } from './interface';
import { FatalError } from '@domain/types';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function generateMockTxHash(): string {
    return `mock_raydium_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export class MockRaydiumDex implements IDexRouter {
    private readonly basePrice = 100; // Mock base price for SOL/USDC

    async getQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        // Simulate network delay (200ms per assignment)
        await sleep(200);

        // Price with 98-102% variance
        const price = this.basePrice * (0.98 + Math.random() * 0.04);

        console.log(`[Raydium] Quote: ${tokenIn}→${tokenOut}, amount=${amount}, price=${price.toFixed(4)}`);

        return {
            price,
            fee: 0.003 // 0.3% fee
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
            throw new FatalError('Slippage exceeded on Raydium');
        }

        // Simulate occasional network errors (5% chance) - retriable
        if (Math.random() < 0.05) {
            throw new Error('Network timeout on Raydium');
        }

        const txHash = generateMockTxHash();
        console.log(`[Raydium] Swap executed: ${txHash}, price=${executedPrice.toFixed(4)}`);

        return {
            txHash,
            executedPrice
        };
    }
}
