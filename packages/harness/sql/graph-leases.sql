-- DF-21 durable control-plane coordination schema.
-- Apply once using a dedicated migration role before starting any runner.
-- The runtime role needs SELECT, INSERT and UPDATE, but not DELETE or DDL.
CREATE TABLE IF NOT EXISTS darkfactory_graph_leases (
    run_key text PRIMARY KEY,
    owner_id uuid NOT NULL,
    generation bigint NOT NULL CHECK (generation > 0),
    expires_at timestamptz NOT NULL
);

-- Generation must not be reset by deleting expired rows. An expired row is
-- atomically replaced by a higher generation on the next acquisition.
-- Do not run a TTL garbage collector against this table.
