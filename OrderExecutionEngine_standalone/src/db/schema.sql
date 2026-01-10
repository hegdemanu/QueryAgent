-- Order Execution Engine - Database Schema
-- Two-table design: orders (aggregate root) + order_executions (attempts/results)

-- =============================================================================
-- TABLE 1: orders (Aggregate Root)
-- The state machine. Stores current state and original payload.
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'routing', 'building', 'submitted', 'confirmed', 'failed')),
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- =============================================================================
-- TABLE 2: order_executions (1:N relation to orders)
-- Tracks execution attempts, routing decisions, and results.
-- Allows retries, auditability, and clean separation of concerns.
-- =============================================================================
CREATE TABLE IF NOT EXISTS order_executions (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    chosen_dex VARCHAR(20),
    routing_decision JSONB,
    tx_hash VARCHAR(255),
    execution_price DECIMAL(20, 8),
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_executions_order_id ON order_executions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_executions_attempt ON order_executions(order_id, attempt_number);

-- =============================================================================
-- DESIGN NOTES:
-- ✅ Order is the aggregate root
-- ✅ order_executions is 1:N for retry attempts and audit
-- ✅ Routing decision lives in executions (per-attempt)
-- ❌ No over-normalized tables (payloads, statuses, etc.)
-- =============================================================================
