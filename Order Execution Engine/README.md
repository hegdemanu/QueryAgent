# Order Execution Engine

## Order Type Choice: Market Order

**Why Market Order?**
- Simplest deterministic flow: fetch quotes → select best → execute immediately
- Demonstrates core architecture without time-dependent complexity
- Most common use case for DEX trading

**Extensibility:**
- **Limit Orders**: Add price monitoring loop; trigger execution when market price ≤ target
- **Sniper Orders**: Add event listener for token launch/migration; trigger on blockchain events

---

## Architecture: Durable State Machine

> **Core Principle:** Order = Durable State Machine persisted in PostgreSQL

```
                     ┌─────────────────────────────────────────────┐
                     │           ORDER STATE MACHINE               │
                     └─────────────────────────────────────────────┘
                                         │
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
- Worker loads order from DB, runs ONE handler, emits WS event
- Crash recovery: resume from last persisted state

---

## Implementation Approach: Mock-First

> Phase 2 uses a **fully mocked DEX router** to focus on architecture and flow.

This aligns with the assignment's "Mock recommended" guidance:
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
| POST | `/api/orders/execute` | Create order, upgrades to WebSocket |
| GET | `/api/orders/:id` | Get order by ID |
| GET | `/health` | Health check |

---

## Deployment

**Live URL**: [TBD]

**Demo Video**: [TBD]

---

## License

MIT
