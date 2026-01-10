/**
 * Order Execution Engine - Server Entry Point
 * 
 * Architecture: Durable State Machine
 * - Order = state machine persisted in PostgreSQL
 * - BullMQ schedules "advance order by ONE state"
 * - Worker loads order, runs ONE handler, emits event
 * - WebSocket streams all status updates to client
 */

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config';
import { setupOrderRoutes } from './api/orders';
import { checkConnection } from './db/db';
import './worker/worker'; // Import to start worker

const fastify = Fastify({
    logger: true,
});

async function bootstrap(): Promise<void> {
    // Register WebSocket plugin
    await fastify.register(websocket);

    // Setup order routes
    await fastify.register(setupOrderRoutes);

    // Health check endpoint
    fastify.get('/health', async () => {
        const dbConnected = await checkConnection();
        return {
            status: dbConnected ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected'
        };
    });

    // Start server
    try {
        await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🚀 Order Execution Engine listening on port ${config.PORT}`);
        console.log(`📊 Health check: http://localhost:${config.PORT}/health`);
        console.log(`🔌 WebSocket: ws://localhost:${config.PORT}/api/orders/execute`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await fastify.close();
    // Close database pool
    const pool = await import('./db/db').then(m => m.default);
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
});

bootstrap();
