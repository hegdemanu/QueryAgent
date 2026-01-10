# Order Execution Engine

A durable state-machine based order execution engine with DEX routing and real-time WebSocket updates.

## Order Execution Engine

## Design Choice: Market Order
**Why Market Order?**
Market order was chosen because it has a **deterministic, single-pass execution flow** and cleanly demonstrates the state machine, routing, queueing, and WebSocket lifecycle. The same engine can be extended to **Limit/Sniper** orders by adding new states (e.g., `watching`) and handlers that trigger execution only when conditions are met.

## Architecture: Durable State Machine

> **Core Principle:** Order = Durable State Machine persisted in PostgreSQL

```
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ PENDING  │ → │ ROUTING  │ → │ BUILDING │ → │SUBMITTED │ → │CONFIRMED │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                        │              
                                                        └───────→ ┌──────────┐
                                                                  │  FAILED  │
                                                                  └──────────┘
```

**Key Properties:**
- Each BullMQ job advances order by **exactly ONE state**
- Database uses conditional UPDATEs to prevent race conditions
- Worker loads order from DB, runs ONE handler, emits event
- Crash recovery: resume from last persisted state

---

## Implementation: Mock-First

> Uses **fully mocked DEX routers** to focus on architecture and flow.

- Mock Raydium/Meteora with realistic delays (200ms quotes, 2-3s swaps)
- 2-5% price variance between DEXs
- Focus on correctness over blockchain integration

---

## Tech Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | Fastify | Native WebSocket support, 2x faster than Express |
| Queue | BullMQ + Redis | Durable queue with built-in exponential backoff |
| Database | PostgreSQL | ACID transactions, source of truth for order state |
| Language | TypeScript (strict) | Type safety for state machine correctness |
| DEX | Mock implementation | Focus on architecture per assignment guidance |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up -d

# Run database migrations
docker exec -i order-execution-postgres psql -U postgres -d orders_db < src/db/schema.sql

# Start development server
npm run dev

# Run tests
npm test
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Create order (REST) |
| `GET` | `/api/orders/:id` | Get order + executions by ID |
| `GET` | `/api/orders` | List recent orders |
| `GET/WS` | `/api/orders/execute` | WebSocket for real-time updates |
| `GET` | `/health` | Health check |

### WebSocket Usage

```javascript
// Connect
const ws = new WebSocket('ws://localhost:3000/api/orders/execute');

// Send order
ws.send(JSON.stringify({
  tokenIn: 'SOL',
  tokenOut: 'USDC',
  amount: 1,
  slippage: 0.01
}));

// Receive status updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.status); // pending → routing → building → submitted → confirmed
};
```

---

## Project Structure

```
src/
├── api/            # HTTP + WebSocket handlers
├── worker/         # BullMQ queue + worker + orchestrator
├── domain/         # Order types, state machine, handlers
├── dex/            # Mock Raydium/Meteora implementations
├── db/             # PostgreSQL schema + queries
├── events/         # Event bus for WebSocket streaming
└── index.ts        # Server entry point
```

---

## Database Schema

### `orders` (Aggregate Root)
- `id` UUID PK
- `status` (pending|routing|building|submitted|confirmed|failed)
- `payload` JSONB
- `created_at`, `updated_at`

### `order_executions` (1:N)
- `id` UUID PK
- `order_id` FK → orders
- `attempt_number`
- `chosen_dex`, `routing_decision` JSONB
- `tx_hash`, `execution_price`, `failure_reason`

---

## Testing

```bash
npm test                    # Run all tests
npm run typecheck           # TypeScript strict check
```

**Coverage:** 46 tests across routing logic, state machine, queue behavior, event bus, DEX mocks, and WebSocket lifecycle.

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `PORT` | Server port | 3000 |

---

## Performance & Concurrency

- **Concurrency**: 10 simultaneous workers (configurable).
- **Throughput**: ~100 orders/minute (simulating 3-5s per order).
- **Scalability**: Stateless architecture allows horizontal scaling of workers.

---

## Deployment (REQUIRED ACTION)

**Live URL**: `[PASTE YOUR RENDER.COM URL HERE]`

**Platform**: Render.com
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Env Vars**: `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production`

---

## Demo Video (REQUIRED ACTION)

**YouTube Link**: `[PASTE YOUR YOUTUBE LINK HERE]`

**Script Checklist:**
1. Submit 3-5 orders simultaneously.
2. Show WebSocket streaming logs (pending → routing → building → submitted → confirmed).
3. Show console logs proving Raydium vs Meteora price comparison.
4. Show database state changes.

## License

MIT
