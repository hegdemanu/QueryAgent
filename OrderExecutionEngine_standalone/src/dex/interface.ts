/**
 * DEX Interface
 * Abstract interface for DEX operations (mock or real)
 * 
 * ❌ No buildSwap() - not persisting transaction builders
 * ✅ Only two methods as per spec
 */

export interface Quote {
    price: number;
    fee: number;
}

export interface SwapResult {
    txHash: string;
    executedPrice: number;
}

export interface IDexRouter {
    /**
     * Get quote for a swap
     * @returns Price (output amount per 1 input) and fee rate
     */
    getQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote>;

    /**
     * Execute swap on the DEX
     * @returns Transaction hash and actual execution price
     */
    executeSwap(
        tokenIn: string,
        tokenOut: string,
        amount: number,
        slippage: number
    ): Promise<SwapResult>;
}
