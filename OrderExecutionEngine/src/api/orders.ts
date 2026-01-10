/**
 * Order API Routes
 * 
 * POST /api/orders/execute - Creates order and upgrades to WebSocket
 * GET /api/orders/:id - Get order by ID
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import * as db from '@db/orders';
import { enqueueNextStep } from '@worker/queue';
import { orderEventBus, OrderEvent } from '@events/bus';

interface CreateOrderBody {
    tokenIn: string;
    tokenOut: string;
    amount: number;
    slippage?: number;
}

export async function setupOrderRoutes(fastify: FastifyInstance): Promise<void> {

    // POST /api/orders/execute with WebSocket upgrade
    fastify.get('/api/orders/execute', { websocket: true }, (socket, req) => {
        let currentOrderId: string | null = null;
        let listener: ((event: OrderEvent) => void) | null = null;

        console.log('[WebSocket] Client connected');

        socket.on('message', async (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString()) as CreateOrderBody;
                const { tokenIn, tokenOut, amount, slippage = 0.01 } = data;

                // Validate input
                if (!tokenIn || !tokenOut || !amount) {
                    socket.send(JSON.stringify({
                        error: 'Missing required fields: tokenIn, tokenOut, amount'
                    }));
                    return;
                }

                // Create order
                const orderId = randomUUID();
                const executionId = randomUUID();
                currentOrderId = orderId;

                await db.createOrder({
                    id: orderId,
                    status: 'pending',
                    payload: { tokenIn, tokenOut, amount, slippage }
                });

                console.log(`[API] Created order ${orderId}`);

                // Send orderId to client immediately
                socket.send(JSON.stringify({
                    orderId,
                    status: 'pending'
                }));

                // Subscribe to order events for this orderId
                listener = (event: OrderEvent) => {
                    if (event.orderId === orderId) {
                        socket.send(JSON.stringify({
                            orderId: event.orderId,
                            status: event.status,
                            ...event.data
                        }));
                    }
                };

                orderEventBus.on('order.status.changed', listener);

                // Start processing
                await enqueueNextStep(orderId, executionId);

            } catch (error) {
                console.error('[WebSocket] Error processing message:', error);
                socket.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        // Cleanup on disconnect
        socket.on('close', () => {
            if (listener) {
                orderEventBus.off('order.status.changed', listener);
            }
            console.log(`[WebSocket] Client disconnected${currentOrderId ? ` for order ${currentOrderId}` : ''}`);
        });
    });

    // REST endpoint to create order (alternative to WebSocket)
    fastify.post<{ Body: CreateOrderBody }>('/api/orders', async (req, reply) => {
        const { tokenIn, tokenOut, amount, slippage = 0.01 } = req.body;

        // Validate input
        if (!tokenIn || !tokenOut || !amount) {
            return reply.status(400).send({
                error: 'Missing required fields: tokenIn, tokenOut, amount'
            });
        }

        // Create order
        const orderId = randomUUID();
        const executionId = randomUUID();

        const order = await db.createOrder({
            id: orderId,
            status: 'pending',
            payload: { tokenIn, tokenOut, amount, slippage }
        });

        console.log(`[API] Created order ${orderId}`);

        // Start processing
        await enqueueNextStep(orderId, executionId);

        return {
            orderId,
            status: 'pending',
            message: 'Order created. Connect to WebSocket at /api/orders/execute to receive status updates.'
        };
    });

    // GET /api/orders/:id
    fastify.get<{ Params: { id: string } }>('/api/orders/:id', async (req, reply) => {
        const order = await db.getOrder(req.params.id);

        if (!order) {
            return reply.status(404).send({ error: 'Order not found' });
        }

        // Get executions for audit
        const executions = await db.getOrderExecutions(order.id);

        return { order, executions };
    });

    // GET /api/orders - List recent orders
    fastify.get('/api/orders', async () => {
        const orders = await db.getRecentOrders(50);
        return { orders };
    });
}
