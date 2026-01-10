import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config';

const fastify = Fastify({
    logger: true,
});

async function bootstrap() {
    // Register WebSocket plugin
    await fastify.register(websocket);

    // Health check endpoint
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Start server
    try {
        await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🚀 Server listening on port ${config.PORT}`);
        console.log(`📊 Health check: http://localhost:${config.PORT}/health`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await fastify.close();
    process.exit(0);
});

bootstrap();
